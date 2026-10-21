// Tests de las rutas de Gisela: estado, autenticación y perfil
const request = require('supertest');
const app = require('../src/app');
const pool = require('../src/db');

// Email distinto en cada ejecución para que el registro no choque con uno anterior
const usuarioPrueba = {
  nombre: 'Usuario de Prueba',
  email: `test_${Date.now()}@letraviva.cl`,
  password: 'clave123',
};

let token; // se guarda en el test de login y se usa en los de perfil

// Al terminar: borramos el usuario de prueba y cerramos la conexión
afterAll(async () => {
  await pool.query('DELETE FROM usuarios WHERE email = $1', [usuarioPrueba.email]);
  await pool.end();
});

describe('GET /api/estado', () => {
  it('responde 200 y confirma la conexión a la base de datos', async () => {
    const res = await request(app).get('/api/estado');
    expect(res.statusCode).toBe(200);
    expect(res.body.base_de_datos).toBe('conectada');
  });
});

describe('POST /api/auth/registro', () => {
  it('responde 201 y devuelve el usuario sin la contraseña', async () => {
    const res = await request(app).post('/api/auth/registro').send(usuarioPrueba);
    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.email).toBe(usuarioPrueba.email);
    expect(res.body).not.toHaveProperty('password');
  });

  it('responde 409 si el email ya está registrado', async () => {
    const res = await request(app).post('/api/auth/registro').send(usuarioPrueba);
    expect(res.statusCode).toBe(409);
    expect(res.body).toHaveProperty('error');
  });

  it('responde 400 si faltan datos', async () => {
    const res = await request(app).post('/api/auth/registro').send({});
    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty('error');
  });
});

describe('POST /api/auth/login', () => {
  it('responde 200 y entrega un token con credenciales correctas', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: usuarioPrueba.email, password: usuarioPrueba.password });
    expect(res.statusCode).toBe(200);
    expect(typeof res.body.token).toBe('string');
    expect(res.body.usuario).not.toHaveProperty('password');
    token = res.body.token;
  });

  it('responde 401 si la contraseña es incorrecta', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: usuarioPrueba.email, password: 'otraClave' });
    expect(res.statusCode).toBe(401);
  });

  it('responde 400 si falta la contraseña', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: usuarioPrueba.email });
    expect(res.statusCode).toBe(400);
  });
});

describe('GET /api/usuarios/me', () => {
  it('responde 401 si no se envía token', async () => {
    const res = await request(app).get('/api/usuarios/me');
    expect(res.statusCode).toBe(401);
    expect(res.body.error).toBe('Debes iniciar sesión');
  });

  it('responde 401 si el token es inválido', async () => {
    const res = await request(app)
      .get('/api/usuarios/me')
      .set('Authorization', 'Bearer token-falso');
    expect(res.statusCode).toBe(401);
  });

  it('responde 200 con el perfil si el token es válido', async () => {
    const res = await request(app)
      .get('/api/usuarios/me')
      .set('Authorization', `Bearer ${token}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.email).toBe(usuarioPrueba.email);
    expect(Array.isArray(res.body.historias)).toBe(true);
  });
});

describe('PUT /api/usuarios/me', () => {
  it('responde 200 con el usuario actualizado', async () => {
    const res = await request(app)
      .put('/api/usuarios/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ nombre: 'Nombre Cambiado' });
    expect(res.statusCode).toBe(200);
    expect(res.body.nombre).toBe('Nombre Cambiado');
  });
});

describe('Ruta inexistente', () => {
  it('responde 404', async () => {
    const res = await request(app).get('/api/no-existe');
    expect(res.statusCode).toBe(404);
    expect(res.body.error).toBe('Ruta no encontrada');
  });
});
