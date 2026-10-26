// Controllers de lecturas, reacciones, comentarios, favoritos, donaciones y notificaciones
// El usuario que inició sesión está en req.usuario ({ id, email }) en las rutas con verificarToken.
// Al agregar o quitar reacciones, comentarios, favoritos o lecturas, actualizamos los contadores
// de la tabla historias dentro de una transacción (si algo falla, no se guarda nada).
const pool = require('../db');

const TIPOS_REACCION = ['llorar', 'sorpresa', 'risa', 'fuego', 'corazon_roto'];

// true si el valor es un entero positivo (acepta 3 o "3") y cabe en una columna INT de PostgreSQL
const esEnteroPositivo = (valor) =>
  /^\d+$/.test(String(valor)) && Number(valor) > 0 && Number(valor) <= 2147483647;

// Deshace la transacción (si sigue abierta) y responde 500
const errorEnTransaccion = async (client, res) => {
  try {
    await client.query('ROLLBACK');
  } catch (errorRollback) {
    // si el ROLLBACK también falla, igual respondemos 500
  }
  res.status(500).json({ error: 'Error del servidor' });
};

// Cuenta cuántas reacciones de cada tipo tiene un capítulo (en 0 las que no tienen)
const contarReacciones = async (client, capituloId) => {
  const { rows } = await client.query(
    'SELECT tipo, COUNT(*)::int AS cantidad FROM reacciones WHERE capitulo_id = $1 GROUP BY tipo',
    [capituloId]
  );
  const reacciones = { llorar: 0, sorpresa: 0, risa: 0, fuego: 0, corazon_roto: 0 };
  rows.forEach((fila) => {
    reacciones[fila.tipo] = fila.cantidad;
  });
  return reacciones;
};

// Da a un comentario (con los datos de su autor) el formato del contrato
const formatoComentario = (fila) => ({
  id: fila.id,
  usuario: { id: fila.usuario_id, nombre: fila.nombre, avatar_url: fila.avatar_url },
  contenido: fila.contenido,
  fecha: fila.fecha,
});

