// Pruebas de contrato para las rutas asignadas a Jorge.
const request = require('supertest');
const app = require('../src/app');

describe('Rutas de historias, capítulos y géneros', () => {
  describe('Rutas privadas', () => {
    it('rechaza crear historias sin token', async () => {
      const res = await request(app).post('/api/historias').send({ titulo: 'Prueba', tipo: 'novela' });
      expect(res.statusCode).toBe(401);
      expect(res.body).toEqual({ error: 'Debes iniciar sesión' });
    });

    it('rechaza editar historias sin token', async () => {
      const res = await request(app).put('/api/historias/1').send({ titulo: 'Nuevo título' });
      expect(res.statusCode).toBe(401);
      expect(res.body).toHaveProperty('error');
    });

    it('rechaza eliminar historias sin token', async () => {
      const res = await request(app).delete('/api/historias/1');
      expect(res.statusCode).toBe(401);
      expect(res.body).toHaveProperty('error');
    });

    it('rechaza agregar capítulos sin token', async () => {
      const res = await request(app).post('/api/historias/1/capitulos').send({ titulo: 'Capítulo', contenido: 'Texto' });
      expect(res.statusCode).toBe(401);
      expect(res.body).toHaveProperty('error');
    });
  });

  describe('Validación de parámetros y body', () => {
    it('rechaza un ID de historia inválido al consultar detalle', async () => {
      const res = await request(app).get('/api/historias/no-es-un-id');
      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    it('rechaza un ID o número de capítulo inválido', async () => {
      const res = await request(app).get('/api/historias/1/capitulos/cero');
      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    it('rechaza un tipo de historia no permitido en filtros', async () => {
      const res = await request(app).get('/api/historias?tipo=poesia');
      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    it('rechaza crear una historia sin título válido cuando hay token', async () => {
      // Token firmado de prueba; no se consulta la base de datos porque la validación ocurre primero.
      const jwt = require('jsonwebtoken');
      const previousSecret = process.env.JWT_SECRET;
      process.env.JWT_SECRET = 'secret-test-historias';
      const token = jwt.sign({ id: 7, email: 'luna@letraviva.cl' }, process.env.JWT_SECRET);
      const res = await request(app)
        .post('/api/historias')
        .set('Authorization', `Bearer ${token}`)
        .send({ titulo: '   ', tipo: 'novela' });
      if (previousSecret === undefined) delete process.env.JWT_SECRET;
      else process.env.JWT_SECRET = previousSecret;
      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('error');
    });
  });
});
