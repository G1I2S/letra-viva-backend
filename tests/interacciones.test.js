// Tests de las interacciones: lecturas, reacciones, comentarios, favoritos, donaciones y notificaciones
// Usan la base de datos real con los datos de database/seed.sql:
//   - Luna (id 7) es la autora de la historia 1 "La última señal" (capítulos 10 y 11).
//   - Valentina (id 1) es lectora. Ya tiene la historia 1 en favoritos y va en el capítulo 11.
//   - La historia 2 (capítulo 20) es de Tomás (id 8) y ni Luna ni Valentina tienen nada en ella.
const request = require('supertest');
const app = require('../src/app');
const pool = require('../src/db');

let tokenLuna;
let tokenValentina;

// Lo que se crea y no tiene ruta de borrado: se limpia en afterAll
let comentarioId;
let donacionId;
let lecturaCreada = false;

// Contadores de una historia, para comprobar que suben y bajan bien
const contadores = async (historiaId) => {
  const { rows } = await pool.query(
    'SELECT total_reacciones, total_comentarios, total_favoritos, total_lecturas FROM historias WHERE id = $1',
    [historiaId]
  );
  return rows[0];
};

const iniciarSesion = async (email) => {
  const res = await request(app).post('/api/auth/login').send({ email, password: 'letraviva123' });
  return res.body.token;
};

beforeAll(async () => {
  tokenLuna = await iniciarSesion('luna@letraviva.cl');
  tokenValentina = await iniciarSesion('valentina@letraviva.cl');
});

// Al terminar: borramos con SQL lo que no tiene ruta de borrado y corregimos los contadores
afterAll(async () => {
  if (comentarioId) {
    await pool.query('DELETE FROM comentarios WHERE id = $1', [comentarioId]);
    await pool.query('UPDATE historias SET total_comentarios = total_comentarios - 1 WHERE id = 1');
  }
  if (donacionId) {
    await pool.query('DELETE FROM donaciones WHERE id = $1', [donacionId]);
  }
  if (lecturaCreada) {
    await pool.query('DELETE FROM lecturas WHERE usuario_id = 1 AND historia_id = 2');
    await pool.query('UPDATE historias SET total_lecturas = total_lecturas - 1 WHERE id = 2');
  }
  await pool.end();
});

describe('PUT /api/lecturas', () => {
  it('responde 401 sin token', async () => {
    const res = await request(app).put('/api/lecturas').send({ historia_id: 2, capitulo_id: 20 });
    expect(res.statusCode).toBe(401);
  });

  it('responde 400 si faltan datos', async () => {
    const res = await request(app)
      .put('/api/lecturas')
      .set('Authorization', `Bearer ${tokenValentina}`)
      .send({ historia_id: 2 });
    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('responde 404 si el capítulo no es de esa historia', async () => {
    const res = await request(app)
      .put('/api/lecturas')
      .set('Authorization', `Bearer ${tokenValentina}`)
      .send({ historia_id: 1, capitulo_id: 20 });
    expect(res.statusCode).toBe(404);
  });

  it('responde 200 y suma 1 a total_lecturas solo la primera vez', async () => {
    const antes = await contadores(2);

    const res = await request(app)
      .put('/api/lecturas')
      .set('Authorization', `Bearer ${tokenValentina}`)
      .send({ historia_id: 2, capitulo_id: 20 });
    lecturaCreada = res.statusCode === 200;
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ historia_id: 2, capitulo_id: 20, numero: 1 });

    // La segunda vez solo actualiza: el contador no vuelve a subir
    const otraVez = await request(app)
      .put('/api/lecturas')
      .set('Authorization', `Bearer ${tokenValentina}`)
      .send({ historia_id: 2, capitulo_id: 20 });
    expect(otraVez.statusCode).toBe(200);

    const despues = await contadores(2);
    expect(despues.total_lecturas).toBe(antes.total_lecturas + 1);
  });
});

