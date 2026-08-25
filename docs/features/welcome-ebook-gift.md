# Regalo de bienvenida (ebook a elección) al terminar el onboarding

**Estado:** Fase 1 (elegir entre PDFs subidos a mano) implementada y verificada. Fase 2 (generación al vuelo desde Markdown, con dedicatoria personalizada) documentada más abajo, **pendiente de implementar**. No hay contenido definitivo todavía — la tabla arranca vacía en producción y el paso queda invisible hasta que se carguen títulos reales desde `/nexoat-admin/regalo-bienvenida`. Ver "Notas de implementación" al final de la Fase 1 para los puntos donde ese código difiere de lo que describía la especificación original.

## Contexto

El onboarding post-registro (ver [`email-first-signup-and-onboarding.md`](email-first-signup-and-onboarding.md)) hoy termina en el paso 2 (términos + newsletter) o, para AT/Cuidador, en el paso 3 opcional de perfil profesional (`OnboardingView.vue`). El usuario pidió sumar un paso final: ofrecer un ebook de regalo a elección entre 2-3 títulos de temáticas distintas, y mandar el link de descarga por correo. Todavía no existen los PDFs reales — la idea es dejar todo el circuito (schema, backend, email, frontend, admin) armado y probado con datos ficticios, para que cuando lleguen los archivos definitivos alcance con subirlos desde el admin.

## Decisiones acordadas con el usuario

1. **Visibilidad del paso — por datos, no por rama de código.** El paso de regalo se muestra si y solo si existe al menos un `WelcomeEbook` con `active: true` **y** archivo cargado (`fileKey` no nulo). No hay ningún `if (import.meta.env.DEV)` en el código: en desarrollo el seed carga 2-3 ebooks de prueba con un PDF placeholder (texto plano renombrado `.pdf`, alcanza para probar el flujo de punta a punta), y en producción la tabla arranca vacía — el paso queda invisible hasta que vos subas los archivos reales desde `/nexoat-admin/regalo-bienvenida`. Evita una bifurcación de comportamiento entre entornos que habría que recordar sacar más adelante.
2. **Descarga: endpoint autenticado, no link firmado.** El email de bienvenida al regalo trae un link a `/mi-cuenta/regalo` (requiere sesión). Ahí un botón "Descargar" pega a `GET /v1/gifts/download` (autenticado), que valida que ese usuario reclamó un ebook y hace stream del archivo. Más simple que manejar expiración/regeneración de tokens firmados, y coherente con que ya existe sesión (el usuario recién se registró).

## Flujo

1. Al llegar al paso final del onboarding (después del paso 3 opcional, o después del 2 si el rol no tiene paso 3) **y solo si `GET /v1/gifts/available` devuelve al menos un título**, se muestra "Elegí tu regalo de bienvenida": 2-3 tarjetas (tapa, título, subtítulo, resumen breve), selección tipo radio — mismo patrón visual que el paso 1 (`onboarding__role-option`). El resumen es lo que le permite al usuario decidir sin haber leído el libro — no alcanza con el título solo.
2. Si no hay ebooks disponibles, el onboarding termina como hoy (paso 2 o 3) sin mostrar nada — no hay pantalla vacía ni mensaje de "próximamente".
3. Al confirmar la elección: `POST /v1/gifts/claim { ebookId }` crea un `EbookClaim` (un usuario reclama un solo ebook, `@@unique([userId])` — es un regalo de bienvenida, no un catálogo) y dispara el email vía `MailService`/Resend con el título elegido y el link a `/mi-cuenta/regalo`.
4. El usuario puede volver a `/mi-cuenta/regalo` cuando quiera (link también accesible desde `UserMenu.vue`, no hace falta que sea únicamente por email) y re-descargar sin límite.
5. Si el usuario no eligió ninguno (por ejemplo, cerró la pestaña en ese paso), `/mi-cuenta/regalo` le ofrece elegir ahí mismo — no se pierde la oportunidad solo por no completarla durante el onboarding.

## Cambios de schema (`backend/prisma/schema.prisma`)

