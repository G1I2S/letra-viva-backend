// Controllers de historias, capítulos y géneros
const jwt = require('jsonwebtoken');
const pool = require('../db');

const errorServidor = (res) => res.status(500).json({ error: 'Error del servidor' });
const idValido = (value) => /^\d+$/.test(String(value)) && Number(value) > 0;
const listaIds = (value) => {
  if (value === undefined || value === '') return [];
  if (Array.isArray(value)) return value;
  if (typeof value !== 'string') return null;
  return value.split(',').map((item) => item.trim()).filter(Boolean);
};

// Las rutas públicas pueden enriquecer la respuesta si reciben un token válido.
function usuarioOpcional(req) {
  const authorization = req.headers.authorization;
  if (!authorization || !authorization.startsWith('Bearer ') || !process.env.JWT_SECRET) return null;
  try {
    const datos = jwt.verify(authorization.slice(7), process.env.JWT_SECRET);
    return { id: datos.id, email: datos.email };
  } catch (_) {
    return null;
  }
}

async function listarGeneros(req, res) {
  try {
    const { rows } = await pool.query('SELECT id, nombre FROM generos ORDER BY id ASC');
    return res.json(rows);
  } catch (error) { return errorServidor(res); }
}

async function listarHistorias(req, res) {
  try {
    const { tipo, generos, buscar, orden, dias } = req.query;
    const pagina = Number.parseInt(req.query.pagina, 10) || 1;
    const limite = Number.parseInt(req.query.limite, 10) || 12;
    if (pagina < 1 || limite < 1 || limite > 100) {
      return res.status(400).json({ error: 'pagina debe ser mayor que 0 y limite debe estar entre 1 y 100' });
    }
    if (tipo && !['novela', 'corto'].includes(tipo)) return res.status(400).json({ error: 'El tipo debe ser novela o corto' });
    const genreIds = listaIds(generos);
    if (!genreIds || genreIds.some((id) => !idValido(id))) return res.status(400).json({ error: 'El filtro generos debe contener IDs válidos' });
    const days = dias === undefined ? null : Number(dias);
    if (days !== null && (!Number.isInteger(days) || days < 1 || days > 3650)) return res.status(400).json({ error: 'dias debe ser un entero entre 1 y 3650' });

    const values = [];
    const where = [];
    const add = (value) => { values.push(value); return `$${values.length}`; };
    if (tipo) where.push(`h.tipo = ${add(tipo)}`);
    if (buscar && String(buscar).trim()) {
      const p = add(`%${String(buscar).trim()}%`);
      where.push(`(h.titulo ILIKE ${p} OR COALESCE(h.resumen, '') ILIKE ${p} OR u.nombre ILIKE ${p})`);
    }
    if (genreIds.length) {
      const p = add(genreIds.map(Number));
      where.push(`EXISTS (SELECT 1 FROM historia_generos hgf WHERE hgf.historia_id = h.id AND hgf.genero_id = ANY(${p}::int[]))`);
    }
    if (days !== null) where.push(`h.fecha_actualizacion >= NOW() - (${add(days)} * INTERVAL '1 day')`);

    const orderOptions = {
      reciente: 'h.fecha_actualizacion DESC, h.id DESC',
      actualizacion: 'h.fecha_actualizacion DESC, h.id DESC',
      popular: 'h.total_reacciones DESC, h.total_favoritos DESC, h.id DESC',
      reacciones: 'h.total_reacciones DESC, h.id DESC',
      titulo: 'h.titulo ASC, h.id ASC',
      antiguo: 'h.fecha_creacion ASC, h.id ASC',
    };
    const orderBy = orderOptions[orden] || orderOptions.reciente;
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const count = await pool.query(
      `SELECT COUNT(DISTINCT h.id)::int AS total FROM historias h JOIN usuarios u ON u.id = h.autor_id ${whereSql}`,
      values
    );
    const offsetPlaceholder = add((pagina - 1) * limite);
    const limitPlaceholder = add(limite);
    const { rows } = await pool.query(
      `SELECT h.id, h.autor_id, h.titulo, h.resumen, h.portada_url, h.tipo,
              h.total_reacciones, h.total_comentarios, h.total_favoritos, h.total_lecturas,
              h.fecha_creacion, h.fecha_actualizacion,
              u.nombre AS autor, u.avatar_url AS autor_avatar,
              COALESCE((SELECT json_agg(json_build_object('id', g.id, 'nombre', g.nombre) ORDER BY g.id)
                        FROM historia_generos hg JOIN generos g ON g.id = hg.genero_id WHERE hg.historia_id = h.id), '[]'::json) AS generos,
              (SELECT COUNT(*)::int FROM capitulos c WHERE c.historia_id = h.id) AS cantidad_capitulos
       FROM historias h JOIN usuarios u ON u.id = h.autor_id ${whereSql}
       ORDER BY ${orderBy} LIMIT ${limitPlaceholder} OFFSET ${offsetPlaceholder}`,
      values
    );
    return res.json({ historias: rows, paginacion: { pagina, limite, total: count.rows[0].total, paginas: Math.ceil(count.rows[0].total / limite) } });
  } catch (error) { return errorServidor(res); }
}

