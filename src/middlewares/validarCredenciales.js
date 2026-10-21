// Middlewares que revisan los datos de registro y login antes de llegar al controller

// Formato básico de email: algo@algo.algo (sin espacios)
const EMAIL_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Revisa email y password (se usa en login y en registro)
const revisarEmailYPassword = (email, password) => {
  if (typeof email !== 'string' || !email.trim()) return 'El campo email es obligatorio';
  if (typeof password !== 'string' || !password) return 'El campo password es obligatorio';
  if (!EMAIL_VALIDO.test(email.trim())) return 'El email no tiene un formato válido';
  return null; // null = no hay error
};

// POST /api/auth/login → { email, password }
const validarLogin = (req, res, next) => {
  const { email, password } = req.body || {};
  const error = revisarEmailYPassword(email, password);
  if (error) return res.status(400).json({ error });
  next();
};

// POST /api/auth/registro → { nombre, email, password }
const validarRegistro = (req, res, next) => {
  const { nombre, email, password } = req.body || {};

  if (typeof nombre !== 'string' || !nombre.trim()) {
    return res.status(400).json({ error: 'El campo nombre es obligatorio' });
  }

  const error = revisarEmailYPassword(email, password);
  if (error) return res.status(400).json({ error });

  if (password.length < 6) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
  }

  next();
};

module.exports = { validarLogin, validarRegistro };