```prisma
model WelcomeEbook {
  id                 String       @id @default(cuid())
  title              String
  subtitle           String? // ej. "Guía práctica para dar los primeros pasos" — opcional, no todos los títulos lo necesitan
  slug               String       @unique
  topic              String // etiqueta libre corta, ej. "Primeros pasos en AT" — no un enum, para no migrar cada vez que se sume una temática
  summary            String // resumen breve — es lo que lee el usuario en la tarjeta para decidir antes de elegir, no una descripción interna de catálogo
  coverImage         String? // Cloudinary, carpeta "ebook-covers" — mismo mecanismo que coverImage de Category/Article
  coverImagePublicId String?
  fileKey            String? // nombre de archivo dentro de storage/ebooks — null = título cargado pero sin PDF todavía, no cuenta para "disponible"
  fileName           String? // nombre original, para el header Content-Disposition de la descarga
  active             Boolean      @default(true)
  claims             EbookClaim[]
  createdAt          DateTime     @default(now())
  updatedAt          DateTime     @updatedAt

  @@map("welcome_ebooks")
}

model EbookClaim {
  id        String       @id @default(cuid())
  userId    String       @unique
  user      User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  ebookId   String
  ebook     WelcomeEbook @relation(fields: [ebookId], references: [id], onDelete: Restrict)
  claimedAt DateTime     @default(now())

  @@map("ebook_claims")
}
```

`onDelete: Restrict` en `EbookClaim.ebook` a propósito: no debería poder borrarse un `WelcomeEbook` que alguien ya reclamó (rompería su descarga silenciosamente) — el admin tiene que desactivarlo (`active: false`), no eliminarlo, si ya tuvo reclamos.

En `User`, agregar el lado inverso de la relación:

```prisma
model User {
  // ...campos existentes sin cambios...
  ebookClaim EbookClaim?
}
```

Migración sugerida: `add_welcome_ebook_gift`.

## Backend (`backend/src`)

Nuevo módulo `gifts/` (nombre corto y genérico a propósito — si en el futuro el "regalo" no es siempre un ebook, no hay que rebautizar el módulo):

