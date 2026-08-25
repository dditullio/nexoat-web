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
- **`Content-Disposition` no llegaba al frontend vía `fetch()`** por las reglas de CORS — en su momento se asumió sin impacto real porque `downloadMyGift()` fijaba el nombre de archivo a mano en el `<a download>`. **Resultó tener impacto real:** ese nombre armado a mano se desincronizaba del título vigente del ebook apenas se editaba después de un claim — ver "Nombre de archivo: cliente vs. servidor" en la Fase 3, que revierte esta nota.

---

## Fase 3: motor de render docx + LibreOffice, en vez de HTML + Chromium

**Estado:** implementado y verificado.

### Contexto

La Fase 2 funciona, pero maquetar un libro completo a mano en HTML/CSS para Chromium resultó incómodo y forzó varios workarounds: Chromium no ejecuta JS dentro de las plantillas de header/footer de Gotenberg, así que "portada sin numerar + contenido numerado desde 1" obligó a separar el libro en **dos PDFs** (`buildFrontMatterHtml` / `buildContentHtml`) que se unen después con `pdf-lib`; el índice con números de página reales requirió una primera pasada de render solo para _medir_ dónde cae cada capítulo (`pdf-page-index.ts`, con un fix aparte para que "Referencias" no matcheara dentro de "preferencias"); y la convención "capítulo 1 en página impar" se resuelve contando páginas del frente a mano y volviendo a renderizar con una hoja en blanco si hace falta. Todo eso son cosas que un procesador de texto real resuelve nativo: tabla de contenidos con campo `PAGEREF` que se autoactualiza, secciones con su propio header/footer, "esta sección empieza en página impar" como propiedad de sección, numeración de página que arranca sola por sección.

**Decisión: generar un `.docx` con la librería `docx` (Node) y convertirlo a PDF con el endpoint `libreoffice/convert` de Gotenberg**, en vez de armar HTML para `chromium/convert/html`. Gotenberg 8 (`gotenberg/gotenberg:8`, ya corriendo — ver Fase 2) trae LibreOffice instalado de fábrica, así que no hace falta agregar ni cambiar ningún servicio Docker, solo el endpoint que le pega `PdfRenderService`.

### Qué cambia

- **`pdf-render.service.ts`:** `render()` deja de mandar HTML a `forms/chromium/convert/html` y pasa a mandar el buffer del `.docx` (multipart, un único archivo — LibreOffice detecta el formato por extensión) a `forms/libreoffice/convert`. Misma firma pública (`render(input, options): Promise<Buffer | null>`, nunca lanza, `null` sin `GOTENBERG_URL`) — no cambia nada en `GiftsService` más allá de qué le pasa como `input`. `headerHtml`/`footerHtml`/márgenes ya no aplican por este endpoint (van embebidos en el propio `.docx`); esas opciones se eliminan de `RenderOptions`.
- **Nuevo `ebook-docx.builder.ts`** (`buildEbookDocx()`) reemplaza a `ebook-pdf.template.ts`. Arma **un único documento** (no dos) con `docx` (`Document`, `Section`, `Paragraph`, `TextRun`, `Header`, `Footer`), con tres secciones:
  1. **Portada:** imagen a página completa (`ImageRun`, descargada de la URL de Cloudinary con `fetch`), sin header/footer; sin `coverImage` cargada, cae al mismo fallback tipográfico simple que la Fase 2.
  2. **Ficha + dedicatoria + índice:** sin header/footer. Ver "Índice: dos pasadas de render" más abajo — **no** usa el campo `TableOfContents` nativo de `docx` (se intentó primero y no funciona con este motor).
  3. **Capítulos + QR:** `properties.type: SectionType.ODD_PAGE` — Word/LibreOffice arrancan esta sección en la siguiente página impar automáticamente al convertir; se verificó contra Gotenberg real (front matter de 4 páginas → capítulo 1 en la página 5). Header (título del libro) y footer (`nexoat.com · N`) propios de la sección, con `pageNumbers: { start: 1 }` — numeración propia, arranca en 1 sola, sin ningún cálculo de nuestro lado.
  - `parseBookChapters()` (`markdown-book.ts`) cambió: expone `bodyMarkdown` (Markdown crudo) en vez de `bodyHtml` — el builder nuevo arma `Paragraph`/`TextRun` de `docx` directamente, no pasa por HTML. `markdown-inline.ts` (nuevo) resuelve `**negrita**`/`*cursiva*`/`` `código` `` inline a `TextRun[]`; el cuerpo de cada capítulo se separa en bloques por línea en blanco reconociendo encabezados `###`/`####`, blockquotes, listas y párrafos.
  - QR: mismo `qrcode` (Node, sin red), pero `QRCode.toBuffer()` en vez de `toDataURL()` — el PNG se pasa directo a `ImageRun`.
