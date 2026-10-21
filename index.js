// Punto de entrada: levanta el servidor
require('dotenv').config({ quiet: true });
const app = require('./src/app');

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor de Letra Viva en http://localhost:${PORT}`);
});