| Endpoint                                   | Rol                          | Qué hace                                                                                                                                                                                                        |
| ------------------------------------------ | ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /gifts/available`                     | autenticado                  | Lista los `WelcomeEbook` con `active: true` y `fileKey` no nulo (id, title, subtitle, slug, topic, summary, coverImage) — nunca expone `fileKey`.                                                               |
| `GET /gifts/my-claim`                      | autenticado                  | El `EbookClaim` del usuario actual con su ebook, o `null`. Alimenta `/mi-cuenta/regalo`.                                                                                                                        |
| `POST /gifts/claim`                        | autenticado                  | `{ ebookId }` → crea el `EbookClaim` (idempotente: si ya existe uno, devuelve 409) y llama `MailService` para el correo.                                                                                        |
| `GET /gifts/download`                      | autenticado                  | Busca el claim del usuario, hace stream de `storage/ebooks/{fileKey}` con `Content-Disposition: attachment; filename="{fileName}"`. 404 si no reclamó ninguno.                                                  |
| `GET /admin/gifts` / `POST` / `PATCH /:id` | `@Roles(ADMIN, SUPER_ADMIN)` | CRUD de `WelcomeEbook`: título, subtítulo, slug, temática, resumen y activo/inactivo. Reutiliza `media.service.ts` para la tapa (carpeta `ebook-covers`, igual que `categories`/`articles`).                    |
| `POST /admin/gifts/:id/file`               | `@Roles(ADMIN, SUPER_ADMIN)` | Sube el PDF: valida `application/pdf`, tamaño máximo (ver más abajo), lo guarda en `storage/ebooks/` con nombre = `{id}.pdf` (evita colisiones y no depende del nombre original), y setea `fileKey`/`fileName`. |

**Storage del PDF — no Cloudinary.** Cloudinary en este proyecto está configurado para imágenes (`ALLOWED_IMAGE_MIME_TYPES`, transformaciones de ancho — ver `backend/src/media/media.service.ts`) y las tapas de ebook sí van ahí, pero el PDF en sí queda en disco del backend, mismo patrón que `backup.service.ts`: directorio `storage/ebooks` relativo a `process.cwd()`, override por `EBOOKS_DIR` si hace falta. Motivo: el archivo se sirve solo a través de `GET /gifts/download` (que valida el claim), nunca por URL directa — subirlo a Cloudinary obligaría a manejar su modo "raw" + entrega privada firmada para lograr lo mismo que ya da gratis servirlo nosotros. Límite de tamaño: `MAX_EBOOK_SIZE_BYTES = 25 * 1024 * 1024` (25 MB, generoso para un ebook con imágenes livianas) — constante en `gifts.service.ts`, mismo criterio que `MAX_IMAGE_SIZE_BYTES` en media.

`mail/templates/welcome-gift.template.ts` (nuevo, mismo estilo que `welcome.template.ts`): asunto tipo "Tu regalo de bienvenida está listo 🎁", cuerpo con el título elegido y un botón al link de `/mi-cuenta/regalo`.

## Frontend (`frontend/src`)

| Archivo                                  | Qué hace                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `services/gifts.api.ts` (nuevo)          | `getAvailableGifts()`, `getMyClaim()`, `claimGift(ebookId)` — mismo patrón que `services/onboarding.api.ts`.                                                                                                                                                                                                                                                                                                             |
| `views/OnboardingView.vue`               | Nuevo paso final (4, o 3 si el rol no pasa por el paso profesional): se salta directo a `onFinish()` si `getAvailableGifts()` devuelve `[]`. Tarjetas reutilizan la clase `.onboarding__role-option`.                                                                                                                                                                                                                    |
| `views/ProfileGiftView.vue` (nuevo)      | Ruta `/mi-cuenta/regalo`. Si hay claim: título + botón "Descargar" (`GET /gifts/download` vía `fetch` con blob, igual que cualquier descarga autenticada — no un `<a href>` plano, porque necesita el header `Authorization`). Si no hay claim: mismas tarjetas de elección del onboarding.                                                                                                                              |
| `components/ui/UserMenu.vue`             | Nuevo ítem "Tu regalo de bienvenida" (glyph `🎁`) en el mismo grupo que "Artículos guardados"/"Historial", enlazando a `/mi-cuenta/regalo`. Solo si `getAvailableGifts()` no está vacío, para no mostrar un ítem muerto mientras no haya PDFs en producción (mismo criterio de visibilidad por datos que en el onboarding).                                                                                              |
| `views/admin/AdminGiftsView.vue` (nuevo) | CRUD de `WelcomeEbook`: formulario con título, subtítulo, temática, resumen (textarea), subida de tapa (reutiliza el mismo componente de upload que `AdminCategoryFormView.vue`) y subida del PDF (input `type="file" accept="application/pdf"`) — los 4 primeros campos son justamente lo que el usuario lee en la tarjeta antes de elegir, así que quedan editables desde el arranque aunque el PDF se cargue después. |
| `router/index.ts`                        | Agregar `/mi-cuenta/regalo` (autenticado, mismo guard que `/mi-cuenta/perfil`) y `/nexoat-admin/regalo-bienvenida` (`@Roles(ADMIN, SUPER_ADMIN)`, lazy-loaded).                                                                                                                                                                                                                                                          |

## Semilla de desarrollo (`backend/prisma/seed.ts`)

Se agregan 3 `WelcomeEbook` de prueba (idempotente, mismo patrón `upsert` que el resto del seed), cada uno con título, subtítulo y resumen ficticios pero realistas — para poder probar que la tarjeta se lee bien y no solo que el campo existe. Ej.: _"Primeros pasos en el Acompañamiento Terapéutico"_ / _"Guía práctica para tu primer año de trabajo"_, _"Cuidar sin agotarse"_ / _"Herramientas concretas para cuidadores familiares"_, _"Neurodiversidad en el día a día"_ / _"Cómo acompañar sin patologizar"_. `fileKey` apunta a un PDF placeholder de un párrafo generado por el propio seed (no versionado en git, se crea en `storage/ebooks/` la primera vez que corre) — alcanza para probar la descarga real sin depender de tener contenido definitivo. En producción el seed **no** corre estas filas si `NODE_ENV=production` y no hay `SEED_WELCOME_EBOOKS=true` explícito, para no ensuciar la tabla con datos ficticios en el sitio real.

## Variables de entorno nuevas

```env
# Regalo de bienvenida — directorio de PDFs, igual criterio que BACKUP_DIR
EBOOKS_DIR=
```

Opcional — si no se setea, cae a `storage/ebooks` relativo al `cwd` del proceso, igual que `backup.service.ts`.

## Docker

`docker-compose.prod.yml` no monta ningún volumen para `storage/` del backend hoy (ni siquiera para los backups) — los archivos se pierden en cada rebuild del contenedor. Como el PDF del regalo sí necesita sobrevivir a un deploy (no es un archivo descartable como un backup manual), se agrega:

```yaml
backend:
  volumes:
    - backend_storage:/app/storage