- **Se eliminan** `pdf-merge.ts` completo y las funciones `buildFrontMatterHtml`/`buildContentHtml`/`buildContentHeaderHtml`/`buildContentFooterHtml` de la Fase 2 (`ebook-pdf.template.ts` se borra). `pdf-page-index.ts` se reemplaza por `pdf-chapter-locator.ts` (ver abajo) — más simple porque ya no hay que corregir ningún offset entre dos PDFs. `GiftsService.generatePdf()` ya no une PDFs con `pdf-lib` ni cuenta páginas para decidir una hoja en blanco — eso lo resuelve `SectionType.ODD_PAGE` dentro del propio documento.
- **`BOOK_PAPER_WIDTH_IN`/`BOOK_PAPER_HEIGHT_IN`** (A5, 5.83×8.27in) se reemplazan por tamaño **A4** (`convertMillimetersToTwip(210)`/`convertMillimetersToTwip(297)`, 595×842pt — verificado contra el `/MediaBox` del PDF real). A4 y no una proporción de pantalla "óptima" (algunas guías editoriales sugieren 16:10/4:3 para lectura en tablet) fue una decisión deliberada: el PDF también se puede imprimir en una impresora hogareña, que carga A4/Carta de fábrica — un tamaño no estándar obliga a "ajustar a página" al imprimir, con márgenes irregulares y texto reescalado.

### Índice: dos pasadas de render (no el campo TOC nativo)

El diseño original de esta fase proponía usar `TableOfContents` de `docx` (el campo `TOC` nativo de Word, que enlaza a los párrafos con estilo `Heading1` y se autoactualiza). **No funciona con este motor**: se probó a mano contra Gotenberg real y LibreOffice headless no recalcula ese campo al convertir — a diferencia de Word de escritorio, que lo actualiza la primera vez que una persona abre el documento, la conversión sin UI deja la página del índice con el título "Contenido" y **sin ninguna entrada**, campo vacío.

La solución fue volver a un mecanismo de dos pasadas — mucho más simple que el de la Fase 2 porque ahora el libro es un solo documento, no dos que haya que unir ni corregir por offset:

1. `buildEbookDocx({ ...data, tocPageNumbers: null })` → primera pasada de render, con el índice mostrando "–" en vez de números.
2. `locateChapterPages()` (`pdf-chapter-locator.ts`, vía `pdf-parse`) busca en qué página del PDF aparece cada título de capítulo, con dos filtros: coincidencia de **palabra completa** (mismo motivo que la Fase 2 — "Referencias" no debe matchear dentro de "preferencias") y **solo páginas con el pie propio de la sección de capítulos** (`nexoat.com · N`) — sin este segundo filtro, el título de cada capítulo matcheaba primero en su propia entrada del índice (que también lo menciona) en vez de en la página donde arranca de verdad; se detectó y corrigió a mano contra el PDF real antes de dar la función por buena.
3. `buildEbookDocx({ ...data, tocPageNumbers })` → segunda pasada, ya con los números reales horneados como texto plano (párrafos con `tabStops` de tipo `RIGHT` y `leader: LeaderType.DOT`, no un campo de Word) — esta es la que se guarda como resultado final.

El costo es el mismo que en la Fase 2 (dos round-trips a Gotenberg), pero la lógica alrededor es bastante más chica: sin unión de PDFs, sin hoja en blanco condicional, sin recorte de página sobrante.

### Tipografía: tamaños base × factor de escala

