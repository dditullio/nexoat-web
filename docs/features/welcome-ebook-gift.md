# Regalo de bienvenida (ebook a elección) al terminar el onboarding

**Estado:** implementado y verificado (backend + frontend + seed de desarrollo). No hay PDFs definitivos todavía — la tabla arranca vacía en producción y el paso queda invisible hasta que se carguen desde `/nexoat-admin/regalo-bienvenida` (ver "Semilla de desarrollo"). Este documento queda como referencia de diseño; ver "Notas de implementación" al final para los puntos donde el código difiere de lo especificado.

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
