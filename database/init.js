// Crea las tablas y carga los datos de prueba (npm run db:init)
// Usa el mismo pool de la API, así no hace falta abrir psql.
const fs = require('fs');
const path = require('path');
const pool = require('../src/db');

const ejecutarArchivo = async (nombreArchivo) => {
  // Leemos el archivo .sql como texto y lo enviamos completo a PostgreSQL
  const sql = fs.readFileSync(path.join(__dirname, nombreArchivo), 'utf8');
  await pool.query(sql);
  console.log(`✔ ${nombreArchivo} ejecutado`);
};

const iniciar = async () => {
  try {
    await ejecutarArchivo('script.sql'); // 1° las tablas y los géneros
    await ejecutarArchivo('seed.sql'); // 2° los datos de prueba
    console.log('Base de datos lista');
  } catch (error) {
    console.error('Error al iniciar la base de datos:', error.message);
    process.exitCode = 1;
  } finally {
    await pool.end(); // cerramos la conexión para que el script termine
  }
};

iniciar();
