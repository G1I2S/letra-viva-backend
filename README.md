# Letra Viva · Backend

API REST de **Letra Viva**, una plataforma donde escritores publican novelas por capítulos o relatos cortos, y los lectores reaccionan, comentan, guardan favoritos y donan.

Proyecto final · Hito 3 (backend).

Frontend: https://letra-viva-frontend.vercel.app

## Tecnologías

- Node.js + Express 5
- PostgreSQL con `pg`
- Autenticación con JWT (`jsonwebtoken`) y contraseñas cifradas con `bcryptjs`
- `cors` y `dotenv`
- Tests con `jest` + `supertest`

## Instalación

1. Clona el repositorio y entra a la carpeta:
   ```bash
   git clone <url-del-repositorio>
   cd letra-viva-backend
   ```
2. Instala las dependencias:
   ```bash
   npm install
   ```
3. Crea la base de datos en PostgreSQL (desde psql o pgAdmin):
   ```sql
   CREATE DATABASE letra_viva;
   ```
4. Copia `.env.example` a `.env` y completa tus datos (contraseña de PostgreSQL y un `JWT_SECRET` largo):
   ```bash
   cp .env.example .env
   ```
5. Crea las tablas y carga los datos de prueba:
   ```bash
   npm run db:init
   ```
6. Levanta el servidor en modo desarrollo:
   ```bash
   npm run dev
   ```
   La API queda en `http://localhost:3000/api`. Puedes revisar que funciona en `http://localhost:3000/api/estado`.

### Usuarios de prueba

Todos los usuarios del seed tienen la contraseña `letraviva123`. Por ejemplo:

| Email | Rol |
|---|---|
| `luna@letraviva.cl` | Escritora de *La última señal* |
| `valentina@letraviva.cl` | Lectora (tiene lecturas, reacciones y favoritos) |

## Endpoints

🔒 = ruta privada. Hay que enviar el header `Authorization: Bearer <token>`.

| Método | Ruta | Descripción | Responsable |
|---|---|---|---|
| GET | `/api/estado` | Estado de la API y la base de datos | Gisela |
| POST | `/api/auth/registro` | Crear cuenta | Gisela |
| POST | `/api/auth/login` | Iniciar sesión (devuelve token) | Gisela |
| GET | `/api/usuarios/me` 🔒 | Ver mi perfil y mis historias | Gisela |
| PUT | `/api/usuarios/me` 🔒 | Editar nombre o avatar | Gisela |
| GET | `/api/generos` | Listar géneros | Jorge |
| GET | `/api/historias` | Listar historias con filtros | Jorge |
| GET | `/api/historias/:id` | Ficha de una historia | Jorge |
| POST | `/api/historias` 🔒 | Crear historia | Jorge |
| PUT | `/api/historias/:id` 🔒 | Editar historia (solo el autor) | Jorge |
| DELETE | `/api/historias/:id` 🔒 | Eliminar historia (solo el autor) | Jorge |
| GET | `/api/historias/:id/capitulos/:numero` | Leer un capítulo | Jorge |
| POST | `/api/historias/:id/capitulos` 🔒 | Publicar capítulo (solo el autor) | Jorge |
| PUT | `/api/lecturas` 🔒 | Guardar en qué capítulo voy | Sofía |
| POST | `/api/capitulos/:id/reacciones` 🔒 | Reaccionar a un capítulo | Sofía |
| DELETE | `/api/capitulos/:id/reacciones` 🔒 | Quitar mi reacción | Sofía |
| GET | `/api/historias/:id/comentarios` | Ver comentarios | Sofía |
| POST | `/api/historias/:id/comentarios` 🔒 | Comentar | Sofía |
| GET | `/api/favoritos` 🔒 | Mis favoritos | Sofía |
| POST | `/api/favoritos` 🔒 | Agregar a favoritos | Sofía |
| DELETE | `/api/favoritos/:historia_id` 🔒 | Quitar de favoritos | Sofía |
| POST | `/api/donaciones` 🔒 | Donar a un escritor (modo prueba) | Sofía |
| GET | `/api/notificaciones` 🔒 | Mis notificaciones | Sofía |

Los errores siempre tienen el formato `{ "error": "mensaje" }`:
400 datos inválidos · 401 sin token o token inválido · 403 sin permiso · 404 no existe · 409 dato repetido.

## Tests

Con la base de datos creada y el `.env` listo:

```bash
npm test
```

Los tests (`tests/auth.test.js`) revisan los códigos de estado de las rutas de estado, registro, login y perfil, en casos correctos y con errores. Crean un usuario temporal y lo borran al terminar.

## Thunder Client

En la raíz está `thunder-collection_LetraViva.json`. Para usarlo: en Thunder Client ve a **Collections → menú ☰ → Import** y elige el archivo. La petición *Login* guarda el token en la variable `{{token}}`, que usan las rutas de perfil.

## Equipo

- Gisela Astudillo ([@G1I2S](https://github.com/G1I2S)): base del proyecto, base de datos, autenticación y perfil
- Jorge Guzmán ([@JGuzGaj](https://github.com/JGuzGaj)): historias, capítulos y géneros
- Sofía Maturana ([@SilverTke](https://github.com/SilverTke)): interacciones (lecturas, reacciones, comentarios, favoritos, donaciones y notificaciones)
