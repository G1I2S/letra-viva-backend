-- =========================================================
-- Letra Viva · Estructura de la base de datos (letra_viva)
-- =========================================================

-- Borramos las tablas si ya existen (primero las que dependen de otras)
DROP TABLE IF EXISTS donaciones CASCADE;
DROP TABLE IF EXISTS favoritos CASCADE;
DROP TABLE IF EXISTS comentarios CASCADE;
DROP TABLE IF EXISTS reacciones CASCADE;
DROP TABLE IF EXISTS lecturas CASCADE;
DROP TABLE IF EXISTS capitulos CASCADE;
DROP TABLE IF EXISTS historia_generos CASCADE;
DROP TABLE IF EXISTS historias CASCADE;
DROP TABLE IF EXISTS generos CASCADE;
DROP TABLE IF EXISTS usuarios CASCADE;

-- Usuarios (escritores y lectores). password guarda el hash de bcrypt
CREATE TABLE usuarios (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  avatar_url VARCHAR(255),
  fecha_registro TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Géneros literarios
CREATE TABLE generos (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(50) NOT NULL UNIQUE
);

-- Historias: novelas por capítulos o relatos cortos
CREATE TABLE historias (
  id SERIAL PRIMARY KEY,
  autor_id INT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  titulo VARCHAR(150) NOT NULL,
  resumen TEXT,
  portada_url VARCHAR(255),
  tipo VARCHAR(10) NOT NULL CHECK (tipo IN ('novela', 'corto')),
  total_reacciones INT NOT NULL DEFAULT 0,
  total_comentarios INT NOT NULL DEFAULT 0,
  total_favoritos INT NOT NULL DEFAULT 0,
  total_lecturas INT NOT NULL DEFAULT 0,
  fecha_creacion TIMESTAMP NOT NULL DEFAULT NOW(),
  fecha_actualizacion TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Relación muchos a muchos entre historias y géneros
CREATE TABLE historia_generos (
  historia_id INT NOT NULL REFERENCES historias(id) ON DELETE CASCADE,
  genero_id INT NOT NULL REFERENCES generos(id) ON DELETE CASCADE,
  PRIMARY KEY (historia_id, genero_id)
);

-- Capítulos de cada historia (un relato corto tiene un solo capítulo)
CREATE TABLE capitulos (
  id SERIAL PRIMARY KEY,
  historia_id INT NOT NULL REFERENCES historias(id) ON DELETE CASCADE,
  numero INT NOT NULL,
  titulo VARCHAR(150) NOT NULL,
  contenido TEXT NOT NULL,
  fecha_publicacion TIMESTAMP NOT NULL DEFAULT NOW()
);

-- En qué capítulo va cada lector (un registro por usuario e historia)
CREATE TABLE lecturas (
  id SERIAL PRIMARY KEY,
  usuario_id INT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  historia_id INT NOT NULL REFERENCES historias(id) ON DELETE CASCADE,
  capitulo_id INT NOT NULL REFERENCES capitulos(id) ON DELETE CASCADE,
  fecha_actualizacion TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (usuario_id, historia_id)
);

-- Reacciones a capítulos (una por usuario y capítulo)
CREATE TABLE reacciones (
  id SERIAL PRIMARY KEY,
  usuario_id INT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  capitulo_id INT NOT NULL REFERENCES capitulos(id) ON DELETE CASCADE,
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('llorar', 'sorpresa', 'risa', 'fuego', 'corazon_roto')),
  fecha TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (usuario_id, capitulo_id)
);

-- Comentarios en historias
CREATE TABLE comentarios (
  id SERIAL PRIMARY KEY,
  usuario_id INT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  historia_id INT NOT NULL REFERENCES historias(id) ON DELETE CASCADE,
  contenido TEXT NOT NULL,
  fecha TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Historias favoritas de cada usuario
CREATE TABLE favoritos (
  usuario_id INT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  historia_id INT NOT NULL REFERENCES historias(id) ON DELETE CASCADE,
  fecha TIMESTAMP NOT NULL DEFAULT NOW(),
  PRIMARY KEY (usuario_id, historia_id)
);

-- Donaciones de lectores a escritores (modo prueba, sin pago real)
CREATE TABLE donaciones (
  id SERIAL PRIMARY KEY,
  donante_id INT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  escritor_id INT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  historia_id INT NOT NULL REFERENCES historias(id) ON DELETE CASCADE,
  monto INT NOT NULL,
  fecha TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Los 10 géneros de la plataforma (quedan con id 1 al 10)
INSERT INTO generos (nombre) VALUES
  ('Romance'),
  ('Terror'),
  ('Fantasía'),
  ('Misterio'),
  ('Ciencia ficción'),
  ('Humor'),
  ('Drama'),
  ('Poesía'),
  ('Aventura'),
  ('Suspenso');