# ...
volumes:
  backend_storage:
```

Esto de paso corrige la misma falta de persistencia para `storage/backups` — no era el objetivo de este documento, pero comparten directorio raíz y el volumen los cubre a los dos sin trabajo extra.

## Plan de verificación (al implementar)

1. `pnpm --filter @nexoat/backend db:migrate` + `db:seed` → confirmar en Prisma Studio los 3 `WelcomeEbook` de prueba con `fileKey` seteado.
2. `pnpm --filter @nexoat/backend test` — cubrir `gifts.service` (claim único por usuario, 409 en segundo intento, download 404 sin claim).
3. Registrar un usuario nuevo de punta a punta, llegar al paso de regalo en el onboarding, elegir un título, confirmar que llega el correo (log de Resend o bandeja real) y que el link funciona.
4. Entrar a `/mi-cuenta/regalo` sin haber elegido (otro usuario de prueba) y confirmar que ofrece elegir ahí.
5. Como `ADMIN`, subir un ebook nuevo sin PDF desde `/nexoat-admin/regalo-bienvenida` y confirmar que **no** aparece en el onboarding de un usuario nuevo hasta subirle el archivo.
6. `pnpm --filter @nexoat/frontend type-check` + `pnpm lint` limpios.
7. Confirmar que con la tabla vacía (estado real de producción hasta que subas los PDFs definitivos) el onboarding no muestra el paso ni `UserMenu.vue` muestra el ítem — cero rastro visible del feature hasta que actives el primer ebook.

Los 7 puntos se verificaron a mano contra el backend real (curl + navegador): seed con los 3 títulos y PDF placeholder, claim único por usuario (409 en el segundo intento), descarga autenticada con `Content-Disposition` correcto, onboarding completo con un usuario nuevo (paso "3 de 3" con Familiar/Otro, gift picker con los 3 títulos y sus resúmenes), y edición/PATCH desde `/nexoat-admin/regalo-bienvenida` reflejada en `GET /admin/gifts`. `type-check` y `lint` de ambos paquetes, limpios (solo warnings preexistentes no relacionados).

## Notas de implementación

Puntos donde el código terminó distinto de lo que dice la especificación de arriba, y por qué:

- **La tapa no tiene un endpoint dedicado (`uploadCover`).** El diseño original proponía que `GiftsService` llamara a `MediaService` directamente. Se cambió al mismo contrato que `UpdateCategoryDto`/`AdminCategoriesView.vue`: el frontend sube la imagen contra el endpoint genérico `POST /admin/media?folder=ebook-covers` y manda la URL/publicId resultantes en el `PATCH /admin/gifts/:id` (`coverImage`/`coverImagePublicId`, `''` para limpiar). Reutiliza código ya probado en vez de duplicar la lógica de subida/borrado de Cloudinary.
- **`summary`, no `description`.** El campo Prisma se llamó `summary` desde el principio de esta versión del documento (ver historial de la conversación) — se deja la nota acá porque en un borrador intermedio se lo mencionó como `description`; el nombre final y consistente en schema/DTOs/frontend es `summary`.
- **Sin endpoint de borrado total (`DELETE /admin/gifts/:id`).** Tal como se decidió ("el admin desactiva, no elimina"), no se expuso ningún endpoint que borre un `WelcomeEbook` — solo `active: false` vía `PATCH`. Si hace falta borrar un título que nunca tuvo reclamos, hoy requiere acceso directo a la base.
- **`docker-compose.prod.yml` gana un volumen `backend_storage`** que no tenía (ni siquiera para `storage/backups`, que hasta ahora no persistía entre rebuilds). No estaba en el alcance original de este documento, pero era necesario para que el PDF sobreviva a un deploy — y de paso corrige la misma falta para los respaldos.
- **`GiftPicker.vue`** (`frontend/src/components/gifts/`) no estaba en la lista de archivos a crear — se extrajo como componente compartido entre `OnboardingView.vue` y `ProfileGiftView.vue` en vez de duplicar el markup de las tarjetas de selección en los dos lugares.
- **Orden de pasos del onboarding dinámico, no fijo.** `OnboardingView.vue` pasó de `step: 1 | 2 | 3` a un `stepOrder` computado (`['role', 'terms', 'professional'?, 'gift'?]`) porque tanto el paso profesional como el de regalo son condicionales de forma independiente — con números de paso fijos, agregar el regalo como "paso 4" rompía el caso de un rol sin perfil profesional (que antes terminaba en el paso 2, no en el 3).

---

## Fase 2: generación al vuelo con dedicatoria personalizada (Gotenberg)

**Estado:** implementado y verificado. Motivada por: en vez de subir un PDF terminado a mano, cargar el contenido en Markdown (mismo pipeline que ya usan los artículos) y armar el PDF en el momento en que el usuario reclama su regalo — con una dedicatoria a su nombre. El mismo contenido queda listo para reusarse el día que exista una tienda de ebooks (ver "Reuso futuro: tienda de ebooks" más abajo).

### Decisiones acordadas con el usuario

3. **Motor de render: Gotenberg, no Puppeteer embebido ni pdf-lib para maquetar.** Gotenberg es un servicio HTTP aparte (Chromium headless por detrás) que convierte HTML→PDF — permite reusar CSS para la portada/dedicatoria/contenido sin escribir maquetación a mano, y sin sumarle Chromium a la imagen Docker del propio backend. Corre como contenedor propio (`gotenberg/gotenberg:8`), sin estado — no necesita volumen. `pdf-lib` sí se terminó usando, pero solo para **unir** dos PDFs ya generados (ver "Arquitectura: dos PDFs, no uno" más abajo) — no para maquetar contenido.
4. **Ambos modos de carga conviven.** Un `WelcomeEbook` tiene **o** `content` (Markdown, se genera con dedicatoria al reclamar) **o** `fileKey` (PDF subido a mano de la Fase 1, se sirve tal cual — sin personalizar). Da flexibilidad si algún título ya viene terminado de otro lado y no vale la pena pasarlo a Markdown.
5. **El QR a la tienda queda con el layout listo pero apagado hasta que la tienda exista.** Un QR a una página que todavía no existe es peor que no tener QR, en un PDF que la persona se guarda. Se arma el diseño (última página del libro) desde el principio, pero solo se activa cuando `WelcomeEbook.storeUrl` esté seteado — visibilidad por datos, mismo criterio que el resto de la funcionalidad.
6. **Estructura de páginas y tamaño, a partir de un PDF de referencia real del usuario** (ver "Estructura del libro" abajo): A5, portada a página completa sin texto superpuesto, ficha con aviso legal en página aparte de la dedicatoria, índice con números de página reales, y los capítulos arrancando siempre en página impar (convención editorial tomada de un manual de maquetación de Bubook que el usuario compartió) — adaptada a un ebook digital, sin las páginas de cortesía en blanco que ese mismo manual recomienda para una edición impresa.

### Estructura del libro

Tamaño **A5** (148×210mm — `BOOK_PAPER_WIDTH_IN`/`BOOK_PAPER_HEIGHT_IN` en `ebook-pdf.template.ts`), fácil de leer incluso en pantalla chica. Páginas, en orden:

1. **Portada** — `coverImage` a página completa, sin ningún texto superpuesto (el arte ya lo trae, según mostró el PDF de referencia). Sin tapa cargada, cae a un fallback tipográfico simple (título/subtítulo sobre un fondo liso) para poder probar el resto del circuito igual.
2. **Ficha** — título repetido, "NexoAT — Textos para acompañar", "Primera edición digital — {año}", `nexoat.com`, y un aviso legal fijo (mismo texto en todas las copias).
3. **Dedicatoria** — nombre y email del usuario que reclama el regalo. Separada de la ficha a propósito: la ficha es boilerplate idéntico en todas las copias, la dedicatoria es lo único genuinamente personal.
4. **Índice** — título de cada capítulo (un `## ` del Markdown) con línea punteada hasta su número de página real (ver "Índice con números reales" más abajo).
5. **Capítulos** — cada uno arranca en página nueva, con el primer `> pullquote` inmediatamente debajo del `##` renderizado aparte (fondo salvia claro), encabezado repetido con el título del libro, pie con `nexoat.com · N` (numeración propia, arranca en 1 en el primer capítulo — no cuenta portada/ficha/dedicatoria/índice).
6. **QR opcional** — solo si `storeUrl` está seteado.

