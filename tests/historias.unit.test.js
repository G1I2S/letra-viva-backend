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
});
