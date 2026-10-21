-- =========================================================
-- Letra Viva · Datos de prueba
-- Se ejecuta DESPUÉS de script.sql (npm run db:init hace las dos cosas)
-- Las historias son las mismas del frontend (src/data/historias.js),
-- con los mismos id, para que el front funcione igual al conectarse a la API.
-- =========================================================

-- ---------- Usuarios ----------
-- Todos tienen la contraseña de prueba "letraviva123" (aquí va solo su hash bcrypt).
-- Lectores: id 1 al 3 · Escritores: id 7 al 16 (los mismos id de autor del frontend)
INSERT INTO usuarios (id, nombre, email, password, avatar_url, fecha_registro) VALUES
  (1,  'Valentina Rojas', 'valentina@letraviva.cl',   '$2b$10$S3gfQpd0HCI9RBsMQpXnkelsZbs3LMTgTbRdlKjUjGcp.dZiMYAIy', NULL, '2026-08-01 10:00'),
  (2,  'Camila Reyes',    'camila@letraviva.cl',      '$2b$10$S3gfQpd0HCI9RBsMQpXnkelsZbs3LMTgTbRdlKjUjGcp.dZiMYAIy', NULL, '2026-08-02 11:00'),
  (3,  'Diego Morales',   'diego@letraviva.cl',       '$2b$10$S3gfQpd0HCI9RBsMQpXnkelsZbs3LMTgTbRdlKjUjGcp.dZiMYAIy', NULL, '2026-08-03 12:00'),
  (7,  'Luna Díaz',       'luna@letraviva.cl',        '$2b$10$S3gfQpd0HCI9RBsMQpXnkelsZbs3LMTgTbRdlKjUjGcp.dZiMYAIy', 'https://i.pravatar.cc/150?u=luna', '2026-07-01 09:00'),
  (8,  'Tomás Pérez',     'tomas.perez@letraviva.cl', '$2b$10$S3gfQpd0HCI9RBsMQpXnkelsZbs3LMTgTbRdlKjUjGcp.dZiMYAIy', NULL, '2026-07-02 09:00'),
  (9,  'Sol Martínez',    'sol@letraviva.cl',         '$2b$10$S3gfQpd0HCI9RBsMQpXnkelsZbs3LMTgTbRdlKjUjGcp.dZiMYAIy', NULL, '2026-07-03 09:00'),
  (10, 'Andrea Fuentes',  'andrea@letraviva.cl',      '$2b$10$S3gfQpd0HCI9RBsMQpXnkelsZbs3LMTgTbRdlKjUjGcp.dZiMYAIy', NULL, '2026-07-04 09:00'),
  (11, 'Sara Nube',       'sara@letraviva.cl',        '$2b$10$S3gfQpd0HCI9RBsMQpXnkelsZbs3LMTgTbRdlKjUjGcp.dZiMYAIy', NULL, '2026-07-05 09:00'),
  (12, 'Nico Vera',       'nico@letraviva.cl',        '$2b$10$S3gfQpd0HCI9RBsMQpXnkelsZbs3LMTgTbRdlKjUjGcp.dZiMYAIy', NULL, '2026-07-06 09:00'),
  (13, 'Tomás Ríos',      'tomas.rios@letraviva.cl',  '$2b$10$S3gfQpd0HCI9RBsMQpXnkelsZbs3LMTgTbRdlKjUjGcp.dZiMYAIy', NULL, '2026-07-07 09:00'),
  (14, 'Julián Ortega',   'julian@letraviva.cl',      '$2b$10$S3gfQpd0HCI9RBsMQpXnkelsZbs3LMTgTbRdlKjUjGcp.dZiMYAIy', NULL, '2026-07-08 09:00'),
  (15, 'Elena Soto',      'elena@letraviva.cl',       '$2b$10$S3gfQpd0HCI9RBsMQpXnkelsZbs3LMTgTbRdlKjUjGcp.dZiMYAIy', NULL, '2026-07-09 09:00'),
  (16, 'Marco Leiva',     'marco@letraviva.cl',       '$2b$10$S3gfQpd0HCI9RBsMQpXnkelsZbs3LMTgTbRdlKjUjGcp.dZiMYAIy', NULL, '2026-07-10 09:00');