Los capítulos siempre arrancan en página impar (2, 4, dedicatoria, índice = 4 páginas de frente → capítulo 1 en la página 5): si el frente mide una cantidad impar de páginas, se agrega una hoja en blanco antes del capítulo 1 y se corrige el índice — ver "Arquitectura: dos PDFs, no uno".

### Arquitectura: dos PDFs, no uno

El diseño original de este documento proponía un único HTML con todo el libro, más un pie de página que "restara" las páginas del frente vía un `<script>` dentro de la plantilla de pie de Gotenberg. **No funciona**: se probó a mano contra Gotenberg real y Chromium no ejecuta `<script>` dentro de las plantillas de encabezado/pie (solo reemplaza estáticamente clases como `.pageNumber`/`.totalPages` con el número, antes de imprimir — ningún JS corre encima). Tampoco alcanza con `.pageNumber` a secas, porque numera _todas_ las páginas del documento (portada incluida), y acá el frente no debe llevar numeración.

La solución fue separar el frente y el contenido en **dos PDFs independientes** que se unen con `pdf-lib` al final:

1. **`buildContentHtml()`** — solo los capítulos + QR, con `header.html`/`footer.html` propios. Como es su propio documento, el `.pageNumber` nativo de Chromium ya arranca solo en 1 — sin ningún cálculo de nuestro lado.
2. **`buildFrontMatterHtml()`** — portada/ficha/dedicatoria/índice, **sin** header/footer.
3. `mergePdfs([frontBuffer, contentBuffer])` (`pdf-merge.ts`) concatena los dos con `pdf-lib`.