En vez de tamaños de fuente sueltos por elemento, `ebook-docx.builder.ts` define un objeto `BASE_PT` en puntos siguiendo proporciones típicas de publicación (cuerpo 11pt, título de capítulo 24pt, encabezado interno 14pt, pie/metadatos 9pt, etc.) y una única constante `FONT_SCALE_FACTOR` que multiplica a todos por igual vía el helper `pt(base, extraScale = 1) = Math.round(base * FONT_SCALE_FACTOR * extraScale * 2)` (`docx` pide half-points en `size`). El segundo parámetro (`extraScale`) es un multiplicador puntual por elemento sin tocar el factor global — lo usa el capítulo "Referencias" (ver abajo). El interlineado (`lineSpacing()`, también parametrizado) escala junto con el factor para no dejar el texto apretado. Motivo del cambio de A5 a A4: A5 con tipografía cómoda de leer en pantalla completa (desktop/tablet) quedaba con muy poco texto por página; A4 da más superficie sin que la maquetación se sienta vacía — y de paso permite imprimir el PDF sin fricción (ver más arriba).

**Márgenes y `FONT_SCALE_FACTOR` se ajustaron dos veces después de la primera verificación**, contra feedback del usuario mirando el PDF real generado:

1. Con márgenes de 32mm y `FONT_SCALE_FACTOR = 1.4` (primer intento), la línea de cuerpo quedaba en ~65-70 caracteres — el usuario la vio "demasiado grande" y pidió apuntar a ~80 caracteres por línea.
2. Bajar `FONT_SCALE_FACTOR` a `1.2` con los mismos márgenes acercó la línea a 77-85 caracteres — pero el usuario pidió además achicar los márgenes a 2cm de cada lado (más superficie de texto por página).
3. Con márgenes de 20mm, `1.2` se quedaba corto (88-98 caracteres, demasiado ancho) — el ancho de columna disponible creció, así que hubo que **subir** el factor de nuevo. Valor final verificado empíricamente contra Gotenberg real (render de un párrafo de prueba + medición de longitud de línea con `pdftotext -layout`): **`MARGIN_SIDE_TWIP = 20mm`, `MARGIN_VERTICAL_TWIP = 20mm`, `FONT_SCALE_FACTOR = 1.4`** — línea de cuerpo en 75-80 caracteres.

La lección para el próximo ajuste: margen y tamaño de fuente no son independientes — achicar el margen sin recalcular el factor descompensa el objetivo de caracteres por línea. Cualquier cambio a uno de los dos números requiere volver a medir contra un render real, no asumir la proporción.

**Cuarto ajuste, con contenido realista en vez de texto de relleno artificial.** Al medir contra el PDF real generado por el usuario, la línea de cuerpo daba ~60-67 caracteres, no los 75-80 del texto de prueba anterior — el texto de relleno usado para medir tenía palabras artificialmente largas que sobreestimaban cuántos caracteres reales entran por línea. Repitiendo la medición con oraciones de largo variado, similares al contenido real (`pdftotext -layout` + longitud de línea), el valor final quedó en **`FONT_SCALE_FACTOR = 1.13`** (con los mismos márgenes de 20mm) — línea de cuerpo en 78-83 caracteres. Moraleja adicional: medir con texto de prueba sintético puede dar un resultado optimista; conviene validar con una muestra de contenido real antes de dar un ajuste tipográfico por bueno.

### Cuerpo justificado

Los párrafos de cuerpo de capítulo (no los títulos, blockquotes ni listas) usan `alignment: AlignmentType.JUSTIFIED` en `chapterBodyParagraphs()` — pedido explícito del usuario después de ver el texto en bandera contra el PDF real.

### Orden de la dedicatoria

Nombre → email → línea de reconocimiento (si aplica), en ese orden — el diseño original ponía el reconocimiento inmediatamente debajo del nombre y el email al final; el usuario pidió el email pegado al nombre y el reconocimiento después.

### Nombre de archivo: cliente vs. servidor

Dos intentos fallidos antes de llegar a la causa real (reportado dos veces por el usuario — "sigue mostrando el nombre viejo" después del primer intento de arreglo):