-- ---------- Historias ----------
-- total_reacciones y total_comentarios son los del frontend.
-- fecha_actualizacion = fecha del último capítulo publicado.
INSERT INTO historias (id, autor_id, titulo, resumen, portada_url, tipo, total_reacciones, total_comentarios, total_favoritos, total_lecturas, fecha_creacion, fecha_actualizacion) VALUES
  (1,  7,  'La última señal', 'Una voz imposible vuelve a llamar en mitad de la noche.', 'https://picsum.photos/seed/senal/800/400', 'novela', 91, 25, 40, 310, '2026-09-20 20:00', '2026-10-10 20:00'),
  (2,  8,  'Dos cafés después', 'Una cafetería, una libreta olvidada y dos desconocidos.', 'https://picsum.photos/seed/cafe/800/400', 'novela', 64, 12, 22, 180, '2026-09-27 15:30', '2026-09-27 15:30'),
  (3,  9,  'La casa de los espejos', 'Cada espejo muestra un recuerdo que nadie vivió.', 'https://picsum.photos/seed/espejos/800/400', 'corto', 40, 7, 15, 120, '2026-10-01 22:10', '2026-10-01 22:10'),
  (4,  10, 'El minuto prestado', 'Cada noche, a las 3:17, el reloj de Inés se detiene un minuto que nadie más vive.', 'https://picsum.photos/seed/minuto/800/400', 'novela', 58, 14, 25, 200, '2026-09-29 09:00', '2026-10-13 09:00'),
  (5,  11, 'El jardín de Europa', 'En una luna helada de Júpiter, una botánica intenta que florezca lo imposible.', 'https://picsum.photos/seed/jardin/800/400', 'novela', 107, 27, 48, 390, '2026-09-24 18:45', '2026-10-08 18:45'),
  (6,  12, 'Manual para domar dragones', 'Un aprendiz torpe, un dragón con miedo a las alturas y un manual lleno de errores.', 'https://picsum.photos/seed/dragones/800/400', 'novela', 83, 19, 35, 260, '2026-09-20 12:00', '2026-10-04 12:00'),
  (7,  13, 'Cartas que nunca envié', 'Poemas escritos para alguien que ya no está, guardados en un cajón durante diez años.', 'https://picsum.photos/seed/cartas/800/400', 'corto', 115, 22, 52, 410, '2026-09-29 21:15', '2026-09-29 21:15'),
  (8,  14, 'Lo que guarda el bosque', 'Tres amigos entran al bosque buscando a un perro perdido. Salen dos.', 'https://picsum.photos/seed/bosque/800/400', 'novela', 72, 16, 30, 230, '2026-09-08 17:00', '2026-09-22 17:00'),
  (9,  15, 'El faro sin luz', 'Un farero jubilado vuelve a encender la lámpara para guiar a un barco que no existe.', 'https://picsum.photos/seed/faro/800/400', 'corto', 36, 9, 12, 95, '2026-09-25 08:30', '2026-09-25 08:30'),
  (10, 16, 'El último tren', 'El tren de las 23:59 lleva pasajeros que no aparecen en ninguna lista.', 'https://picsum.photos/seed/tren/800/400', 'novela', 49, 11, 20, 150, '2026-10-01 23:59', '2026-10-15 23:59');

-- ---------- Géneros de cada historia ----------
-- 1 Romance · 2 Terror · 3 Fantasía · 4 Misterio · 5 Ciencia ficción
-- 6 Humor · 7 Drama · 8 Poesía · 9 Aventura · 10 Suspenso
INSERT INTO historia_generos (historia_id, genero_id) VALUES
  (1, 3), (1, 4),
  (2, 1),
  (3, 2),
  (4, 5), (4, 10),
  (5, 5), (5, 7),
  (6, 6), (6, 3),
  (7, 8), (7, 1),
  (8, 9), (8, 4),
  (9, 7), (9, 10),
  (10, 2), (10, 10);

