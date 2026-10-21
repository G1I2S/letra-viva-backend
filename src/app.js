// Configuración de la aplicación Express (sin app.listen, para poder testearla)
const express = require('express');
const cors = require('cors');
const pool = require('./db');

const authRoutes = require('./routes/authRoutes');
const usuariosRoutes = require('./routes/usuariosRoutes');
const historiasRoutes = require('./routes/historiasRoutes');
const interaccionesRoutes = require('./routes/interaccionesRoutes');

const app = express();

// Middlewares globales
app.use(cors()); // permite que el frontend (otro dominio) llame a la API
app.use(express.json()); // convierte el body JSON en req.body

// Ruta para comprobar que la API y la base de datos responden
app.get('/api/estado', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT NOW() AS hora');
    res.json({
      mensaje: 'API de Letra Viva funcionando',
      base_de_datos: 'conectada',
      hora: rows[0].hora,
    });
  } catch (error) {
    res.status(500).json({ error: 'No se pudo conectar a la base de datos' });
  }
});

// Rutas de cada parte del equipo
app.use('/api/auth', authRoutes); // Gisela
app.use('/api/usuarios', usuariosRoutes); // Gisela
app.use('/api', historiasRoutes); // Jorge
app.use('/api', interaccionesRoutes); // Sofía

// Si ninguna ruta coincide, respondemos 404
app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

// Manejador de errores: por ejemplo, si el body no es un JSON válido
app.use((error, req, res, next) => {
  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'El cuerpo de la petición no es un JSON válido' });
  }
  res.status(500).json({ error: 'Error del servidor' });
});

module.exports = app;