1. **Primer intento:** calcular `slugify(ebook.title)` en `GiftsService.generatePdf()` y guardarlo en `EbookClaim.generatedFileName`. Insuficiente — ese valor se fija en el momento del `claim()`/`regenerate()`; si el admin edita el título **después**, sin volver a regenerar, queda desactualizado igual.
2. **Segundo intento:** mover el cálculo a `GiftsService.openForDownload()`, recalculando `slugify(claim.ebook.title)` en cada descarga en vez de leer el campo guardado — correcto del lado del backend (`Content-Disposition` de la respuesta ya traía el nombre bueno, verificado con `curl`), pero **el frontend nunca lo leía**. `downloadMyGift()` (`gifts.api.ts`) armaba el nombre de archivo él mismo, del lado del cliente, con `ebook.fileName ?? ebook.slug` — datos que también estaban desincronizados del título vigente, e independientes de lo que el backend calculaba. Cambiar el backend no tenía ningún efecto observable porque el frontend ni siquiera intentaba leer su respuesta.

**Causa raíz real:** una nota de la Fase 1 (ver Notas de implementación de esa fase) asumía que el navegador bloquea la lectura de `Content-Disposition` vía `fetch()` por CORS "sin impacto real" porque el nombre se armaba a mano de todos modos — ese supuesto sin impacto terminó siendo exactamente la causa del bug. La solución final:

- **`main.ts`**: `app.enableCors({ ..., exposedHeaders: ['Content-Disposition'] })` — sin esto, el header viaja en la respuesta HTTP pero el navegador se lo esconde a JavaScript aunque la petición sea CORS válida (verificado con `curl -H "Origin: ..."` antes/después: `access-control-expose-headers: Content-Disposition` en la respuesta).
- **`http.ts`**: nuevo `httpBlobWithFilename()` (junto a `httpBlob`, que otros llamadores como `downloadBackup` siguen usando tal cual) — devuelve `{ blob, filename }`, parseando `filename="..."` del header cuando está presente.
- **`gifts.api.ts`**: `downloadMyGift(fallbackFilename)` usa el nombre real del header si vino; el parámetro pasa a ser un fallback, no la fuente de verdad.

Moraleja: "el backend ya lo calcula bien" no alcanza si nadie del otro lado lee ese cálculo — conviene verificar el dato en el punto donde el usuario realmente lo ve (la descarga en el navegador), no solo en la respuesta cruda del servidor.

### Confirmación de descarga al terminar el onboarding

`OnboardingView.vue` (paso "gift", ver [`email-first-signup-and-onboarding.md`](email-first-signup-and-onboarding.md)): antes, `onClaimGiftAndFinish()` reclamaba el ebook y llamaba `onFinish()` en el mismo paso — el onboarding se cerraba (redirect a `/` o a `route.query.redirect`) sin ninguna confirmación visible de qué se había elegido ni de dónde volver a buscarlo, algo frustrante justo después de elegir un título. Se agregó un sub-estado "4b" (`claimedGift`, no cuenta como paso propio en `stepOrder`/`totalSteps`): tras reclamar, en vez de cerrar, muestra la portada (si tiene), título/subtítulo y un botón "Descargar mi ebook" (mismo `downloadMyGift()` que ya usa `ProfileGiftView.vue`), más una nota de que también queda disponible desde el menú de perfil — recién ahí un botón "Listo, continuar" llama a `onFinish()`. No es un modal/diálogo aparte, sino un reemplazo del contenido del mismo paso del onboarding (mismo patrón visual de tarjeta que el resto de los pasos) — más simple que introducir un componente de diálogo nuevo para un caso de uso único.

### Referencias: cuerpo un 20% más chico

El capítulo cuyo título (normalizado, sin distinguir mayúsculas) es exactamente "Referencias" se detecta en `buildEbookDocx()` y su cuerpo se arma con `chapterBodyParagraphs(chapter.bodyMarkdown, 0.8)` — mismo helper que el resto de los capítulos, con el multiplicador `extraScale` en 0.8 en vez de 1. Es una comparación por título, no un campo de datos nuevo — sigue la misma convención editorial que ya usa `markdown-book.ts` (todo `## ` es un capítulo, sin metadata aparte que lo distinga).

### Página de cierre institucional

Cuarta sección del documento (después de capítulos + QR), con el texto "Un espacio de divulgación para quienes cuidan de otra persona…" (mismo texto que usa el sitio) centrado, sin header/footer — mismo criterio visual limpio que la ficha/dedicatoria, no el de las páginas de capítulo. Siempre se agrega (no depende de `storeUrl` como el QR).