-- ---------- Capítulos ----------
-- Mismos id del frontend. El último capítulo tiene la fecha de "ultimo_capitulo".
INSERT INTO capitulos (id, historia_id, numero, titulo, contenido, fecha_publicacion) VALUES
  (10,  1,  1, 'La señal', 'La radio llevaba seis inviernos en silencio...', '2026-09-20 20:00'),
  (11,  1,  2, 'La voz', 'Esa noche la voz dijo su nombre...', '2026-10-10 20:00'),
  (20,  2,  1, 'La libreta', 'Nadie deja una libreta así por accidente...', '2026-09-27 15:30'),
  (30,  3,  1, 'La casa de los espejos', 'El primer espejo estaba en la entrada...', '2026-10-01 22:10'),
  (40,  4,  1, 'Las 3:17', E'La primera vez pensó que el reloj se había roto.\n\nLa segunda vez se dio cuenta de que el mundo entero estaba quieto, menos ella.', '2026-09-29 09:00'),
  (41,  4,  2, 'Sesenta segundos', E'Un minuto alcanza para muchas cosas si nadie te mira.\n\nInés empezó a anotar todo lo que hacía en ese tiempo prestado.', '2026-10-06 09:00'),
  (42,  4,  3, 'Alguien más', 'Esa noche, en la calle detenida, otra persona caminaba hacia ella.', '2026-10-13 09:00'),
  (50,  5,  1, 'Bajo el hielo', E'La estación olía a metal y a tierra húmeda, la única tierra en millones de kilómetros.\n\nMara regaba las semillas como si fueran a escucharla.', '2026-09-24 18:45'),
  (51,  5,  2, 'El primer brote', 'Nadie le creyó cuando dijo que la planta se movía hacia la luz de Júpiter.', '2026-10-08 18:45'),
  (60,  6,  1, 'Regla número uno', E'Regla número uno: nunca mires a un dragón a los ojos.\n\nPablo lo miró a los ojos. El dragón se puso a llorar.', '2026-09-20 12:00'),
  (61,  6,  2, 'Regla número dos', 'Regla número dos: los dragones vuelan. Este, al parecer, no.', '2026-10-04 12:00'),
  (70,  7,  1, 'Cartas que nunca envié', E'Te escribí en la orilla de cada domingo,\ncon la tinta que me quedaba del miedo.\n\nNo te las mandé.\nPero todas llegaron.', '2026-09-29 21:15'),
  (80,  8,  1, 'El sendero', E'El mapa decía que el sendero terminaba en el río.\n\nEl sendero no estaba de acuerdo.', '2026-09-08 17:00'),
  (81,  8,  2, 'Las marcas', 'Alguien había tallado sus nombres en los árboles. Los tres nombres. Hace cien años.', '2026-09-22 17:00'),
  (90,  9,  1, 'El faro sin luz', E'Hacía veinte años que el faro estaba apagado.\n\nEsa noche, don Aurelio subió los ciento doce escalones y encendió la lámpara.', '2026-09-25 08:30'),
  (100, 10, 1, 'Andén 4', 'El andén 4 no aparecía en los carteles, pero Clara lo encontró igual.', '2026-10-01 23:59'),
  (101, 10, 2, 'El vagón vacío', 'Todos los asientos estaban ocupados. Nadie respiraba.', '2026-10-15 23:59');

-- ---------- Lecturas (en qué capítulo va cada lector) ----------
INSERT INTO lecturas (usuario_id, historia_id, capitulo_id, fecha_actualizacion) VALUES
  (1, 1, 11, '2026-10-11 22:00'),
  (1, 4, 41, '2026-10-12 23:00'),
  (2, 5, 50, '2026-10-09 20:00'),
  (3, 6, 61, '2026-10-05 19:00');

-- ---------- Reacciones (una por usuario y capítulo) ----------
INSERT INTO reacciones (usuario_id, capitulo_id, tipo, fecha) VALUES
  (1, 10, 'sorpresa', '2026-10-08 18:20'),
  (1, 11, 'fuego', '2026-10-11 22:05'),
  (2, 10, 'fuego', '2026-10-09 10:00'),
  (2, 50, 'llorar', '2026-10-09 20:10'),
  (3, 60, 'risa', '2026-10-05 18:00'),
  (3, 61, 'risa', '2026-10-05 19:05'),
  (1, 70, 'corazon_roto', '2026-10-02 21:00'),
  (2, 100, 'sorpresa', '2026-10-16 00:30'),
  (9, 11, 'fuego', '2026-10-11 08:00');

-- ---------- Comentarios ----------
INSERT INTO comentarios (usuario_id, historia_id, contenido, fecha) VALUES
  (9, 1, 'Ese final me dejó con la piel de gallina.', '2026-10-09 21:00'),
  (1, 1, '¡Necesito el capítulo 3!', '2026-10-11 22:10'),
  (2, 5, 'Me encanta cómo describes la estación.', '2026-10-09 20:15'),
  (3, 6, 'No paré de reírme con el dragón.', '2026-10-05 19:10'),
  (1, 7, 'Lloré con el último verso.', '2026-10-02 21:05');

-- ---------- Favoritos ----------
INSERT INTO favoritos (usuario_id, historia_id, fecha) VALUES
  (1, 1, '2026-10-11 22:15'),
  (1, 4, '2026-10-12 23:05'),
  (2, 5, '2026-10-09 20:20'),
  (3, 6, '2026-10-05 19:15');

-- ---------- Donaciones (modo prueba; nadie se dona a sí mismo) ----------
INSERT INTO donaciones (donante_id, escritor_id, historia_id, monto, fecha) VALUES
  (8, 7, 1, 2000, '2026-10-12 15:40'),
  (1, 11, 5, 1000, '2026-10-10 12:00'),
  (2, 13, 7, 3000, '2026-10-03 09:30');

-- ---------- Ajustar los contadores SERIAL ----------
-- Como insertamos los id a mano, avisamos a PostgreSQL desde qué número seguir.
-- Así, el próximo usuario registrado recibe el id 17 y no choca con uno existente.
SELECT setval('usuarios_id_seq', (SELECT MAX(id) FROM usuarios));
SELECT setval('historias_id_seq', (SELECT MAX(id) FROM historias));
SELECT setval('capitulos_id_seq', (SELECT MAX(id) FROM capitulos));
