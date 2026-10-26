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
    const { tipo, generos, buscar, dias } = req.query;
    const pagina = Number.parseInt(req.query.pagina, 10) || 1;
    const limite = Number.parseInt(req.query.limite, 10) || 12;
    const orden = req.query.orden || 'recientes';

    if (pagina < 1 || limite < 1 || limite > 100) {
      return res.status(400).json({ error: 'pagina debe ser mayor que 0 y limite debe estar entre 1 y 100' });
    }
    if (tipo && !['novela', 'corto'].includes(tipo)) return res.status(400).json({ error: 'El tipo debe ser novela o corto' });
    const idsGeneros = listaIds(generos);
    if (!idsGeneros || idsGeneros.some((id) => !idValido(id))) return res.status(400).json({ error: 'El filtro generos debe contener IDs válidos' });
    const cantidadDias = dias === undefined ? null : Number(dias);
    if (cantidadDias !== null && (!Number.isInteger(cantidadDias) || cantidadDias < 1 || cantidadDias > 3650)) {
      return res.status(400).json({ error: 'dias debe ser un entero entre 1 y 3650' });
    }

    const valores = [];
    const condiciones = [];
    const agregarValor = (valor) => { valores.push(valor); return `$${valores.length}`; };
    if (tipo) condiciones.push(`h.tipo = ${agregarValor(tipo)}`);
    if (buscar && String(buscar).trim()) {
      const termino = agregarValor(`%${String(buscar).trim()}%`);
      condiciones.push(`(h.titulo ILIKE ${termino} OR COALESCE(h.resumen, '') ILIKE ${termino} OR u.nombre ILIKE ${termino})`);
    }
    if (idsGeneros.length) {
      const parametroGeneros = agregarValor(idsGeneros.map(Number));
      condiciones.push(`EXISTS (SELECT 1 FROM historia_generos hgf WHERE hgf.historia_id = h.id AND hgf.genero_id = ANY(${parametroGeneros}::int[]))`);
    }
    if (cantidadDias !== null) condiciones.push(`h.fecha_actualizacion >= NOW() - (${agregarValor(cantidadDias)} * INTERVAL '1 day')`);

    // Los nombres de orden coinciden con el contrato de la API.
    const ordenesPermitidos = {
      recientes: 'h.fecha_actualizacion DESC, h.id DESC',
      populares: 'h.total_reacciones DESC, h.total_favoritos DESC, h.id DESC',
      reciente: 'h.fecha_actualizacion DESC, h.id DESC',
      actualizacion: 'h.fecha_actualizacion DESC, h.id DESC',
      popular: 'h.total_reacciones DESC, h.total_favoritos DESC, h.id DESC',
      reacciones: 'h.total_reacciones DESC, h.id DESC',
      titulo: 'h.titulo ASC, h.id ASC',
      antiguo: 'h.fecha_creacion ASC, h.id ASC',
    };
    const ordenSql = ordenesPermitidos[orden] || ordenesPermitidos.recientes;
    const whereSql = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';
    const consultaTotal = await pool.query(
      `SELECT COUNT(DISTINCT h.id)::int AS total FROM historias h JOIN usuarios u ON u.id = h.autor_id ${whereSql}`,
      valores
    );
    const total = Number(consultaTotal.rows[0]?.total || 0);
    const desplazamiento = agregarValor((pagina - 1) * limite);
    const limiteSql = agregarValor(limite);
    const { rows } = await pool.query(
      `SELECT h.id, h.titulo, h.resumen, h.portada_url, h.tipo,
              h.autor_id, u.nombre AS autor_nombre,
              h.total_reacciones, h.total_comentarios,
              COALESCE((SELECT json_agg(g.nombre ORDER BY g.id)
                        FROM historia_generos hg JOIN generos g ON g.id = hg.genero_id WHERE hg.historia_id = h.id), '[]'::json) AS generos,
              (SELECT json_build_object('numero', c.numero, 'fecha_publicacion', c.fecha_publicacion)
               FROM capitulos c WHERE c.historia_id = h.id ORDER BY c.numero DESC LIMIT 1) AS ultimo_capitulo
       FROM historias h JOIN usuarios u ON u.id = h.autor_id ${whereSql}
       ORDER BY ${ordenSql} LIMIT ${limiteSql} OFFSET ${desplazamiento}`,
      valores
    );

    const historias = rows.map((historia) => ({
      id: historia.id,
      titulo: historia.titulo,
      resumen: historia.resumen,
      portada_url: historia.portada_url,
      tipo: historia.tipo,
      autor: { id: historia.autor_id, nombre: historia.autor_nombre },
      generos: Array.isArray(historia.generos) ? historia.generos : [],
      total_reacciones: historia.total_reacciones,
      total_comentarios: historia.total_comentarios,
      ultimo_capitulo: historia.ultimo_capitulo || null,
    }));
    return res.json({ pagina, total, historias });
  } catch (error) { return errorServidor(res); }
}

