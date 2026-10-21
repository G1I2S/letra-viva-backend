// Conexión a PostgreSQL con un Pool de pg
require('dotenv').config({ quiet: true });
const { Pool } = require('pg');

// Los datos de conexión vienen del archivo .env (nunca escritos aquí)
const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  port: process.env.DB_PORT,
  allowExitOnIdle: true, // deja que el proceso termine cuando no hay consultas pendientes
});

module.exports = pool;
