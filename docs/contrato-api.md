# Letra Viva · Contrato de datos de la API REST

- **URL base:** `http://localhost:3000/api`
- **Formato:** todas las peticiones y respuestas usan JSON.
- 🔒 = ruta privada. Hay que enviar el token en el encabezado:
  `Authorization: Bearer <token>`

**Errores comunes (todas las rutas):**

| Código | Cuándo | Respuesta |
|---|---|---|
| 400 | Faltan datos o son inválidos | `{ "error": "El campo titulo es obligatorio" }` |
| 401 | No se envió token o es inválido | `{ "error": "Debes iniciar sesión" }` |
| 403 | El usuario no tiene permiso (ej. editar una historia ajena) | `{ "error": "No tienes permiso" }` |
| 404 | No existe el recurso | `{ "error": "Historia no encontrada" }` |
| 409 | Dato repetido (ej. correo ya registrado) | `{ "error": "El correo ya está registrado" }` |

---

## 1. Autenticación

### POST `/auth/registro`
Crea una cuenta nueva.

**Body**
```json
{ "nombre": "Gisela", "email": "gisela@ejemplo.com", "password": "miclave123" }
```
**Respuesta 201**
```json
{ "id": 1, "nombre": "Gisela", "email": "gisela@ejemplo.com" }
```

### POST `/auth/login`
Inicia sesión y devuelve el token.