describe('POST y DELETE /api/capitulos/:id/reacciones', () => {
  it('responde 401 sin token', async () => {
    const res = await request(app).post('/api/capitulos/20/reacciones').send({ tipo: 'fuego' });
    expect(res.statusCode).toBe(401);
  });

  it('responde 400 si el tipo no es válido', async () => {
    const res = await request(app)
      .post('/api/capitulos/20/reacciones')
      .set('Authorization', `Bearer ${tokenValentina}`)
      .send({ tipo: 'enojo' });
    expect(res.statusCode).toBe(400);
  });

  it('responde 400 si el id del capítulo no es válido', async () => {
    const res = await request(app)
      .post('/api/capitulos/abc/reacciones')
      .set('Authorization', `Bearer ${tokenValentina}`)
      .send({ tipo: 'fuego' });
    expect(res.statusCode).toBe(400);
  });

  it('responde 404 si el capítulo no existe', async () => {
    const res = await request(app)
      .post('/api/capitulos/99999/reacciones')
      .set('Authorization', `Bearer ${tokenValentina}`)
      .send({ tipo: 'fuego' });
    expect(res.statusCode).toBe(404);
  });

  it('responde 201 con el conteo, reemplaza la emoción y la quita con 204', async () => {
    const antes = await contadores(2);

    const res = await request(app)
      .post('/api/capitulos/20/reacciones')
      .set('Authorization', `Bearer ${tokenValentina}`)
      .send({ tipo: 'fuego' });
    expect(res.statusCode).toBe(201);
    expect(res.body).toEqual({
      capitulo_id: 20,
      tipo: 'fuego',
      reacciones: { llorar: 0, sorpresa: 0, risa: 0, fuego: 1, corazon_roto: 0 },
    });
    expect((await contadores(2)).total_reacciones).toBe(antes.total_reacciones + 1);

    // Reaccionar otra vez reemplaza la emoción y no suma al contador
    const cambio = await request(app)
      .post('/api/capitulos/20/reacciones')
      .set('Authorization', `Bearer ${tokenValentina}`)
      .send({ tipo: 'risa' });
    expect(cambio.statusCode).toBe(201);
    expect(cambio.body.reacciones).toEqual({ llorar: 0, sorpresa: 0, risa: 1, fuego: 0, corazon_roto: 0 });
    expect((await contadores(2)).total_reacciones).toBe(antes.total_reacciones + 1);

    // Quitar la reacción deja el contador como estaba
    const borrar = await request(app)
      .delete('/api/capitulos/20/reacciones')
      .set('Authorization', `Bearer ${tokenValentina}`);
    expect(borrar.statusCode).toBe(204);
    expect((await contadores(2)).total_reacciones).toBe(antes.total_reacciones);
  });

  it('DELETE responde 404 si no había reaccionado', async () => {
    const res = await request(app)
      .delete('/api/capitulos/20/reacciones')
      .set('Authorization', `Bearer ${tokenValentina}`);
    expect(res.statusCode).toBe(404);
  });

  it('DELETE responde 401 sin token', async () => {
    const res = await request(app).delete('/api/capitulos/20/reacciones');
    expect(res.statusCode).toBe(401);
  });
});

describe('GET /api/historias/:id/comentarios', () => {
  it('responde 200 con los comentarios del más nuevo al más antiguo', async () => {
    const res = await request(app).get('/api/historias/1/comentarios');
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);

    const comentario = res.body[0];
    expect(comentario).toHaveProperty('id');
    expect(comentario).toHaveProperty('contenido');
    expect(comentario).toHaveProperty('fecha');
    expect(Object.keys(comentario.usuario).sort()).toEqual(['avatar_url', 'id', 'nombre']);

    const fechas = res.body.map((c) => new Date(c.fecha).getTime());
    expect(fechas).toEqual([...fechas].sort((a, b) => b - a));
  });

  it('responde 404 si la historia no existe', async () => {
    const res = await request(app).get('/api/historias/99999/comentarios');
    expect(res.statusCode).toBe(404);
    expect(res.body.error).toBe('Historia no encontrada');
  });
});

