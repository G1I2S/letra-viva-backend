// Rutas de interacciones → se montan en /api
// LO COMPLETA SOFÍA. Rutas del contrato que le tocan:
//   PUT    /lecturas                      🔒
//   POST   /capitulos/:id/reacciones      🔒 (si ya reaccionó, reemplaza la emoción)
//   DELETE /capitulos/:id/reacciones      🔒
//   GET    /historias/:id/comentarios
//   POST   /historias/:id/comentarios     🔒
//   GET    /favoritos                     🔒
//   POST   /favoritos                     🔒
//   DELETE /favoritos/:historia_id        🔒
//   POST   /donaciones                    🔒 (donante_id sale del token; no puede donarse a sí mismo)
//   GET    /notificaciones                🔒
// Para las rutas privadas: const verificarToken = require('../middlewares/verificarToken');
// Los controllers van en src/controllers/interaccionesController.js
const express = require('express');

const router = express.Router();

module.exports = router;