**Body**
```json
{ "email": "gisela@ejemplo.com", "password": "miclave123" }
```
**Respuesta 200**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "usuario": { "id": 1, "nombre": "Gisela", "email": "gisela@ejemplo.com", "avatar_url": null }
}
```

---

## 2. Perfil

### GET `/usuarios/me` 🔒
**Respuesta 200**
```json
{
  "id": 1,
  "nombre": "Gisela",
  "email": "gisela@ejemplo.com",
  "avatar_url": "https://.../foto.jpg",
  "fecha_registro": "2026-10-12T15:00:00Z",
  "historias": [
    { "id": 3, "titulo": "La última señal", "portada_url": "https://.../portada.jpg", "tipo": "novela" }
  ]
}
```

### PUT `/usuarios/me` 🔒
**Body**
```json
{ "nombre": "Gisela A.", "avatar_url": "https://.../nueva-foto.jpg" }
```
**Respuesta 200** → el usuario actualizado (mismo formato que GET).

> El tema claro/oscuro se guarda en el navegador (localStorage), no en la API.

---

## 3. Géneros

### GET `/generos`
**Respuesta 200**
```json
[ { "id": 1, "nombre": "Romance" }, { "id": 2, "nombre": "Terror" } ]
```

---

## 4. Historias

### GET `/historias`
Sirve para Inicio y Explorar. Todos los parámetros son opcionales.

| Parámetro | Ejemplo | Qué hace |
|---|---|---|
| `tipo` | `novela` o `corto` | Pestañas de Explorar |
| `generos` | `1,3` | Filtro por géneros |
| `buscar` | `señal` | Busca por título o escritor |
| `orden` | `populares` o `recientes` | Carrusel "Más populares" / fila "Recientes" |
| `dias` | `30` | Solo historias actualizadas en los últimos N días ("Recientes") |
| `pagina` y `limite` | `1` y `10` | Paginación para la lista que sigue hacia abajo |

**Ejemplo:** `GET /historias?tipo=novela&generos=1,3&orden=populares&pagina=1&limite=10`

**Respuesta 200**
```json
{
  "pagina": 1,
  "total": 42,
  "historias": [
    {
      "id": 3,
      "titulo": "La última señal",
      "resumen": "A las 3:17 de la madrugada, la radio volvió a encenderse sola...",
      "portada_url": "https://.../portada.jpg",
      "tipo": "novela",
      "autor": { "id": 7, "nombre": "Luna Díaz" },
      "generos": ["Fantasía", "Misterio"],
      "total_reacciones": 91,
      "total_comentarios": 25,
      "ultimo_capitulo": { "numero": 3, "fecha_publicacion": "2026-10-07T10:00:00Z" }
    }
  ]
}
```

### GET `/historias/:id`
Ficha de la historia. Si se envía token, incluye datos del lector.

**Respuesta 200**
```json
{
  "id": 3,
  "titulo": "La última señal",
  "resumen": "A las 3:17 de la madrugada...",
  "portada_url": "https://.../portada.jpg",
  "tipo": "novela",
  "autor": { "id": 7, "nombre": "Luna Díaz", "avatar_url": "https://.../luna.jpg" },
  "generos": ["Fantasía", "Misterio"],
  "totales": { "reacciones": 91, "comentarios": 25, "favoritos": 40, "lecturas": 310 },
  "capitulos": [
    { "id": 10, "numero": 1, "titulo": "La señal", "fecha_publicacion": "2026-08-12T10:00:00Z" },
    { "id": 11, "numero": 2, "titulo": "La voz", "fecha_publicacion": "2026-09-12T10:00:00Z" }
  ],
  "es_favorito": true,
  "capitulo_actual": 2
}
```
> `es_favorito` y `capitulo_actual` solo vienen si hay sesión. Con `capitulo_actual` el botón dice "Continuar leyendo · Cap. 2"; si es `null`, dice "Empezar a leer".

### POST `/historias` 🔒
**Body**
```json
{
  "titulo": "La última señal",
  "resumen": "A las 3:17 de la madrugada...",
  "portada_url": "https://.../portada.jpg",
  "tipo": "novela",
  "generos": [3, 4]
}
```
**Respuesta 201** → la historia creada con su `id`.

### PUT `/historias/:id` 🔒 (solo el autor)
**Body:** los mismos campos de POST que se quieran cambiar. **Respuesta 200** → historia actualizada.

### DELETE `/historias/:id` 🔒 (solo el autor)
**Respuesta 204** (sin contenido).

---

## 5. Capítulos

### GET `/historias/:id/capitulos/:numero`
Lector de capítulo.

**Respuesta 200**
```json
{
  "id": 10,
  "historia": { "id": 3, "titulo": "La última señal", "autor": { "id": 7, "nombre": "Luna Díaz" } },
  "numero": 1,
  "total_capitulos": 3,
  "titulo": "La señal",
  "contenido": "La radio llevaba seis inviernos en silencio...",
  "anterior": null,
  "siguiente": 2,
  "reacciones": { "llorar": 24, "sorpresa": 18, "risa": 3, "fuego": 37, "corazon_roto": 9 },
  "mi_reaccion": "fuego"
}
```
> `mi_reaccion` solo viene si hay sesión.

### POST `/historias/:id/capitulos` 🔒 (solo el autor)
**Body**
```json
{ "titulo": "La voz", "contenido": "Texto del capítulo..." }
```
**Respuesta 201** → el capítulo creado (el `numero` lo asigna la API: siguiente número disponible).

---

## 6. Lecturas (en qué capítulo va el lector)

### PUT `/lecturas` 🔒
Se llama cada vez que el lector abre un capítulo. Crea o actualiza el registro.

**Body**
```json
{ "historia_id": 3, "capitulo_id": 11 }
```
**Respuesta 200**
```json
{ "historia_id": 3, "capitulo_id": 11, "numero": 2 }
```

---

## 7. Reacciones

### POST `/capitulos/:id/reacciones` 🔒
Si el usuario ya había reaccionado a ese capítulo, se reemplaza por la nueva emoción.

**Body**
```json
{ "tipo": "fuego" }
```
Valores válidos: `llorar`, `sorpresa`, `risa`, `fuego`, `corazon_roto`.

**Respuesta 201**
```json
{ "capitulo_id": 10, "tipo": "fuego", "reacciones": { "llorar": 24, "sorpresa": 18, "risa": 3, "fuego": 38, "corazon_roto": 9 } }
```

### DELETE `/capitulos/:id/reacciones` 🔒
Quita la reacción del usuario. **Respuesta 204.**

---

## 8. Comentarios

### GET `/historias/:id/comentarios`
**Respuesta 200**
```json
[
  {
    "id": 55,
    "usuario": { "id": 2, "nombre": "Sol M.", "avatar_url": null },
    "contenido": "Ese final me dejó con la piel de gallina.",
    "fecha": "2026-10-09T21:00:00Z"
  }
]
```

### POST `/historias/:id/comentarios` 🔒
**Body**
```json
{ "contenido": "¡Necesito el capítulo 4!" }
```
**Respuesta 201** → el comentario creado (mismo formato que en GET).

---

## 9. Favoritos

### GET `/favoritos` 🔒
**Respuesta 200**
```json
[
  {
    "historia": { "id": 3, "titulo": "La última señal", "portada_url": "https://.../portada.jpg" },
    "capitulo_actual": { "numero": 2, "titulo": "La voz" },
    "total_capitulos": 3
  }
]
```
> `capitulo_actual` sale de la tabla `lecturas`. Si nunca empezó a leerla, es `null`.

### POST `/favoritos` 🔒
**Body**
```json
{ "historia_id": 3 }
```
**Respuesta 201**
```json
{ "historia_id": 3, "fecha": "2026-10-12T15:30:00Z" }
```

### DELETE `/favoritos/:historia_id` 🔒
**Respuesta 204.**

---

## 10. Donaciones (modo prueba)

### POST `/donaciones` 🔒
**Body**
```json
{ "escritor_id": 7, "historia_id": 3, "monto": 2000 }
```
**Respuesta 201**
```json
{ "id": 18, "donante_id": 1, "escritor_id": 7, "historia_id": 3, "monto": 2000, "fecha": "2026-10-12T15:40:00Z", "modo": "prueba" }
```
> El `donante_id` sale del token, no del body. Un usuario no puede donarse a sí mismo (400).

---

## 11. Notificaciones

### GET `/notificaciones` 🔒
No tiene tabla propia: la API junta las reacciones, comentarios y donaciones que recibieron las historias del usuario, ordenadas de la más nueva a la más antigua.

**Respuesta 200**
```json
[
  { "tipo": "donacion", "usuario": "Tomás P.", "historia": "La última señal", "detalle": 2000, "fecha": "2026-10-12T15:40:00Z" },
  { "tipo": "comentario", "usuario": "Sol M.", "historia": "La última señal", "detalle": "Ese final me dejó con la piel de gallina.", "fecha": "2026-10-09T21:00:00Z" },
  { "tipo": "reaccion", "usuario": "Valentina R.", "historia": "La última señal", "detalle": "fuego", "fecha": "2026-10-08T18:20:00Z" }
]
```