Esto además simplificó el índice: como el contenido es su propio documento, "en qué página cae el capítulo N" es directamente el número que ya va a aparecer impreso en su pie — no hace falta ningún offset.

### Índice con números reales

Se resuelve en dos pasadas, pero ahora acotadas al contenido (no a todo el libro):

1. Se renderiza `buildContentHtml()` una vez.
2. `locateChapterPages()` (`pdf-page-index.ts`, vía `pdf-parse`) busca en qué página del PDF de contenido aparece cada título de capítulo — con matching de **palabra completa**, no de substring: un capítulo corto como "Referencias" matcheaba como parte de "prefer**encias**" en el cuerpo de otro capítulo antes de este fix, dándole una página incorrecta.
3. Se renderiza `buildFrontMatterHtml()` con esos números ya puestos en el índice — esa es la única pasada que hace falta para el frente (no hay una "pasada de medición" del frente en sí).
4. Si el frente da una cantidad impar de páginas, se vuelve a renderizar con una hoja en blanco de más (ver "Estructura del libro") y se suma 1 a cada número del índice.

### Backend — `gifts/` (archivos nuevos de esta fase)

- **`ebook-pdf.template.ts`** — `buildFrontMatterHtml()`, `buildContentHtml()`, `buildContentHeaderHtml()`, `buildContentFooterHtml()`. HTML standalone con `<style>` embebido — no reusa las plantillas de `mail/templates/` (esas son para clientes de correo, no para un motor de PDF con Chromium detrás).
- **`markdown-book.ts`** — `parseBookChapters()`: separa el Markdown por `## ` en capítulos, y de cada uno extrae el primer `> pullquote` inmediato (si existe) para renderizarlo aparte del resto del cuerpo.
- **`pdf-render.service.ts`** (`PdfRenderService`) — cliente de Gotenberg. `render(html, options)` — `options` incluye `headerHtml`/`footerHtml`/`marginTop`/`marginBottom`/`paperWidth`/`paperHeight`, todos opcionales. Nunca lanza: sin `GOTENBERG_URL` o si Gotenberg no responde, devuelve `null` (mismo criterio que `MailService` con `RESEND_API_KEY` ausente).
- **`pdf-page-index.ts`** — `locateChapterPages()`, con el matching de palabra completa descrito arriba.
- **`pdf-merge.ts`** — `mergePdfs()` (concatena PDFs con `pdf-lib`), `countPdfPages()`, y `trimTrailingBlankPage()` (ver nota de implementación sobre páginas en blanco espurias).
- **QR:** paquete `qrcode` (Node, sin red) genera un data URI PNG a partir de `storeUrl` — se embebe directo en el `<img>` del HTML de contenido, Gotenberg no necesita salir a buscar nada.
- **Reintentar una generación fallida:** `POST /admin/gifts/claims/:claimId/regenerate` — regenera el PDF de un claim puntual, para el caso de que Gotenberg haya estado caído al momento del `claim()` original. No se dispara solo.
- **`storage/ebooks/generated/`** usa el mismo volumen `backend_storage` que ya existe (Docker) — no hace falta uno nuevo, es un subdirectorio de `storage/`.