async function obtenerHistoria(req, res) {
  try {
    if (!idValido(req.params.id)) return res.status(400).json({ error: 'ID de historia inválido' });
    const usuario = usuarioOpcional(req);
    const valores = [Number(req.params.id)];
    let consultaPersonal = '';
    if (usuario && idValido(usuario.id)) {
      valores.push(Number(usuario.id));
      consultaPersonal = `,
        EXISTS (SELECT 1 FROM favoritos f WHERE f.historia_id = h.id AND f.usuario_id = $2) AS es_favorito,
        (SELECT c.numero FROM lecturas l JOIN capitulos c ON c.id = l.capitulo_id WHERE l.historia_id = h.id AND l.usuario_id = $2) AS capitulo_actual`;
    }
    const { rows } = await pool.query(
      `SELECT h.id, h.titulo, h.resumen, h.portada_url, h.tipo,
              h.autor_id, u.nombre AS autor_nombre, u.avatar_url AS autor_avatar,
              h.total_reacciones, h.total_comentarios, h.total_favoritos, h.total_lecturas,
              COALESCE((SELECT json_agg(g.nombre ORDER BY g.id)
                        FROM historia_generos hg JOIN generos g ON g.id = hg.genero_id WHERE hg.historia_id = h.id), '[]'::json) AS generos,
              COALESCE((SELECT json_agg(json_build_object('id', c.id, 'numero', c.numero, 'titulo', c.titulo, 'fecha_publicacion', c.fecha_publicacion) ORDER BY c.numero)
                        FROM capitulos c WHERE c.historia_id = h.id), '[]'::json) AS capitulos
              ${consultaPersonal}
       FROM historias h JOIN usuarios u ON u.id = h.autor_id WHERE h.id = $1`, valores
    );
    const historia = rows[0];
    if (!historia) return res.status(404).json({ error: 'Historia no encontrada' });

    // La ficha pública no expone campos de sesión si no se envió un token válido.
    const respuesta = {
      id: historia.id,
      titulo: historia.titulo,
      resumen: historia.resumen,
      portada_url: historia.portada_url,
      tipo: historia.tipo,
      autor: { id: historia.autor_id, nombre: historia.autor_nombre, avatar_url: historia.autor_avatar },
      generos: Array.isArray(historia.generos) ? historia.generos : [],
      totales: {
        reacciones: historia.total_reacciones,
        comentarios: historia.total_comentarios,
        favoritos: historia.total_favoritos,
        lecturas: historia.total_lecturas,
      },
      capitulos: Array.isArray(historia.capitulos) ? historia.capitulos : [],
    };
    if (usuario && idValido(usuario.id)) {
      respuesta.es_favorito = Boolean(historia.es_favorito);
      respuesta.capitulo_actual = historia.capitulo_actual === null ? null : historia.capitulo_actual;
    }
    return res.json(respuesta);
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
    const valores = [Number(req.params.id), Number(req.params.numero)];
    let consultaPersonal = '';
    if (usuario && idValido(usuario.id)) {
      valores.push(Number(usuario.id));
      consultaPersonal = ', (SELECT r.tipo FROM reacciones r WHERE r.capitulo_id = c.id AND r.usuario_id = $3) AS mi_reaccion';
    }
    const { rows } = await pool.query(
      `SELECT c.id, c.numero, c.titulo, c.contenido,
              h.id AS historia_id, h.titulo AS historia_titulo, h.autor_id, u.nombre AS autor_nombre,
              (SELECT COUNT(*)::int FROM capitulos ct WHERE ct.historia_id = h.id) AS total_capitulos,
              (SELECT MAX(cp.numero) FROM capitulos cp WHERE cp.historia_id = h.id AND cp.numero < c.numero) AS anterior,
              (SELECT MIN(cs.numero) FROM capitulos cs WHERE cs.historia_id = h.id AND cs.numero > c.numero) AS siguiente,
              json_build_object(
                'llorar', (SELECT COUNT(*)::int FROM reacciones r WHERE r.capitulo_id = c.id AND r.tipo = 'llorar'),
                'sorpresa', (SELECT COUNT(*)::int FROM reacciones r WHERE r.capitulo_id = c.id AND r.tipo = 'sorpresa'),
                'risa', (SELECT COUNT(*)::int FROM reacciones r WHERE r.capitulo_id = c.id AND r.tipo = 'risa'),
                'fuego', (SELECT COUNT(*)::int FROM reacciones r WHERE r.capitulo_id = c.id AND r.tipo = 'fuego'),
                'corazon_roto', (SELECT COUNT(*)::int FROM reacciones r WHERE r.capitulo_id = c.id AND r.tipo = 'corazon_roto')
              ) AS reacciones
              ${consultaPersonal}
       FROM capitulos c JOIN historias h ON h.id = c.historia_id JOIN usuarios u ON u.id = h.autor_id
       WHERE c.historia_id = $1 AND c.numero = $2`, valores
    );
    const capitulo = rows[0];
    if (!capitulo) return res.status(404).json({ error: 'Capítulo no encontrado' });
    const respuesta = {
      id: capitulo.id,
      historia: {
        id: capitulo.historia_id,
        titulo: capitulo.historia_titulo,
        autor: { id: capitulo.autor_id, nombre: capitulo.autor_nombre },
      },
      numero: capitulo.numero,
      total_capitulos: Number(capitulo.total_capitulos),
      titulo: capitulo.titulo,
      contenido: capitulo.contenido,
      anterior: capitulo.anterior === null ? null : capitulo.anterior,
      siguiente: capitulo.siguiente === null ? null : capitulo.siguiente,
      reacciones: capitulo.reacciones || { llorar: 0, sorpresa: 0, risa: 0, fuego: 0, corazon_roto: 0 },
    };
    if (usuario && idValido(usuario.id)) respuesta.mi_reaccion = capitulo.mi_reaccion ?? null;
    return res.json(respuesta);
  } catch (error) { return errorServidor(res); }
}

async function crearCapitulo(req, res) {
  if (!idValido(req.params.id)) return res.status(400).json({ error: 'ID de historia inválido' });
  const { titulo, contenido } = req.body || {};
  if (typeof titulo !== 'string' || !titulo.trim() || titulo.trim().length > 150) return res.status(400).json({ error: 'El título del capítulo es obligatorio y debe tener máximo 150 caracteres' });
  if (typeof contenido !== 'string' || !contenido.trim()) return res.status(400).json({ error: 'El contenido del capítulo es obligatorio' });
  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');
    const historiaResult = await client.query('SELECT id, autor_id, tipo FROM historias WHERE id = $1 FOR UPDATE', [Number(req.params.id)]);
    const historia = historiaResult.rows[0];
    if (!historia) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Historia no encontrada' }); }
    if (Number(historia.autor_id) !== Number(req.usuario.id)) { await client.query('ROLLBACK'); return res.status(403).json({ error: 'Solo el autor puede agregar capítulos' }); }
    const countResult = await client.query('SELECT COALESCE(MAX(numero), 0)::int AS ultimo FROM capitulos WHERE historia_id = $1', [Number(req.params.id)]);
    const nextNumber = countResult.rows[0].ultimo + 1;
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
