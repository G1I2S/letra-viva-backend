// Middleware que protege las rutas privadas.
// Espera el header: Authorization: Bearer <token>
const jwt = require('jsonwebtoken');

const verificarToken = (req, res, next) => {
  const authorization = req.headers.authorization;

  // Sin header o sin el formato "Bearer <token>" → 401
  if (!authorization || !authorization.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Debes iniciar sesión' });
  }

  const token = authorization.split(' ')[1];

  try {
    // jwt.verify revisa la firma y que no haya expirado; si falla, lanza un error
    const datos = jwt.verify(token, process.env.JWT_SECRET);
    req.usuario = { id: datos.id, email: datos.email }; // disponible en el controller
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Debes iniciar sesión' });
  }
};

module.exports = verificarToken;
