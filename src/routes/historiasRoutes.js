// Rutas de historias, capítulos y géneros → se montan en /api
// LO COMPLETA JORGE. Rutas del contrato que le tocan:
//   GET    /generos
//   GET    /historias                         (filtros: tipo, generos, buscar, orden, dias, pagina, limite)
//   GET    /historias/:id                     (si viene token, agrega es_favorito y capitulo_actual)
//   POST   /historias                      🔒
//   PUT    /historias/:id                  🔒 solo el autor (403 si no)
//   DELETE /historias/:id                  🔒 solo el autor (403 si no)
//   GET    /historias/:id/capitulos/:numero   (si viene token, agrega mi_reaccion)
//   POST   /historias/:id/capitulos        🔒 solo el autor
// Para las rutas privadas: const verificarToken = require('../middlewares/verificarToken');
// Los controllers van en src/controllers/historiasController.js
const express = require('express');

const router = express.Router();

module.exports = router;