async function obtenerHistoria(req, res) {
  try {
    if (!idValido(req.params.id)) return res.status(400).json({ error: 'ID de historia inválido' });
    const usuario = usuarioOpcional(req);
    const values = [Number(req.params.id)];
    let personalSql = `FALSE AS es_favorito, NULL::int AS capitulo_actual`;
    if (usuario && idValido(usuario.id)) {
      values.push(Number(usuario.id));
      personalSql = `EXISTS (SELECT 1 FROM favoritos f WHERE f.historia_id = h.id AND f.usuario_id = $2) AS es_favorito,
        (SELECT c.numero FROM lecturas l JOIN capitulos c ON c.id = l.capitulo_id WHERE l.historia_id = h.id AND l.usuario_id = $2) AS capitulo_actual`;
    }
    const { rows } = await pool.query(
      `SELECT h.id, h.autor_id, h.titulo, h.resumen, h.portada_url, h.tipo,
              h.total_reacciones, h.total_comentarios, h.total_favoritos, h.total_lecturas,
              h.fecha_creacion, h.fecha_actualizacion, u.nombre AS autor, u.avatar_url AS autor_avatar,
              ${personalSql},
              COALESCE((SELECT json_agg(json_build_object('id', g.id, 'nombre', g.nombre) ORDER BY g.id)
                        FROM historia_generos hg JOIN generos g ON g.id = hg.genero_id WHERE hg.historia_id = h.id), '[]'::json) AS generos,
              COALESCE((SELECT json_agg(json_build_object('id', c.id, 'numero', c.numero, 'titulo', c.titulo, 'fecha_publicacion', c.fecha_publicacion) ORDER BY c.numero)
                        FROM capitulos c WHERE c.historia_id = h.id), '[]'::json) AS capitulos
       FROM historias h JOIN usuarios u ON u.id = h.autor_id WHERE h.id = $1`, values
    );
    if (!rows[0]) return res.status(404).json({ error: 'Historia no encontrada' });
    return res.json(rows[0]);
  } catch (error) { return errorServidor(res); }
}

