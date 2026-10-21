# Letra Viva · Backend

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
