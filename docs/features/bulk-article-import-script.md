# Carga masiva de artículos por script

**Estado:** implementado en esta misma sesión.

## Contexto

El drag & drop de `.md` en `AdminArticleFormView.vue` ([`article-md-import.md`](article-md-import.md)) resuelve cargar un artículo a la vez, pero hay lotes grandes esperando publicación (carpeta de `.md` + carpeta de imágenes de portada aparte). Hacerlo uno por uno por el panel es la tarea que se pidió automatizar.

## Decisión: script de Node contra la API, no un endpoint nuevo

Se reutiliza la API HTTP existente (`POST /auth/login`, `GET /categories`, `POST /admin/media`, `POST /admin/articles`) desde un script standalone en `backend/scripts/bulk-import-articles.ts`, corrido con `ts-node` igual que `prisma/seed.ts`. Se descartó:

- **Escribir directo a la DB con Prisma**: se saltearía las validaciones del DTO, el `findOrCreate` de tags, y la subida a Cloudinary (que vive en `MediaService`, atado al `ConfigService` del backend). Pasar por la API es más lento pero ejercita el mismo camino que usa el panel — si el import funciona, el artículo va a verse exactamente igual que uno cargado a mano.
- **Un endpoint de import en lote**: hubiera significado exponer permanentemente en la API una operación de uso puntual (unas pocas corridas), con su propio DTO de "lote" y manejo de archivos múltiples en un solo request. Un script que un humano corre a mano desde su máquina, apuntando a la API que sea (local o producción), es más simple y no deja superficie nueva permanente en el backend.

## El parser de `.md` se porta, no se comparte

El parser ya existe en `frontend/src/utils/articleMarkdownImport.ts`, pero importarlo desde `backend/` cruzaría el límite del workspace de pnpm (son paquetes separados, `@nexoat/frontend` y `@nexoat/backend`) y además depende de tipos de Vue-adjacent (`ArticleFormPayload` de `@/types/admin`). Se portó una copia adaptada a `backend/scripts/lib/parseArticleMarkdown.ts`, con las mismas reglas de extracción (ver [`article-md-import.md`](article-md-import.md) para el detalle del formato) pero devolviendo directamente la forma del `CreateArticleDto`, sin los tipos de formulario del frontend.

**Riesgo aceptado:** si el formato de los `.md` cambia, hay que actualizar el parser en dos lugares. Se aceptó porque el formato lleva meses estable (un solo cambio documentado, el de fuentes/scope) y duplicar es más simple que armar un paquete compartido para una función de ~150 líneas usada en dos sitios muy distintos (Vue component vs. script Node).

## Emparejado artículo↔imagen

Por nombre de archivo base, sin importar extensión: `crisis-aula-at.md` con `crisis-aula-at.jpg`, `.jpeg`, `.png` o `.webp` (primera coincidencia encontrada, case-insensitive). Si un `.md` no tiene imagen con el mismo nombre base en la carpeta de portadas, el artículo se crea **sin** `coverImage` — no bloquea el resto del lote, se avisa al final en el resumen.

## Categorías: mismo criterio que el import individual

`temas` del `.md` se filtra contra `GET /categories` (slugs reales). Los `temas` que no matchean ninguna categoría existente se descartan de `categorySlugs` (no se inventan categorías) y se listan en el resumen. Si después de filtrar no queda **ninguna** categoría válida, el artículo se **salta entero** (no se crea) porque `categorySlugs` es obligatorio y no vacío en `CreateArticleDto` — se reporta como error, no como warning.

## Resiliencia de sesión y de ritmo (aprendido en la primera corrida real)

La primera corrida contra el lote completo (187 artículos) reveló dos problemas que no aparecen con lotes de prueba chicos:

- **El access token expira a los 15 min** (`ACCESS_TOKEN_TTL` en `auth.service.ts`) y el lote entero tarda más que eso — a mitad de camino empezaron a fallar artículos con `401 Unauthorized`, no por ningún problema de esos artículos puntuales.
- **El límite global de la API es 100 req/60s** (`ThrottlerModule`, `app.module.ts`) y el script no pausaba nada entre requests — con ~2 requests por artículo (subida de imagen + creación), en algún tramo se superó el límite y varios artículos fallaron con `429 Too Many Requests`.

Ninguno de los dos es un problema de contenido — son fallas recuperables del propio script. Se resolvió con `authedFetch()`, un wrapper único usado por la subida de imagen y la creación de artículo:

- **401** → re-loguea una vez con las mismas credenciales guardadas en memoria (`Session.token` es mutable) y reintenta la misma request con el token nuevo.
- **429** → espera según el header `Retry-After` si vino, si no backoff exponencial (1s, 2s, 4s, 8s, 16s), hasta 5 reintentos.
- **Pacing preventivo**: 400ms de pausa antes de cada request, para no depender solo de los reintentos.
- **Cortes de conexión** (`fetch` tirando una excepción tipo `ECONNRESET`, no una respuesta HTTP con status) también aparecieron corriendo contra el backend local durante ratos largos — mismo backoff exponencial que el 429, hasta 5 reintentos, capturando el `throw` de `fetch()` en vez de solo mirar `res.status`.