### Docker

Nuevo servicio, sin volumen (stateless):

```yaml
gotenberg:
  image: gotenberg/gotenberg:8
  restart: unless-stopped
  # sin puerto publicado al host — solo el backend le habla por la red interna
```

`GOTENBERG_URL=http://gotenberg:3000` en `docker-compose.prod.yml`/`.dev.yml`; en desarrollo local sin Docker, apuntar a un Gotenberg corriendo aparte o directamente no setear la variable — `GiftsService` debería tratar `GOTENBERG_URL` ausente igual que `MailService` trata `RESEND_API_KEY` ausente: no explota, loguea que la generación está desactivada, y el ebook queda como si no tuviera `content` (cae al `fileKey` si lo tiene, o no aparece disponible si no tiene ninguno de los dos).

### Frontend — `AdminGiftsView.vue`

Se agrega una sección "Contenido (Markdown)" por ebook: textarea + preview en vivo con `marked`+`dompurify` y la clase `.prose` (mismo componente/patrón que `AdminArticleFormView.vue`), y un campo `storeUrl` (opcional, con nota de que activa el QR de la última página). La sección de subida de PDF de la Fase 1 se mantiene tal cual, debajo, como alternativa.

### Reuso futuro: tienda de ebooks

Cuando exista la venta: mismo `WelcomeEbook` (quizás renombrado o con un modelo hermano que comparta `content`/`coverImage`/render) más `priceCents`/`isForSale`. Una compra generaría su propio `EbookClaim`-como (o un modelo `EbookPurchase` separado, a decidir cuando llegue) con su propio PDF personalizado — mismo `PdfRenderService`, mismo pipeline de dedicatoria (ahí sí tendría sentido, "Comprado por ‹nombre›" en vez de "Regalo de bienvenida para ‹nombre›"). No se diseña en detalle acá porque depende de decisiones que todavía no están tomadas (pasarela de pago, si el catálogo es el mismo modelo o uno nuevo) — se deja como nota para no perder el hilo cuando llegue esa etapa.

### Plan de verificación

1. Levantar Gotenberg local (`docker-compose -f docker-compose.dev.yml up -d gotenberg`, puerto 3002) y confirmar `GET http://localhost:3002/health`.
2. Cargar `content` Markdown real (los 3 títulos de la semilla de desarrollo, ya escritos siguiendo la convención `## Capítulo` + `> pullquote`) y una tapa.
3. Reclamarlo con un usuario de prueba → confirmar que `EbookClaim.generatedFileKey` queda seteado y que `GET /gifts/download` devuelve un PDF real con la estructura completa (portada, ficha, dedicatoria, índice, capítulos, pie con numeración).
4. Extraer el texto del PDF resultante (`pdftotext -layout`) y confirmar: cada entrada del índice apunta a la página donde efectivamente arranca ese capítulo (mismo número que su propio pie de página), el capítulo 1 cae en página impar, y no hay contenido corrido ni acentos rotos.
5. Apagar Gotenberg a propósito y reclamar con otro usuario → confirmar que el claim se crea igual, sin `generatedFileKey`, que `GET /gifts/download` da 404 con un mensaje claro, y que `POST /admin/gifts/claims/:claimId/regenerate` lo resuelve al reiniciar Gotenberg.
6. Setear `storeUrl` en un ebook y confirmar que el PDF generado trae la página final con el QR apuntando ahí; sin `storeUrl`, confirmar que esa página no aparece.
7. Confirmar que un ebook con `fileKey` (sin `content`) sigue funcionando exactamente como en la Fase 1 — sin esta fase tocarle el comportamiento.