async function crearHistoria(req, res) {
  const { titulo, resumen = null, portada_url = null, tipo, generos = [] } = req.body || {};
  if (typeof titulo !== 'string' || !titulo.trim() || titulo.trim().length > 150) return res.status(400).json({ error: 'El título es obligatorio y debe tener máximo 150 caracteres' });
  if (tipo !== 'novela' && tipo !== 'corto') return res.status(400).json({ error: 'El tipo debe ser novela o corto' });
  if (resumen !== null && typeof resumen !== 'string') return res.status(400).json({ error: 'El resumen debe ser texto' });
  if (portada_url !== null && (typeof portada_url !== 'string' || portada_url.length > 255)) return res.status(400).json({ error: 'portada_url debe ser texto de máximo 255 caracteres o null' });
  const genreIds = listaIds(generos);
  if (!genreIds || genreIds.some((id) => !idValido(id))) return res.status(400).json({ error: 'Los géneros deben ser IDs válidos' });
  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');
    if (genreIds.length) {
      const check = await client.query('SELECT id FROM generos WHERE id = ANY($1::int[])', [genreIds.map(Number)]);
      if (check.rowCount !== new Set(genreIds.map(Number)).size) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Uno o más géneros no existen' });
      }
    }
    const result = await client.query(
      `INSERT INTO historias (autor_id, titulo, resumen, portada_url, tipo)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [req.usuario.id, titulo.trim(), resumen, portada_url, tipo]
    );
    const historia = result.rows[0];
    for (const generoId of [...new Set(genreIds.map(Number))]) {
      await client.query('INSERT INTO historia_generos (historia_id, genero_id) VALUES ($1, $2)', [historia.id, generoId]);
    }
    await client.query('COMMIT');
    return res.status(201).json({ ...historia, generos: [...new Set(genreIds.map(Number))] });
  } catch (error) {
    if (client) { try { await client.query('ROLLBACK'); } catch (_) {} }
    return errorServidor(res);
  } finally { if (client) client.release(); }
}

async function actualizarHistoria(req, res) {
  if (!idValido(req.params.id)) return res.status(400).json({ error: 'ID de historia inválido' });
  const { titulo, resumen, portada_url, tipo, generos } = req.body || {};
  if (titulo !== undefined && (typeof titulo !== 'string' || !titulo.trim() || titulo.trim().length > 150)) return res.status(400).json({ error: 'El título debe tener entre 1 y 150 caracteres' });
  if (tipo !== undefined && !['novela', 'corto'].includes(tipo)) return res.status(400).json({ error: 'El tipo debe ser novela o corto' });
  if (resumen !== undefined && resumen !== null && typeof resumen !== 'string') return res.status(400).json({ error: 'El resumen debe ser texto o null' });
  if (portada_url !== undefined && portada_url !== null && (typeof portada_url !== 'string' || portada_url.length > 255)) return res.status(400).json({ error: 'portada_url debe ser texto de máximo 255 caracteres o null' });
  const genreIds = generos === undefined ? null : listaIds(generos);
  if (generos !== undefined && (!genreIds || genreIds.some((id) => !idValido(id)))) return res.status(400).json({ error: 'Los géneros deben ser IDs válidos' });
  if ([titulo, resumen, portada_url, tipo, generos].every((v) => v === undefined)) return res.status(400).json({ error: 'Debes enviar al menos un campo para actualizar' });
  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');
    const owner = await client.query('SELECT id, autor_id FROM historias WHERE id = $1 FOR UPDATE', [Number(req.params.id)]);
    if (!owner.rows[0]) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Historia no encontrada' }); }
    if (Number(owner.rows[0].autor_id) !== Number(req.usuario.id)) { await client.query('ROLLBACK'); return res.status(403).json({ error: 'Solo el autor puede modificar esta historia' }); }
    if (tipo === 'corto') {
      const cantidad = await client.query('SELECT COUNT(*)::int AS total FROM capitulos WHERE historia_id = $1', [Number(req.params.id)]);
      if (cantidad.rows[0].total > 1) { await client.query('ROLLBACK'); return res.status(400).json({ error: 'No puedes convertir en relato corto una historia que tiene más de un capítulo' }); }
    }
    if (genreIds) {
      const uniqueIds = [...new Set(genreIds.map(Number))];
      if (uniqueIds.length) {
        const check = await client.query('SELECT id FROM generos WHERE id = ANY($1::int[])', [uniqueIds]);
        if (check.rowCount !== uniqueIds.length) { await client.query('ROLLBACK'); return res.status(400).json({ error: 'Uno o más géneros no existen' }); }
      }
      await client.query('DELETE FROM historia_generos WHERE historia_id = $1', [Number(req.params.id)]);
      for (const generoId of uniqueIds) await client.query('INSERT INTO historia_generos (historia_id, genero_id) VALUES ($1, $2)', [Number(req.params.id), generoId]);
    }
    const result = await client.query(
      `UPDATE historias SET titulo = COALESCE($1, titulo), resumen = CASE WHEN $2 THEN $3 ELSE resumen END,
       portada_url = CASE WHEN $4 THEN $5 ELSE portada_url END, tipo = COALESCE($6, tipo), fecha_actualizacion = NOW()
       WHERE id = $7 RETURNING *`,
      [titulo === undefined ? null : titulo.trim(), resumen !== undefined, resumen ?? null, portada_url !== undefined, portada_url ?? null, tipo ?? null, Number(req.params.id)]
    );
    await client.query('COMMIT');
    return res.json({ ...result.rows[0], ...(genreIds ? { generos: [...new Set(genreIds.map(Number))] } : {}) });
  } catch (error) {
    if (client) { try { await client.query('ROLLBACK'); } catch (_) {} }
    return errorServidor(res);
  } finally { if (client) client.release(); }
}

async function eliminarHistoria(req, res) {
  try {
    if (!idValido(req.params.id)) return res.status(400).json({ error: 'ID de historia inválido' });
    const result = await pool.query('DELETE FROM historias WHERE id = $1 AND autor_id = $2 RETURNING id', [Number(req.params.id), req.usuario.id]);
    if (result.rowCount) return res.status(204).send();
    const exists = await pool.query('SELECT id FROM historias WHERE id = $1', [Number(req.params.id)]);
    if (!exists.rowCount) return res.status(404).json({ error: 'Historia no encontrada' });
    return res.status(403).json({ error: 'Solo el autor puede eliminar esta historia' });
  } catch (error) { return errorServidor(res); }
}

async function obtenerCapitulo(req, res) {
  try {
    if (!idValido(req.params.id) || !idValido(req.params.numero)) return res.status(400).json({ error: 'ID de historia o número de capítulo inválido' });
    const usuario = usuarioOpcional(req);
    const values = [Number(req.params.id), Number(req.params.numero)];
    let personalSql = 'NULL::varchar AS mi_reaccion';
    if (usuario && idValido(usuario.id)) {
      values.push(Number(usuario.id));
      personalSql = '(SELECT r.tipo FROM reacciones r WHERE r.capitulo_id = c.id AND r.usuario_id = $3) AS mi_reaccion';
    }
    const { rows } = await pool.query(
      `SELECT c.id, c.historia_id, c.numero, c.titulo, c.contenido, c.fecha_publicacion, h.titulo AS historia_titulo,
              h.autor_id, u.nombre AS autor, ${personalSql}
       FROM capitulos c JOIN historias h ON h.id = c.historia_id JOIN usuarios u ON u.id = h.autor_id
       WHERE c.historia_id = $1 AND c.numero = $2`, values
    );
    if (!rows[0]) return res.status(404).json({ error: 'Capítulo no encontrado' });
    return res.json(rows[0]);
  } catch (error) { return errorServidor(res); }
}

async function crearCapitulo(req, res) {
  if (!idValido(req.params.id)) return res.status(400).json({ error: 'ID de historia inválido' });
  const { titulo, contenido, numero } = req.body || {};
  if (typeof titulo !== 'string' || !titulo.trim() || titulo.trim().length > 150) return res.status(400).json({ error: 'El título del capítulo es obligatorio y debe tener máximo 150 caracteres' });
  if (typeof contenido !== 'string' || !contenido.trim()) return res.status(400).json({ error: 'El contenido del capítulo es obligatorio' });
  if (numero !== undefined && (!Number.isInteger(Number(numero)) || Number(numero) < 1)) return res.status(400).json({ error: 'El número de capítulo debe ser un entero positivo' });
  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');
    const historiaResult = await client.query('SELECT id, autor_id, tipo FROM historias WHERE id = $1 FOR UPDATE', [Number(req.params.id)]);
    const historia = historiaResult.rows[0];
    if (!historia) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Historia no encontrada' }); }
    if (Number(historia.autor_id) !== Number(req.usuario.id)) { await client.query('ROLLBACK'); return res.status(403).json({ error: 'Solo el autor puede agregar capítulos' }); }
    const countResult = await client.query('SELECT COALESCE(MAX(numero), 0)::int AS ultimo FROM capitulos WHERE historia_id = $1', [Number(req.params.id)]);
    const nextNumber = numero === undefined ? countResult.rows[0].ultimo + 1 : Number(numero);
    if (nextNumber !== countResult.rows[0].ultimo + 1) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'El número debe continuar la secuencia de capítulos' });
    }
    if (historia.tipo === 'corto' && countResult.rows[0].ultimo >= 1) { await client.query('ROLLBACK'); return res.status(400).json({ error: 'Un relato corto solo puede tener un capítulo' }); }
    const result = await client.query(
      'INSERT INTO capitulos (historia_id, numero, titulo, contenido) VALUES ($1, $2, $3, $4) RETURNING *',
      [Number(req.params.id), nextNumber, titulo.trim(), contenido.trim()]
    );
    await client.query('UPDATE historias SET fecha_actualizacion = NOW() WHERE id = $1', [Number(req.params.id)]);
    await client.query('COMMIT');
    return res.status(201).json(result.rows[0]);
  } catch (error) {
    if (client) { try { await client.query('ROLLBACK'); } catch (_) {} }
    if (error.code === '23505') return res.status(409).json({ error: 'Ese número de capítulo ya existe' });
    return errorServidor(res);
  } finally { if (client) client.release(); }
}

module.exports = { listarGeneros, listarHistorias, obtenerHistoria, crearHistoria, actualizarHistoria, eliminarHistoria, obtenerCapitulo, crearCapitulo };