## Normalización de `nivel`/`audiencia` (aprendido en la primera corrida real)

Con ~200 archivos escritos a mano por distintas personas aparecieron variantes de tipeo que el import individual (un archivo, una persona revisando en el momento) no había necesitado tolerar: `nivel: básico` (con tilde, vs. `basico`), `audiencia: "Cuidadores / familias"` (espacios/barra en vez de guión) y `audiencia: publico-general` (valor inventado, no es ninguno de los tres reales).

Se agregó, solo en `backend/scripts/lib/parseArticleMarkdown.ts` (no en la versión del frontend — el import individual sigue exigiendo que el `.md` venga bien escrito, ahí lo revisa una persona en el momento):

- `normalizeToken()`: quita tildes, pasa a minúsculas, y convierte espacios/`/` a guión, antes de comparar contra los valores válidos de `nivel` y `audiencia`. Cubre variantes de tipeo automáticamente.
- `AUDIENCE_ALIASES`: mapeo manual para valores que no son una variante de tipeo sino una palabra distinta. Confirmado con el usuario: `publico-general` → `cuidadores-familiares`.

Cualquier valor resuelto por normalización o alias deja un aviso (`Nivel "X" normalizado a "Y"` / `Audiencia "X" normalizada a "Y"`) en el resumen, para que quede rastro de qué se tocó.

## Validaciones que hacen saltar un artículo (no abortan el lote completo)

Cada `.md` se procesa en su propio `try/catch`; un fallo no interrumpe los siguientes. Se salta con motivo reportado si:

- no tiene `titulo` en la metadata,
- no tiene ningún `tema` que matchee una categoría existente,
- `nivel` falta o no es `basico|intermedio|avanzado` (no hay valor por defecto razonable — se prefiere que el humano lo revise a inventar un nivel),
- `audiencia` falta o ningún valor matchea `cuidadores-familiares|profesionales|mixto`,
- la subida de la imagen a Cloudinary falla (se reintenta una vez; si vuelve a fallar, se sigue sin imagen y se avisa, **no** se saltea el artículo entero solo por la portada),
- la llamada a `POST /admin/articles` devuelve error (ej. slug duplicado — `409` si ya existe un artículo con ese slug).

## Publicación directa

Se pidió explícitamente que los artículos importados queden **publicados**, no en borrador — el script manda `status: "publicado"` en el DTO. `publishedAt` usa la `fecha` del `.md` si está presente; si no, el backend la completa con la fecha/hora actual al pasar a publicado (comportamiento ya existente de `ArticlesService`, sin cambios).

## Uso

```bash
# Contra el backend local (por defecto http://localhost:3001/v1)
pnpm --filter @nexoat/backend import:bulk -- \
  --articles "D:/ruta/a/Blog/Textos v2/revisados" \
  --images "D:/ruta/a/Blog/Portadas"

# Contra otra API (ej. producción, una vez validado en local)
pnpm --filter @nexoat/backend import:bulk -- \
  --articles "..." --images "..." --api https://api.nexoat.com/v1
```

Pide por variables de entorno (no por flag, para no dejarlas en el historial de la shell) `BULK_IMPORT_EMAIL` / `BULK_IMPORT_PASSWORD` — credenciales de un usuario `EDITOR` o superior. Si faltan, el script las pide interactivamente por stdin (contraseña sin eco).

Al terminar imprime un resumen: cuántos se crearon, cuántos se saltearon (con motivo), y cuántas portadas no se encontraron. No genera archivo de log — la salida de consola es el reporte; si el lote es grande conviene redirigir a un archivo (`... | tee import.log`).

## Dónde vive

| Archivo                                               | Qué hace                                                                    |
| ----------------------------------------------------- | --------------------------------------------------------------------------- |
| `backend/scripts/bulk-import-articles.ts` (nuevo)     | Orquesta: login, lee carpetas, parsea, empareja imagen, sube, crea, resume. |
| `backend/scripts/lib/parseArticleMarkdown.ts` (nuevo) | Copia adaptada del parser del `.md`, sin dependencias del frontend.         |
| `backend/package.json`                                | Nuevo script `import:bulk` → `ts-node scripts/bulk-import-articles.ts`.     |

No hay cambios de schema, de endpoints existentes, ni de frontend.

## Plan de verificación

1. Correr contra un backend local con 2-3 `.md` de prueba (uno completo, uno sin imagen correspondiente, uno con un `tema` inexistente) y confirmar en el resumen que: el primero se crea con portada, el segundo se crea sin portada avisando, el tercero se crea igual pero avisa la categoría descartada.
2. Correr con un `.md` sin `nivel` válido → confirmar que se saltea y aparece en el resumen de errores, sin afectar a los demás archivos del lote.
3. Confirmar en `/nexoat-admin/articulos` que los artículos creados están en estado "publicado" y muestran la portada correcta.
4. Correr el mismo lote una segunda vez → confirmar que los que ya existen (mismo slug) fallan con conflicto reportado, no duplican el artículo.
5. Repetir el mismo comando cambiando `--api` a `https://api.nexoat.com/v1` una vez validado en local.
