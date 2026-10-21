// Registro e inicio de sesión
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db');

// POST /api/auth/registro
const registro = async (req, res) => {
  try {
    const nombre = req.body.nombre.trim();
    const email = req.body.email.trim().toLowerCase();
    const { password } = req.body;

    // ¿Ya existe una cuenta con ese email? → 409
    const existe = await pool.query('SELECT id FROM usuarios WHERE email = $1', [email]);
    if (existe.rowCount > 0) {
      return res.status(409).json({ error: 'El correo ya está registrado' });
    }

    // Guardamos solo el hash de la contraseña, nunca el texto original
    const hash = await bcrypt.hash(password, 10);

    const { rows } = await pool.query(
      'INSERT INTO usuarios (nombre, email, password) VALUES ($1, $2, $3) RETURNING id, nombre, email',
      [nombre, email, hash]
    );

    res.status(201).json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Error del servidor' });
  }
};

// POST /api/auth/login
const login = async (req, res) => {
  try {
    const email = req.body.email.trim().toLowerCase();
    const { password } = req.body;

    const { rows } = await pool.query(
      'SELECT id, nombre, email, password, avatar_url FROM usuarios WHERE email = $1',
      [email]
    );
    const usuario = rows[0];

    // Mismo mensaje si no existe el email o si la contraseña no coincide,
    // así no revelamos qué correos están registrados
    const passwordCorrecta = usuario && (await bcrypt.compare(password, usuario.password));
    if (!passwordCorrecta) {
      return res.status(401).json({ error: 'Email o contraseña incorrectos' });
    }

    // El token guarda id y email, y dura 2 horas
    const token = jwt.sign({ id: usuario.id, email: usuario.email }, process.env.JWT_SECRET, {
      expiresIn: '2h',
    });

    res.json({
      token,
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        email: usuario.email,
        avatar_url: usuario.avatar_url,
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Error del servidor' });
  }
};

module.exports = { registro, login };