**Nota de implementación:** una sección de `docx` sin `headers`/`footers` propios **hereda** los de la sección anterior (comportamiento real de OOXML, no un bug de LibreOffice) — el primer intento de esta página salió con el header (título del libro) y el footer (`nexoat.com · N`) de la sección de capítulos pegados encima. Se corrigió declarando `headers`/`footers` vacíos explícitos (`new Header({ children: [] })`) en esa sección — cualquier sección nueva que se agregue más adelante sin querer header/footer va a necesitar el mismo override explícito, no alcanza con omitir la propiedad.

### Reconocimiento en la dedicatoria

Debajo del nombre del destinatario, si `User.profileRole` (elegido en el onboarding, ver [`email-first-signup-and-onboarding.md`](email-first-signup-and-onboarding.md)) tiene una entrada en `RECOGNITION_BY_ROLE`, se agrega una línea en itálica antes del email:

- `acompanante_terapeutico` → "en reconocimiento a su dedicación en el ámbito del Acompañamiento Terapéutico"
- `cuidador` → "en reconocimiento a su dedicación en el cuidado de personas"
- `familiar` → "en reconocimiento al amor y la presencia con que acompaña a quien cuida" — redacción deliberadamente genérica (no se sabe a quién cuida ni en qué circunstancia); a revisar/ajustar si no convence del todo.
- `otro` y `null` (todavía no completó el onboarding) → **sin línea**, no se fuerza ningún texto — no había una redacción genérica razonable para "otro" que no sonara vacía o forzada.

Márgenes (`MARGIN_SIDE_TWIP = 32mm`, `MARGIN_VERTICAL_TWIP = 24mm`) elegidos para que, con el factor 1.4, la línea de cuerpo caiga dentro del rango de 45–75 caracteres recomendado para lectura cómoda (verificado a ojo contra el PDF de prueba, no medido carácter por carácter — si al implementar contenido real la línea queda corta/larga, es cuestión de tocar `MARGIN_SIDE_TWIP`, no la lógica).

### Recomendaciones editoriales aplicadas (y descartadas)

El usuario compartió recomendaciones de una editorial sobre maquetación de ebooks en PDF. Se evaluaron contra este pipeline (`docx` + LibreOffice, no InDesign) y se aplicaron las que tenían sentido:

- **Control de viudas/huérfanas** (`widowControl: true` en todos los párrafos de cuerpo/lista/blockquote/dedicatoria).
- **Longitud de línea 45–75 caracteres** — criterio detrás de los márgenes elegidos (ver arriba), no un valor de margen fijo e independiente del tamaño de fuente.
- **Texto alternativo en imágenes** — `altText` en el `ImageRun` de portada y del QR.

Aplicadas parcial/con ajuste — no al pie de la letra de la recomendación:

- **Proporción de página.** La editorial sugiere 16:10/4:3 en vez de A4 para pantalla; se descartó a favor de A4 porque el PDF también debe poder imprimirse en una impresora hogareña sin reescalado (ver "Qué cambia" arriba) — decisión explícita del usuario, no un descuido.
- **Marcadores (bookmarks) del panel lateral del lector de PDF** — se probó pasando `exportBookmarks=true` a `forms/libreoffice/convert` contra Gotenberg real y el PDF resultante no trae `/Outlines`: LibreOffice no genera el árbol de marcadores a partir de los estilos `Heading1`/`Heading2` en esta conversión headless. No se investigó más a fondo (no es bloqueante, el índice en texto ya resuelve la navegación) — queda anotado como mejora futura si se encuentra la combinación de parámetros correcta.
- **Fuentes incrustadas (Fraunces/Karla del sitio, no genéricas).** Se evaluó embeber las fuentes reales del sistema de diseño en el `.docx`, pero el repo no tiene los archivos `.ttf`/`.otf` — el sitio las carga desde Google Fonts vía `<link>`, no como asset local. Se mantienen **Georgia** (serif, cuerpo/títulos) y **Arial** (sans, metadatos/pie) — mismo criterio de portabilidad que ya usaban `mail/templates/` y la Fase 2. Si en algún momento se agregan los archivos de fuente al repo, `FONT_SERIF`/`FONT_SANS` en `ebook-docx.builder.ts` son el único lugar a tocar.

