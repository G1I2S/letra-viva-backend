// Rutas del perfil → se montan en /api/usuarios
const express = require('express');
const { verPerfil, actualizarPerfil } = require('../controllers/usuariosController');
const verificarToken = require('../middlewares/verificarToken');

const router = express.Router();

// Las dos son privadas: verificarToken va antes del controller
router.get('/me', verificarToken, verPerfil);
router.put('/me', verificarToken, actualizarPerfil);

module.exports = router;
