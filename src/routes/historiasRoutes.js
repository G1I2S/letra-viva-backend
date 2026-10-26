// Rutas de historias, capítulos y géneros → se montan en /api
const express = require('express');
const verificarToken = require('../middlewares/verificarToken');
const controller = require('../controllers/historiasController');

const router = express.Router();

router.get('/generos', controller.listarGeneros);
router.get('/historias', controller.listarHistorias);
router.get('/historias/:id/capitulos/:numero', controller.obtenerCapitulo);
router.get('/historias/:id', controller.obtenerHistoria);
router.post('/historias', verificarToken, controller.crearHistoria);
router.put('/historias/:id', verificarToken, controller.actualizarHistoria);
router.delete('/historias/:id', verificarToken, controller.eliminarHistoria);
router.post('/historias/:id/capitulos', verificarToken, controller.crearCapitulo);

module.exports = router;