Los 7 puntos se verificaron a mano contra Gotenberg real, con el contenido real ya cargado en desarrollo (el libro _"Cuando las palabras no alcanzan"_, 12 capítulos): PDF de 38 páginas (4 de frente + 34 de contenido), índice con los 12 números reales verificados uno por uno contra el pie de página de su propio capítulo (`pdftotext`), capítulo 1 en página impar (5), resiliencia con Gotenberg caído (claim igual se crea, 404 amigable, `regenerate` lo resuelve). `type-check` y `lint` de ambos paquetes, limpios.

## Notas de implementación (Fase 2)

- **Sin sanitizar el HTML del Markdown en el backend.** El HTML que arma `ebook-pdf.template.ts` para mandarle a Gotenberg no pasa por `dompurify` — mismo nivel de confianza que `Article.content` (contenido escrito por ADMIN/SUPER_ADMIN, gateado por `RolesGuard`, nunca por un usuario público). El único riesgo teórico es que un admin se autoataque con su propio PDF, no una superficie de XSS contra terceros.
- **Fuentes: Georgia/Arial, no Fraunces/Karla embebidas.** Mismas fuentes de sistema que ya usan las plantillas de `mail/templates/` — coherente con un problema que el proyecto ya resolvió así una vez, evita el peso/mantenimiento de archivos de fuente embebidos, y de paso esquiva un problema real: el contenedor de Gotenberg (Linux) no tiene Georgia/Times New Roman instaladas, así que de cualquier forma cae a una fuente serif sustituta del sistema — sería fuente perdida embeberlas solo para que Chromium las ignore.
- **Encabezado/pie sin JS — dos PDFs separados en vez de uno con numeración "restada".** Ver "Arquitectura: dos PDFs, no uno" arriba — el intento original con un `<script>` leyendo `.pageNumber` dentro de la plantilla de pie de Gotenberg no funciona porque Chromium no ejecuta scripts ahí (se probó a mano contra la API real antes de descartarlo).
- **Página en blanco sobrante — recorte defensivo, no una causa puntual identificada.** Chromium a veces agrega una página casi vacía al final de un documento cuando el último elemento desborda por unos pocos píxeles (margen/padding de un párrafo o cita) — `trimTrailingBlankPage()` la detecta (vía `pdf-parse`, sin texto extraíble) y la descarta, tanto en el PDF de contenido como en el de frente, antes de contar páginas para la convención de "capítulo en impar". Ojo al depurar esto con `pdftotext | split('\f')` a mano: `pdftotext` agrega un form-feed también _después_ de la última página, así que un split ingenuo cuenta una página fantasma de más — usar `pdf-lib`/`pdf-parse` (como hace el propio código) o descartar el último elemento vacío del split.
- **Matching de capítulo por palabra completa, no substring.** `locateChapterPages()` usaba `String.includes()` — un capítulo titulado "Referencias" matcheaba como parte de "prefer**encias**" en el cuerpo de otro capítulo, dándole una página del índice completamente equivocada. `includesWholeWord()` en `pdf-page-index.ts` valida que el carácter inmediatamente antes/después del match no sea una letra.
- **`generatedFileKey` incluye el `userId`, no solo el `claimId`** (`{ebookId}-{userId}.pdf`) — más fácil de inspeccionar a mano en `storage/ebooks/generated/` durante debugging; `EbookClaim.userId` ya es único, sin colisión posible.
- **Sin UI de administración de claims/regenerar.** El endpoint existe y funciona (probado por API), pero no hay pantalla admin que liste claims sin `generatedFileKey` para encontrar el `claimId` a mano — queda para cuando haga falta de verdad.
- **`Content-Disposition` no llega al frontend vía `fetch()`** por las reglas de CORS — sin impacto real, `downloadMyGift()` ya fija el nombre de archivo a mano en el `<a download>`.