// PUT /api/lecturas → body { historia_id, capitulo_id }
const guardarLectura = async (req, res) => {
  const { historia_id, capitulo_id } = req.body || {};

  if (!esEnteroPositivo(historia_id) || !esEnteroPositivo(capitulo_id)) {
    return res.status(400).json({ error: 'historia_id y capitulo_id deben ser números enteros positivos' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // El capítulo tiene que existir y ser de esa historia
    const resultadoCapitulo = await client.query(
      'SELECT id, numero FROM capitulos WHERE id = $1 AND historia_id = $2',
      [capitulo_id, historia_id]
    );
    const capitulo = resultadoCapitulo.rows[0];
    if (!capitulo) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Capítulo no encontrado en esa historia' });
    }

    // Crea la lectura o, si ya existía, actualiza el capítulo.
    // xmax = 0 significa que la fila se acaba de insertar (es la primera vez que lee esta historia).
    const resultadoLectura = await client.query(
      `INSERT INTO lecturas (usuario_id, historia_id, capitulo_id)
       VALUES ($1, $2, $3)
       ON CONFLICT (usuario_id, historia_id)
       DO UPDATE SET capitulo_id = EXCLUDED.capitulo_id, fecha_actualizacion = NOW()
       RETURNING (xmax = 0) AS es_nueva`,
      [req.usuario.id, historia_id, capitulo_id]
    );

    if (resultadoLectura.rows[0].es_nueva) {
      await client.query(
        'UPDATE historias SET total_lecturas = total_lecturas + 1 WHERE id = $1',
        [historia_id]
      );
    }

    await client.query('COMMIT');
    res.json({ historia_id: Number(historia_id), capitulo_id: capitulo.id, numero: capitulo.numero });
  } catch (error) {
    await errorEnTransaccion(client, res);
  } finally {
    client.release();
  }
};

// POST /api/capitulos/:id/reacciones → body { tipo }
const reaccionar = async (req, res) => {
  const capituloId = req.params.id;
  const { tipo } = req.body || {};

  if (!esEnteroPositivo(capituloId)) {
    return res.status(400).json({ error: 'ID de capítulo inválido' });
  }
  if (!TIPOS_REACCION.includes(tipo)) {
    return res.status(400).json({ error: 'El tipo debe ser llorar, sorpresa, risa, fuego o corazon_roto' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const resultadoCapitulo = await client.query(
      'SELECT historia_id FROM capitulos WHERE id = $1',
      [capituloId]
    );
    const capitulo = resultadoCapitulo.rows[0];
    if (!capitulo) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Capítulo no encontrado' });
    }

    // Si ya había reaccionado, se reemplaza la emoción (ON CONFLICT ... DO UPDATE)
    const resultadoReaccion = await client.query(
      `INSERT INTO reacciones (usuario_id, capitulo_id, tipo)
       VALUES ($1, $2, $3)
       ON CONFLICT (usuario_id, capitulo_id)
       DO UPDATE SET tipo = EXCLUDED.tipo, fecha = NOW()
       RETURNING (xmax = 0) AS es_nueva`,
      [req.usuario.id, capituloId, tipo]
    );

    // Solo una reacción nueva suma al contador; reemplazar no cambia el total
    if (resultadoReaccion.rows[0].es_nueva) {
      await client.query(
        'UPDATE historias SET total_reacciones = total_reacciones + 1 WHERE id = $1',
        [capitulo.historia_id]
      );
    }

    const reacciones = await contarReacciones(client, capituloId);

    await client.query('COMMIT');
    res.status(201).json({ capitulo_id: Number(capituloId), tipo, reacciones });
  } catch (error) {
    await errorEnTransaccion(client, res);
  } finally {
    client.release();
  }
};

// DELETE /api/capitulos/:id/reacciones
const quitarReaccion = async (req, res) => {
  const capituloId = req.params.id;

  if (!esEnteroPositivo(capituloId)) {
    return res.status(400).json({ error: 'ID de capítulo inválido' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Borra la reacción y devuelve de qué historia era el capítulo
    const resultado = await client.query(
      `DELETE FROM reacciones r
       USING capitulos c
       WHERE r.capitulo_id = c.id AND r.usuario_id = $1 AND r.capitulo_id = $2
       RETURNING c.historia_id`,
      [req.usuario.id, capituloId]
    );
    if (resultado.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'No has reaccionado a este capítulo' });
    }

    await client.query(
      'UPDATE historias SET total_reacciones = total_reacciones - 1 WHERE id = $1',
      [resultado.rows[0].historia_id]
    );

    await client.query('COMMIT');
    res.status(204).send();
  } catch (error) {
    await errorEnTransaccion(client, res);
  } finally {
    client.release();
  }
};

// GET /api/historias/:id/comentarios
const listarComentarios = async (req, res) => {
  try {
    const historiaId = req.params.id;
    if (!esEnteroPositivo(historiaId)) {
      return res.status(400).json({ error: 'ID de historia inválido' });
    }

    const resultadoHistoria = await pool.query('SELECT id FROM historias WHERE id = $1', [historiaId]);
    if (resultadoHistoria.rowCount === 0) {
      return res.status(404).json({ error: 'Historia no encontrada' });
    }

    // Del más nuevo al más antiguo
    const { rows } = await pool.query(
      `SELECT c.id, c.usuario_id, u.nombre, u.avatar_url, c.contenido, c.fecha
       FROM comentarios c
       JOIN usuarios u ON u.id = c.usuario_id
       WHERE c.historia_id = $1
       ORDER BY c.fecha DESC, c.id DESC`,
      [historiaId]
    );

    res.json(rows.map(formatoComentario));
  } catch (error) {
    res.status(500).json({ error: 'Error del servidor' });
  }
};

// POST /api/historias/:id/comentarios → body { contenido }
const comentar = async (req, res) => {
  const historiaId = req.params.id;
  const { contenido } = req.body || {};

  if (!esEnteroPositivo(historiaId)) {
    return res.status(400).json({ error: 'ID de historia inválido' });
  }
  if (typeof contenido !== 'string' || !contenido.trim()) {
    return res.status(400).json({ error: 'El comentario no puede estar vacío' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const resultadoHistoria = await client.query('SELECT id FROM historias WHERE id = $1', [historiaId]);
    if (resultadoHistoria.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Historia no encontrada' });
    }

    const resultadoComentario = await client.query(
      `INSERT INTO comentarios (usuario_id, historia_id, contenido)
       VALUES ($1, $2, $3)
       RETURNING id, usuario_id, contenido, fecha`,
      [req.usuario.id, historiaId, contenido.trim()]
    );

    await client.query(
      'UPDATE historias SET total_comentarios = total_comentarios + 1 WHERE id = $1',
      [historiaId]
    );

    // Datos de quien comentó, para responder con el mismo formato que el GET
    const resultadoUsuario = await client.query(
      'SELECT nombre, avatar_url FROM usuarios WHERE id = $1',
      [req.usuario.id]
    );

    await client.query('COMMIT');
    res.status(201).json(formatoComentario({ ...resultadoComentario.rows[0], ...resultadoUsuario.rows[0] }));
  } catch (error) {
    await errorEnTransaccion(client, res);
  } finally {
    client.release();
  }
};

// GET /api/favoritos
const listarFavoritos = async (req, res) => {
  try {
    // LEFT JOIN con lecturas: si nunca empezó a leerla, el capítulo actual queda en null
    const { rows } = await pool.query(
      `SELECT h.id, h.titulo, h.portada_url,
              c.numero AS capitulo_numero, c.titulo AS capitulo_titulo,
              (SELECT COUNT(*)::int FROM capitulos WHERE historia_id = h.id) AS total_capitulos
       FROM favoritos f
       JOIN historias h ON h.id = f.historia_id
       LEFT JOIN lecturas l ON l.usuario_id = f.usuario_id AND l.historia_id = f.historia_id
       LEFT JOIN capitulos c ON c.id = l.capitulo_id
       WHERE f.usuario_id = $1
       ORDER BY f.fecha DESC`,
      [req.usuario.id]
    );

    const favoritos = rows.map((fila) => ({
      historia: { id: fila.id, titulo: fila.titulo, portada_url: fila.portada_url },
      capitulo_actual: fila.capitulo_numero === null
        ? null
        : { numero: fila.capitulo_numero, titulo: fila.capitulo_titulo },
      total_capitulos: fila.total_capitulos,
    }));

    res.json(favoritos);
  } catch (error) {
    res.status(500).json({ error: 'Error del servidor' });
  }
};

// POST /api/favoritos → body { historia_id }
const agregarFavorito = async (req, res) => {
  const { historia_id } = req.body || {};

  if (!esEnteroPositivo(historia_id)) {
    return res.status(400).json({ error: 'historia_id debe ser un número entero positivo' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const resultadoHistoria = await client.query('SELECT id FROM historias WHERE id = $1', [historia_id]);
    if (resultadoHistoria.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Historia no encontrada' });
    }

    // ON CONFLICT DO NOTHING: si ya estaba, no inserta nada y no devuelve filas
    const resultado = await client.query(
      `INSERT INTO favoritos (usuario_id, historia_id)
       VALUES ($1, $2)
       ON CONFLICT (usuario_id, historia_id) DO NOTHING
       RETURNING historia_id, fecha`,
      [req.usuario.id, historia_id]
    );
    if (resultado.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'La historia ya está en tus favoritos' });
    }

    await client.query(
      'UPDATE historias SET total_favoritos = total_favoritos + 1 WHERE id = $1',
      [historia_id]
    );

    await client.query('COMMIT');
    res.status(201).json(resultado.rows[0]);
  } catch (error) {
    await errorEnTransaccion(client, res);
  } finally {
    client.release();
  }
};

// DELETE /api/favoritos/:historia_id
const quitarFavorito = async (req, res) => {
  const historiaId = req.params.historia_id;

  if (!esEnteroPositivo(historiaId)) {
    return res.status(400).json({ error: 'ID de historia inválido' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const resultado = await client.query(
      'DELETE FROM favoritos WHERE usuario_id = $1 AND historia_id = $2',
      [req.usuario.id, historiaId]
    );
    if (resultado.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'La historia no está en tus favoritos' });
    }

    await client.query(
      'UPDATE historias SET total_favoritos = total_favoritos - 1 WHERE id = $1',
      [historiaId]
    );

    await client.query('COMMIT');
    res.status(204).send();
  } catch (error) {
    await errorEnTransaccion(client, res);
  } finally {
    client.release();
  }
};

// POST /api/donaciones → body { escritor_id, historia_id, monto }
// Modo prueba: no hay pago real, solo se guarda el registro
const donar = async (req, res) => {
  try {
    const { escritor_id, historia_id, monto } = req.body || {};
    const donanteId = req.usuario.id; // siempre del token, nunca del body

    if (!esEnteroPositivo(escritor_id) || !esEnteroPositivo(historia_id)) {
      return res.status(400).json({ error: 'escritor_id e historia_id deben ser números enteros positivos' });
    }
    if (!esEnteroPositivo(monto)) {
      return res.status(400).json({ error: 'El monto debe ser un número entero mayor que 0' });
    }

    const resultadoHistoria = await pool.query('SELECT autor_id FROM historias WHERE id = $1', [historia_id]);
    const historia = resultadoHistoria.rows[0];
    if (!historia) {
      return res.status(404).json({ error: 'Historia no encontrada' });
    }
    if (historia.autor_id !== Number(escritor_id)) {
      return res.status(400).json({ error: 'El escritor no es el autor de esa historia' });
    }
    if (historia.autor_id === donanteId) {
      return res.status(400).json({ error: 'No puedes donarte a ti mismo' });
    }

    const { rows } = await pool.query(
      `INSERT INTO donaciones (donante_id, escritor_id, historia_id, monto)
       VALUES ($1, $2, $3, $4)
       RETURNING id, donante_id, escritor_id, historia_id, monto, fecha`,
      [donanteId, escritor_id, historia_id, monto]
    );

    // modo no es una columna: lo agregamos en la respuesta
    res.status(201).json({ ...rows[0], modo: 'prueba' });
  } catch (error) {
    res.status(500).json({ error: 'Error del servidor' });
  }
};

// GET /api/notificaciones
// No hay tabla de notificaciones: juntamos (UNION ALL) lo que OTROS usuarios hicieron
// en las historias del usuario. detalle se convierte a texto para que las 3 partes calcen.
const listarNotificaciones = async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT 'reaccion' AS tipo, u.nombre AS usuario, h.titulo AS historia, r.tipo AS detalle, r.fecha
       FROM reacciones r
       JOIN capitulos c ON c.id = r.capitulo_id
       JOIN historias h ON h.id = c.historia_id
       JOIN usuarios u ON u.id = r.usuario_id
       WHERE h.autor_id = $1 AND r.usuario_id <> $1

       UNION ALL

       SELECT 'comentario', u.nombre, h.titulo, co.contenido, co.fecha
       FROM comentarios co
       JOIN historias h ON h.id = co.historia_id
       JOIN usuarios u ON u.id = co.usuario_id
       WHERE h.autor_id = $1 AND co.usuario_id <> $1

       UNION ALL

       SELECT 'donacion', u.nombre, h.titulo, d.monto::text, d.fecha
       FROM donaciones d
       JOIN historias h ON h.id = d.historia_id
       JOIN usuarios u ON u.id = d.donante_id
       WHERE d.escritor_id = $1 AND d.donante_id <> $1

       ORDER BY fecha DESC
       LIMIT 50`,
      [req.usuario.id]
    );

    // En las donaciones, el monto vuelve a ser número
    const notificaciones = rows.map((fila) => ({
      ...fila,
      detalle: fila.tipo === 'donacion' ? Number(fila.detalle) : fila.detalle,
    }));

    res.json(notificaciones);
  } catch (error) {
    res.status(500).json({ error: 'Error del servidor' });
  }
};

module.exports = {
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
};