Descartadas — fuera de alcance para este pipeline:

- **Grilla base (baseline grid)** — nivel de control tipográfico de InDesign, no algo que `docx`/LibreOffice expongan razonablemente.
- **PDF/UA-1/UA-2 completo** (tagged PDF validado, orden de lectura, PAC/Acrobat checker) — estándar de accesibilidad serio que requiere revisión dedicada; fuera de alcance de esta fase. Con buena estructura de `Heading1`/`Heading2` se consigue una base razonable, pero no hay reclamo de cumplimiento del estándar.
- Gráficos vectoriales, notas al pie con enlaces cruzados, glosario — el libro no tiene ese tipo de contenido.
- Todo lo referido a lomo/encuadernación de libro impreso — no aplica a un PDF digital.

### Qué no cambia

Schema de Prisma, endpoints de `gifts.controller.ts`/`admin-gifts.controller.ts`, `GiftsService` público (`claim`, `regenerate`, `openForDownload`, CRUD admin), storage en disco (`storage/ebooks/generated/`), el criterio de "nunca explota, `null` sin Gotenberg", Docker (mismo `gotenberg/gotenberg:8`, sin agregar nada), frontend (`AdminGiftsView.vue` sigue mandando `content` en Markdown tal cual).

### Dependencias

- **Nueva:** `docx` (Node, generación de `.docx` — MIT, sin dependencias nativas).
- **Se elimina `pdf-lib`** (solo la usaba `pdf-merge.ts`, borrado). `pdf-parse` **se mantiene** — ya no lo usa `pdf-page-index.ts` (borrado) pero pasa a usarlo el nuevo `pdf-chapter-locator.ts` para el índice de dos pasadas. Nota: `pdf-parse` publicó una v2 con API distinta a la v1 que tenía el proyecto en `package.json` (clase `PDFParse` con `getText()`, no la función `pdfParse(buffer, { pagerender })` de v1) — `pdf-chapter-locator.ts` usa la API nueva.

### Plan de verificación

1. `GET http://localhost:3002/health` de Gotenberg (ya corriendo, Fase 2) — no requiere cambios de infra.
2. Generar un `.docx` de prueba con `buildEbookDocx()` (3 capítulos, con negrita/cursiva/lista/subtítulo, uno de ellos titulado "Referencias" para probar el matching de palabra completa) y convertirlo a mano contra Gotenberg real (`forms/libreoffice/convert`).
3. `pdftotext -layout` página por página del PDF resultante: confirmar A4 (`/MediaBox` 595×842pt), portada sin numerar, sección de capítulos arrancando en página impar (verificado: frente de 4 páginas → capítulo 1 en la página 5), pie con numeración propia desde 1, texto en negrita/cursiva/lista renderizado correctamente.
4. Confirmar que el índice (`tocPageNumbers`) trae los números reales — **primer intento sin filtrar por pie de página dio mal** (el título de cada capítulo matcheaba en su propia entrada del índice, página 4 para los tres) — corregido en `pdf-chapter-locator.ts` filtrando primero las páginas por el pie propio de la sección de capítulos (`nexoat.com · N`) antes de buscar el título. Con la corrección, los tres capítulos de prueba ubicaron sus páginas reales (5, 6, 7) y el índice regenerado (segunda pasada) mostró exactamente esos números con líder de puntos.
5. `pnpm --filter @nexoat/backend test` (131 tests, toda la suite existente) + `type-check` + `lint` de `src/gifts` — limpios.

Los 5 puntos se verificaron a mano contra Gotenberg real corriendo en `localhost:3002`. Pendiente de probar en este ciclo (no bloqueante, se prueba naturalmente en el próximo `claim()` real): el flujo completo end-to-end vía `GiftsService.claim()`/`regenerate()`/`openForDownload()` con un `WelcomeEbook` de la base (la lógica de las dos pasadas está integrada en `generatePdf()`, pero no se corrió contra Prisma en este ciclo), y el comportamiento con Gotenberg apagado (sin cambios respecto a la Fase 2, mismo `try/catch` con `null`).

