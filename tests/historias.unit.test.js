// Pruebas aisladas de las rutas de Jorge. No requieren una base PostgreSQL real.
const request = require('supertest');
jest.mock('../src/db', () => ({ query: jest.fn(), connect: jest.fn() }));
const pool = require('../src/db');
const jwt = require('jsonwebtoken');
const app = require('../src/app');

const crearToken = (id = 7, email = 'luna@letraviva.cl') =>
  jwt.sign({ id, email }, process.env.JWT_SECRET);

const crearCliente = (queryImplementation) => ({
  query: jest.fn(queryImplementation),
  release: jest.fn(),
});

beforeEach(() => {
  process.env.JWT_SECRET = 'clave-de-prueba-para-jest';
  jest.clearAllMocks();
});

afterAll(() => {
  delete process.env.JWT_SECRET;
});

describe('Controladores de historias con base de datos simulada', () => {
  it('lista géneros consultando la tabla generos', async () => {
    pool.query.mockResolvedValue({ rows: [{ id: 1, nombre: 'Romance' }] });

    const res = await request(app).get('/api/generos');

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual([{ id: 1, nombre: 'Romance' }]);
    expect(pool.query).toHaveBeenCalledWith(
      'SELECT id, nombre FROM generos ORDER BY id ASC'
    );
  });

  it('asigna como autor de una historia al usuario del token', async () => {
    const client = crearCliente(async (sql, values) => {
      if (sql === 'BEGIN' || sql === 'COMMIT') return { rows: [], rowCount: 0 };
      if (sql.includes('INSERT INTO historias')) {
        return {
          rows: [{ id: 51, autor_id: values[0], titulo: values[1], resumen: values[2], portada_url: values[3], tipo: values[4] }],
          rowCount: 1,
        };
      }
      throw new Error(`Consulta inesperada: ${sql}`);
    });
    pool.connect.mockResolvedValue(client);

    const res = await request(app)
      .post('/api/historias')
      .set('Authorization', `Bearer ${crearToken(7)}`)
      .send({ titulo: 'Historia de prueba', tipo: 'novela' });

    expect(res.statusCode).toBe(201);
    expect(client.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO historias'),
      [7, 'Historia de prueba', null, null, 'novela']
    );
    expect(res.body.autor_id).toBe(7);
    expect(client.release).toHaveBeenCalled();
  });

  it('impide que un usuario edite la historia de otro autor', async () => {
    const client = crearCliente(async (sql) => {
      if (sql === 'BEGIN' || sql === 'ROLLBACK') return { rows: [], rowCount: 0 };
      if (sql.includes('SELECT id, autor_id FROM historias')) {
        return { rows: [{ id: 1, autor_id: 7 }], rowCount: 1 };
      }
      throw new Error(`Consulta inesperada: ${sql}`);
    });
    pool.connect.mockResolvedValue(client);

    const res = await request(app)
      .put('/api/historias/1')
      .set('Authorization', `Bearer ${crearToken(8, 'otro@letraviva.cl')}`)
      .send({ titulo: 'Intento no autorizado' });

    expect(res.statusCode).toBe(403);
    expect(res.body).toEqual({ error: 'Solo el autor puede modificar esta historia' });
    expect(client.query).toHaveBeenCalledWith('ROLLBACK');
    expect(client.release).toHaveBeenCalled();
  });

  it('impide que un usuario agregue capítulos a la historia de otro autor', async () => {
    const client = crearCliente(async (sql) => {
      if (sql === 'BEGIN' || sql === 'ROLLBACK') return { rows: [], rowCount: 0 };
      if (sql.includes('SELECT id, autor_id, tipo FROM historias')) {
        return { rows: [{ id: 1, autor_id: 7, tipo: 'novela' }], rowCount: 1 };
      }
      throw new Error(`Consulta inesperada: ${sql}`);
    });
    pool.connect.mockResolvedValue(client);

    const res = await request(app)
      .post('/api/historias/1/capitulos')
      .set('Authorization', `Bearer ${crearToken(8, 'otro@letraviva.cl')}`)
      .send({ titulo: 'Capítulo ajeno', contenido: 'Texto de prueba' });

    expect(res.statusCode).toBe(403);
    expect(res.body).toEqual({ error: 'Solo el autor puede agregar capítulos' });
    expect(client.query).toHaveBeenCalledWith('ROLLBACK');
    expect(client.release).toHaveBeenCalled();
  });

  it('devuelve la lista con la forma del contrato y acepta orden populares', async () => {
    pool.query.mockImplementation(async (sql) => {
      if (sql.includes('COUNT(DISTINCT h.id)')) return { rows: [{ total: 1 }] };
      return { rows: [{
        id: 3, titulo: 'La última señal', resumen: 'Resumen', portada_url: null, tipo: 'novela',
        autor_id: 7, autor_nombre: 'Luna Díaz', generos: ['Fantasía', 'Misterio'],
        total_reacciones: 91, total_comentarios: 25,
        ultimo_capitulo: { numero: 3, fecha_publicacion: '2026-10-07T10:00:00.000Z' },
      }] };
    });

    const res = await request(app).get('/api/historias?orden=populares&pagina=1&limite=10');

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      pagina: 1,
      total: 1,
      historias: [{
        id: 3, titulo: 'La última señal', resumen: 'Resumen', portada_url: null, tipo: 'novela',
        autor: { id: 7, nombre: 'Luna Díaz' }, generos: ['Fantasía', 'Misterio'],
        total_reacciones: 91, total_comentarios: 25,
        ultimo_capitulo: { numero: 3, fecha_publicacion: '2026-10-07T10:00:00.000Z' },
      }],
    });
    expect(pool.query.mock.calls[1][0]).toContain('h.total_reacciones DESC');
    expect(res.body).not.toHaveProperty('paginacion');
  });

  it('devuelve el detalle con totales agrupados y sin datos personales cuando no hay sesión', async () => {
    pool.query.mockResolvedValue({ rows: [{
      id: 3, titulo: 'La última señal', resumen: 'Resumen', portada_url: null, tipo: 'novela',
      autor_id: 7, autor_nombre: 'Luna Díaz', autor_avatar: 'https://ejemplo.cl/luna.jpg',
      total_reacciones: 91, total_comentarios: 25, total_favoritos: 40, total_lecturas: 310,
      generos: ['Fantasía', 'Misterio'], capitulos: [{ id: 10, numero: 1, titulo: 'La señal', fecha_publicacion: '2026-08-12T10:00:00.000Z' }],
    }] });

    const res = await request(app).get('/api/historias/3');

    expect(res.statusCode).toBe(200);
    expect(res.body.autor).toEqual({ id: 7, nombre: 'Luna Díaz', avatar_url: 'https://ejemplo.cl/luna.jpg' });
    expect(res.body.generos).toEqual(['Fantasía', 'Misterio']);
    expect(res.body.totales).toEqual({ reacciones: 91, comentarios: 25, favoritos: 40, lecturas: 310 });
    expect(res.body).not.toHaveProperty('es_favorito');
    expect(res.body).not.toHaveProperty('capitulo_actual');
  });

  it('devuelve los datos de navegación y contadores del lector de capítulo', async () => {
    pool.query.mockResolvedValue({ rows: [{
      id: 10, numero: 1, titulo: 'La señal', contenido: 'Texto', historia_id: 3,
      historia_titulo: 'La última señal', autor_id: 7, autor_nombre: 'Luna Díaz',
      total_capitulos: 3, anterior: null, siguiente: 2,
      reacciones: { llorar: 2, sorpresa: 0, risa: 1, fuego: 5, corazon_roto: 0 },
    }] });

    const res = await request(app).get('/api/historias/3/capitulos/1');

    expect(res.statusCode).toBe(200);
    expect(res.body.historia).toEqual({ id: 3, titulo: 'La última señal', autor: { id: 7, nombre: 'Luna Díaz' } });
    expect(res.body.total_capitulos).toBe(3);
    expect(res.body.anterior).toBeNull();
    expect(res.body.siguiente).toBe(2);
    expect(res.body.reacciones).toEqual({ llorar: 2, sorpresa: 0, risa: 1, fuego: 5, corazon_roto: 0 });
    expect(res.body).not.toHaveProperty('mi_reaccion');
  });

  it('asigna automáticamente el siguiente número al crear un capítulo', async () => {
    const client = crearCliente(async (sql, values) => {
      if (sql === 'BEGIN' || sql === 'COMMIT') return { rows: [], rowCount: 0 };
      if (sql.includes('SELECT id, autor_id, tipo FROM historias')) return { rows: [{ id: 3, autor_id: 7, tipo: 'novela' }], rowCount: 1 };
      if (sql.includes('SELECT COALESCE(MAX(numero)')) return { rows: [{ ultimo: 2 }], rowCount: 1 };
      if (sql.includes('INSERT INTO capitulos')) return { rows: [{ id: 12, historia_id: values[0], numero: values[1], titulo: values[2], contenido: values[3] }], rowCount: 1 };
      if (sql.includes('UPDATE historias SET fecha_actualizacion')) return { rows: [], rowCount: 1 };
      throw new Error(`Consulta inesperada: ${sql}`);
    });
    pool.connect.mockResolvedValue(client);

    const res = await request(app)
      .post('/api/historias/3/capitulos')
      .set('Authorization', `Bearer ${crearToken(7)}`)
      .send({ titulo: 'Capítulo nuevo', contenido: 'Texto nuevo', numero: 99 });

    expect(res.statusCode).toBe(201);
    expect(res.body.numero).toBe(3);
    expect(client.query).toHaveBeenCalledWith(
      'INSERT INTO capitulos (historia_id, numero, titulo, contenido) VALUES ($1, $2, $3, $4) RETURNING *',
      [3, 3, 'Capítulo nuevo', 'Texto nuevo']
    );
    expect(client.release).toHaveBeenCalled();
  });

});
