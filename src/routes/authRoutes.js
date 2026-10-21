// Rutas de autenticación → se montan en /api/auth
const express = require('express');
const { registro, login } = require('../controllers/authController');
const { validarRegistro, validarLogin } = require('../middlewares/validarCredenciales');

const router = express.Router();

// Primero el middleware valida los datos; si están bien, pasa al controller
router.post('/registro', validarRegistro, registro);
router.post('/login', validarLogin, login);

module.exports = router;