describe('POST /api/historias/:id/comentarios', () => {
  it('responde 401 sin token', async () => {
    const res = await request(app).post('/api/historias/1/comentarios').send({ contenido: 'Hola' });
    expect(res.statusCode).toBe(401);
  });

  it('responde 400 si el comentario está vacío', async () => {
    const res = await request(app)
      .post('/api/historias/1/comentarios')
      .set('Authorization', `Bearer ${tokenValentina}`)
      .send({ contenido: '   ' });
    expect(res.statusCode).toBe(400);
  });

  it('responde 404 si la historia no existe', async () => {
    const res = await request(app)
      .post('/api/historias/99999/comentarios')
      .set('Authorization', `Bearer ${tokenValentina}`)
      .send({ contenido: 'Hola' });
    expect(res.statusCode).toBe(404);
  });

  it('responde 201 con el comentario y suma 1 a total_comentarios', async () => {
    const antes = await contadores(1);

    const res = await request(app)
      .post('/api/historias/1/comentarios')
      .set('Authorization', `Bearer ${tokenValentina}`)
      .send({ contenido: '  Comentario de prueba  ' });
    comentarioId = res.body.id;
    expect(res.statusCode).toBe(201);
    expect(res.body.contenido).toBe('Comentario de prueba');
    expect(res.body.usuario).toEqual({ id: 1, nombre: 'Valentina Rojas', avatar_url: null });
    expect(res.body).toHaveProperty('fecha');

    expect((await contadores(1)).total_comentarios).toBe(antes.total_comentarios + 1);

    // Aparece primero en el GET
    const lista = await request(app).get('/api/historias/1/comentarios');
    expect(lista.body[0].id).toBe(comentarioId);
  });
});

describe('Favoritos', () => {
  it('GET responde 401 sin token', async () => {
    const res = await request(app).get('/api/favoritos');
    expect(res.statusCode).toBe(401);
  });

  it('GET responde 200 con la historia y el capítulo en que va', async () => {
    const res = await request(app)
      .get('/api/favoritos')
      .set('Authorization', `Bearer ${tokenValentina}`);
    expect(res.statusCode).toBe(200);

    const laUltimaSenal = res.body.find((f) => f.historia.id === 1);
    expect(laUltimaSenal).toEqual({
      historia: { id: 1, titulo: 'La última señal', portada_url: 'https://picsum.photos/seed/senal/800/400' },
      capitulo_actual: { numero: 2, titulo: 'La voz' },
      total_capitulos: 2,
    });
  });

  it('POST responde 400 si historia_id no es válido', async () => {
    const res = await request(app)
      .post('/api/favoritos')
      .set('Authorization', `Bearer ${tokenLuna}`)
      .send({ historia_id: 'abc' });
    expect(res.statusCode).toBe(400);
  });

  it('POST responde 404 si la historia no existe', async () => {
    const res = await request(app)
      .post('/api/favoritos')
      .set('Authorization', `Bearer ${tokenLuna}`)
      .send({ historia_id: 99999 });
    expect(res.statusCode).toBe(404);
  });

  it('POST 201, repetido 409, GET con capitulo_actual null y DELETE 204', async () => {
    const antes = await contadores(2);

    const res = await request(app)
      .post('/api/favoritos')
      .set('Authorization', `Bearer ${tokenLuna}`)
      .send({ historia_id: 2 });
    expect(res.statusCode).toBe(201);
    expect(res.body.historia_id).toBe(2);
    expect(res.body).toHaveProperty('fecha');
    expect((await contadores(2)).total_favoritos).toBe(antes.total_favoritos + 1);

    const repetido = await request(app)
      .post('/api/favoritos')
      .set('Authorization', `Bearer ${tokenLuna}`)
      .send({ historia_id: 2 });
    expect(repetido.statusCode).toBe(409);
    expect(repetido.body).toEqual({ error: 'La historia ya está en tus favoritos' });

    // Luna nunca leyó la historia 2: capitulo_actual es null
    const lista = await request(app)
      .get('/api/favoritos')
      .set('Authorization', `Bearer ${tokenLuna}`);
    const favorito = lista.body.find((f) => f.historia.id === 2);
    expect(favorito.capitulo_actual).toBeNull();
    expect(favorito.total_capitulos).toBe(1);

    const borrar = await request(app)
      .delete('/api/favoritos/2')
      .set('Authorization', `Bearer ${tokenLuna}`);
    expect(borrar.statusCode).toBe(204);
    expect((await contadores(2)).total_favoritos).toBe(antes.total_favoritos);
  });

  it('DELETE responde 404 si no estaba en sus favoritos', async () => {
    const res = await request(app)
      .delete('/api/favoritos/2')
      .set('Authorization', `Bearer ${tokenLuna}`);
    expect(res.statusCode).toBe(404);
  });

  it('DELETE responde 401 sin token', async () => {
    const res = await request(app).delete('/api/favoritos/2');
    expect(res.statusCode).toBe(401);
  });
});