### Notas de implementación (Fase 3)

- **El campo `TableOfContents` nativo de `docx` no funciona con LibreOffice headless** — ver "Índice: dos pasadas de render" arriba. Se descubrió probando contra Gotenberg real, no por documentación: la primera versión de este código usaba `TableOfContents` con `features: { updateFields: true }` y el PDF resultante traía la página del índice con el título "Contenido" y ninguna entrada.
- **`locateChapterPages()` necesitó un segundo filtro además del matching de palabra completa** — sin restringir la búsqueda a páginas con el pie propio de la sección de capítulos, cada título matcheaba primero en su propia línea del índice (que también lo menciona) en vez de en la página real donde arranca el capítulo. Se detectó comparando el resultado contra `pdftotext` del PDF real antes de dar la función por buena.
- **`pdf-parse@2.4.5` tiene una API completamente distinta a la v1** (clase `PDFParse` con métodos `getText()`/`getInfo()`/etc., no la función con callback `pagerender` de la v1 que usaba `pdf-page-index.ts` en la Fase 2) — el import y el uso en `pdf-chapter-locator.ts` son nuevos, no una migración directa del código anterior.
- **Sin fuentes embebidas (Fraunces/Karla)** — el repo no tiene los archivos `.ttf`/`.otf` del sistema de diseño (se cargan vía Google Fonts en el frontend, no como asset local); se mantienen Georgia/Arial. Ver "Recomendaciones editoriales aplicadas" arriba.
- **Sin marcadores (bookmarks) en el panel del lector de PDF** — se probó `exportBookmarks=true` contra Gotenberg real sin efecto (`/Outlines` ausente en el PDF resultante). Ver "Recomendaciones editoriales aplicadas" arriba.
- **`locateChapterPages()` fallaba con títulos largos que se envuelven en dos líneas** (bug real, encontrado al probar con un libro real de 11 capítulos: solo el primero —corto, una línea— y "Referencias" —una palabra— ubicaban su página; los otros 9, todos títulos largos, quedaban en "–"). `pdf-parse` inserta un salto de línea (no un espacio) entre líneas que quedaron separadas verticalmente en la página — un título envuelto por el ancho de la página queda con un "\n" exactamente donde el original tiene un espacio, así que la búsqueda literal fallaba. Se corrigió normalizando todo espacio en blanco (saltos de línea incluidos) a un único espacio antes de comparar, tanto en el texto de la página como en el título buscado (`normalizeWhitespace()` en `pdf-chapter-locator.ts`). Verificado con los 11 títulos reales del ejemplo del usuario ("La parálisis no es tuya" … "Referencias") — los 11 ubicaron su página correctamente después del fix.
- **El nombre de archivo descargado usaba `ebook.slug`, fijado una sola vez en `create()`** — si el título de un `WelcomeEbook` se edita después (`update()` no toca `slug`), el archivo descargado seguía llamándose como el título original, aunque el contenido ya fuera otro libro completamente distinto (reportado por el usuario probando con un ebook editado desde el título "Neurodiversidad en el día a día"). Primer intento: calcular `slugify(ebook.title)` en `generatePdf()` y guardarlo en `EbookClaim.generatedFileName` — **insuficiente**, el usuario volvió a pisarlo: si el ebook se reclama, y **después** se edita el título/contenido sin volver a `regenerate()`, el nombre guardado en el claim queda desactualizado igual, solo que ahora con el título de cuando se reclamó en vez del de la creación. La corrección real fue mover el cálculo a `openForDownload()`: `filename` se arma con `slugify(claim.ebook.title)` en cada descarga, no se lee más de `claim.generatedFileName` — así no hay ningún momento del ciclo de vida del claim en el que el nombre pueda quedar pegado a un título viejo. `EbookClaim.generatedFileName` se sigue guardando (sin migración) pero pasó a ser solo informativo, no autoritativo.
- **Márgenes achicados a 20mm y `FONT_SCALE_FACTOR` reajustado a 1.4** (había bajado a 1.2 en un paso intermedio) tras feedback del usuario mirando el PDF real — ver "Márgenes y `FONT_SCALE_FACTOR` se ajustaron dos veces" arriba.
