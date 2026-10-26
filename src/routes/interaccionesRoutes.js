// Rutas de lecturas, reacciones, comentarios, favoritos, donaciones y notificaciones → se montan en /api
const express = require('express');
const verificarToken = require('../middlewares/verificarToken');
const {
  guardarLectura,
  reaccionar,
  quitarReaccion,
  listarComentarios,
  comentar,
  listarFavoritos,
  agregarFavorito,
  quitarFavorito,
  donar,
  listarNotificaciones,
} = require('../controllers/interaccionesController');

const router = express.Router();

// Lecturas (en qué capítulo va el lector)
router.put('/lecturas', verificarToken, guardarLectura);

// Reacciones a capítulos
router.post('/capitulos/:id/reacciones', verificarToken, reaccionar);
router.delete('/capitulos/:id/reacciones', verificarToken, quitarReaccion);

// Comentarios (ver es público, comentar es privado)
router.get('/historias/:id/comentarios', listarComentarios);
router.post('/historias/:id/comentarios', verificarToken, comentar);

// Favoritos
router.get('/favoritos', verificarToken, listarFavoritos);
router.post('/favoritos', verificarToken, agregarFavorito);
router.delete('/favoritos/:historia_id', verificarToken, quitarFavorito);

// Donaciones (modo prueba)
router.post('/donaciones', verificarToken, donar);

// Notificaciones
router.get('/notificaciones', verificarToken, listarNotificaciones);

module.exports = router;
