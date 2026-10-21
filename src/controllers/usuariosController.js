// Perfil del usuario que inició sesión (req.usuario viene de verificarToken)
const pool = require('../db');

// Busca el usuario y sus historias con el formato del contrato.
// La usan GET y PUT, porque los dos responden lo mismo.
const obtenerPerfil = async (id) => {
  const resultadoUsuario = await pool.query(
    'SELECT id, nombre, email, avatar_url, fecha_registro FROM usuarios WHERE id = $1',
    [id]
  );
  const usuario = resultadoUsuario.rows[0];
  if (!usuario) return null;

  const resultadoHistorias = await pool.query(
    'SELECT id, titulo, portada_url, tipo FROM historias WHERE autor_id = $1 ORDER BY fecha_creacion DESC',
    [id]
  );

  return { ...usuario, historias: resultadoHistorias.rows };
};

// GET /api/usuarios/me
const verPerfil = async (req, res) => {
  try {
    const perfil = await obtenerPerfil(req.usuario.id);
    if (!perfil) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    res.json(perfil);
  } catch (error) {
    res.status(500).json({ error: 'Error del servidor' });
  }
};

// PUT /api/usuarios/me → body { nombre?, avatar_url? }
const actualizarPerfil = async (req, res) => {
  try {
    const { nombre, avatar_url } = req.body || {};

    // Debe venir al menos uno de los dos campos
    if (nombre === undefined && avatar_url === undefined) {
      return res.status(400).json({ error: 'Debes enviar nombre o avatar_url' });
    }
    // Si viene nombre, no puede estar vacío
    if (nombre !== undefined && (typeof nombre !== 'string' || !nombre.trim())) {
      return res.status(400).json({ error: 'El campo nombre no puede estar vacío' });
    }

    // COALESCE deja el valor actual cuando el campo no se envió (llega como null)
    const resultado = await pool.query(
      `UPDATE usuarios
       SET nombre = COALESCE($1, nombre),
           avatar_url = COALESCE($2, avatar_url)
       WHERE id = $3`,
      [nombre ? nombre.trim() : null, avatar_url ?? null, req.usuario.id]
    );

    if (resultado.rowCount === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json(await obtenerPerfil(req.usuario.id));
  } catch (error) {
    res.status(500).json({ error: 'Error del servidor' });
  }
};

module.exports = { verPerfil, actualizarPerfil };