describe('POST /api/donaciones', () => {
  it('responde 401 sin token', async () => {
    const res = await request(app).post('/api/donaciones').send({ escritor_id: 7, historia_id: 1, monto: 1000 });
    expect(res.statusCode).toBe(401);
  });

  it('responde 400 si el monto no es un entero mayor que 0', async () => {
    for (const monto of [0, -500, 10.5, 'mil', undefined]) {
      const res = await request(app)
        .post('/api/donaciones')
        .set('Authorization', `Bearer ${tokenValentina}`)
        .send({ escritor_id: 7, historia_id: 1, monto });
      expect(res.statusCode).toBe(400);
    }
  });

  it('responde 404 si la historia no existe', async () => {
    const res = await request(app)
      .post('/api/donaciones')
      .set('Authorization', `Bearer ${tokenValentina}`)
      .send({ escritor_id: 7, historia_id: 99999, monto: 1000 });
    expect(res.statusCode).toBe(404);
  });

  it('responde 400 si escritor_id no es el autor de la historia', async () => {
    const res = await request(app)
      .post('/api/donaciones')
      .set('Authorization', `Bearer ${tokenValentina}`)
      .send({ escritor_id: 8, historia_id: 1, monto: 1000 });
    expect(res.statusCode).toBe(400);
  });

  it('responde 400 si el usuario se dona a sí mismo', async () => {
    const res = await request(app)
      .post('/api/donaciones')
      .set('Authorization', `Bearer ${tokenLuna}`)
      .send({ escritor_id: 7, historia_id: 1, monto: 1000 });
    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ error: 'No puedes donarte a ti mismo' });
  });

  it('responde 201 con la donación en modo prueba (donante_id sale del token)', async () => {
    const res = await request(app)
      .post('/api/donaciones')
      .set('Authorization', `Bearer ${tokenValentina}`)
      .send({ donante_id: 99, escritor_id: 7, historia_id: 1, monto: 1500 });
    donacionId = res.body.id;
    expect(res.statusCode).toBe(201);
    expect(res.body).toEqual({
      id: donacionId,
      donante_id: 1,
      escritor_id: 7,
      historia_id: 1,
      monto: 1500,
      fecha: expect.any(String),
      modo: 'prueba',
    });
  });
});

describe('GET /api/notificaciones', () => {
  it('responde 401 sin token', async () => {
    const res = await request(app).get('/api/notificaciones');
    expect(res.statusCode).toBe(401);
  });

  it('responde 200 con lo que otros hicieron en las historias de Luna', async () => {
    const res = await request(app)
      .get('/api/notificaciones')
      .set('Authorization', `Bearer ${tokenLuna}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body.length).toBeLessThanOrEqual(50);

    res.body.forEach((n) => {
      expect(Object.keys(n).sort()).toEqual(['detalle', 'fecha', 'historia', 'tipo', 'usuario']);
      expect(['donacion', 'comentario', 'reaccion']).toContain(n.tipo);
      expect(n.usuario).not.toBe('Luna Díaz'); // no aparece lo que hizo ella misma
    });

    // De la más nueva a la más antigua
    const fechas = res.body.map((n) => new Date(n.fecha).getTime());
    expect(fechas).toEqual([...fechas].sort((a, b) => b - a));

    // La donación y el comentario de Valentina (hechos en estos tests) están, con el monto como número
    expect(res.body).toContainEqual(
      expect.objectContaining({ tipo: 'donacion', usuario: 'Valentina Rojas', historia: 'La última señal', detalle: 1500 })
    );
    expect(res.body).toContainEqual(
      expect.objectContaining({ tipo: 'comentario', usuario: 'Valentina Rojas', detalle: 'Comentario de prueba' })
    );
  });
});
