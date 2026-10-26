# Letra Viva · Backend
Servidor de Letra Viva. Se encarga del registro e inicio de sesión de los usuarios y guarda en PostgreSQL las historias, capítulos, reacciones, comentarios, favoritos y donaciones.

Proyecto final · Hito 3: Desarrollo Backend.

Frontend: https://letra-viva-frontend.vercel.app

## Instalación

```bash
git clone https://github.com/G1I2S/letra-viva-backend.git
cd letra-viva-backend
npm install
```

1. Crea la base de datos en PostgreSQL:
   ```sql
   CREATE DATABASE letra_viva;
   ```
2. Copia el archivo `.env.example`, renómbralo a `.env` y escribe tu contraseña de PostgreSQL.
3. Crea las tablas y carga los datos de prueba:
   ```bash
   npm run db:init
   ```
4. Levanta el servidor:
   ```bash
   npm run dev
   ```

La API queda en http://localhost:3000/api. Para comprobar que funciona, abre http://localhost:3000/api/estado.

## Rutas de la API

URL base: `http://localhost:3000/api`. Las rutas con 🔒 son privadas y necesitan el header `Authorization: Bearer <token>`.

El detalle de cada ruta (body y respuestas de ejemplo) está en el contrato: [docs/contrato-api.md](docs/contrato-api.md).

| Método | Ruta | Privada | Qué responde |
|---|---|---|---|
| POST | `/auth/registro` | | 201 · el usuario creado (`id`, `nombre`, `email`) |
| POST | `/auth/login` | | 200 · `token` y datos del `usuario` |
| GET | `/usuarios/me` | 🔒 | 200 · perfil del usuario con sus historias |
| PUT | `/usuarios/me` | 🔒 | 200 · perfil actualizado |
| GET | `/generos` | | 200 · lista de géneros |
| GET | `/historias` | | 200 · `pagina`, `total` y lista de historias (filtros opcionales) |
| GET | `/historias/:id` | | 200 · ficha de la historia con sus capítulos |
| POST | `/historias` | 🔒 | 201 · la historia creada |
| PUT | `/historias/:id` | 🔒 | 200 · la historia actualizada (solo el autor) |
| DELETE | `/historias/:id` | 🔒 | 204 · sin contenido (solo el autor) |
| GET | `/historias/:id/capitulos/:numero` | | 200 · el capítulo con sus reacciones |
| POST | `/historias/:id/capitulos` | 🔒 | 201 · el capítulo creado (solo el autor) |
| PUT | `/lecturas` | 🔒 | 200 · `historia_id`, `capitulo_id` y `numero` del capítulo en que va el lector |
| POST | `/capitulos/:id/reacciones` | 🔒 | 201 · la reacción y el conteo de cada emoción |
| DELETE | `/capitulos/:id/reacciones` | 🔒 | 204 · sin contenido |
| GET | `/historias/:id/comentarios` | | 200 · comentarios, del más nuevo al más antiguo |
| POST | `/historias/:id/comentarios` | 🔒 | 201 · el comentario creado |
| GET | `/favoritos` | 🔒 | 200 · favoritos con el capítulo en que va y el total de capítulos |
| POST | `/favoritos` | 🔒 | 201 · `historia_id` y `fecha` (409 si ya estaba) |
| DELETE | `/favoritos/:historia_id` | 🔒 | 204 · sin contenido |
| POST | `/donaciones` | 🔒 | 201 · la donación con `modo: "prueba"` (sin pago real) |
| GET | `/notificaciones` | 🔒 | 200 · donaciones, comentarios y reacciones recibidas (máximo 50) |

Errores: siempre con el formato `{ "error": "mensaje" }` (400 datos inválidos, 401 sin sesión, 403 sin permiso, 404 no existe, 409 dato repetido, 500 error del servidor).

## Tests

```bash
npm test
```

## Usuarios de prueba

Contraseña para todos: `letraviva123`

- `luna@letraviva.cl` (escritora)
- `valentina@letraviva.cl` (lectora)

## Tecnologías

Node.js, Express, PostgreSQL (pg), JWT, bcryptjs, CORS, Jest y Supertest.

## Equipo

- Gisela Astudillo · [@G1I2S](https://github.com/G1I2S)
- Sofía Maturana · [@SilverTke](https://github.com/SilverTke)
- Jorge Guzmán · [@JGuzGaj](https://github.com/JGuzGaj)
