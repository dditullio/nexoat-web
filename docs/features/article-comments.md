# Comentarios en artículos

**Estado:** implementado y verificado (26 de agosto de 2026).

## Contexto

El blog no tiene ninguna vía de conversación con el lector. Se agrega una sección de comentarios al pie de cada artículo, con tres objetivos:

1. **Conversación real** entre lectores (comentarios y respuestas), no solo un buzón.
2. **Gancho de registro**: el visitante ve los comentarios y puede escribir el suyo, pero para enviarlo necesita una cuenta gratuita. El borrador no se pierde al registrarse.
3. **Devolución al lector registrado**: en `/mi-cuenta` puede ver todo lo que comentó, con link al artículo y los likes que recibió.

Se apoya en lo ya implementado: cuentas de lector (`reader-accounts-and-paywall.md`), registro en dos pasos y onboarding (`email-first-signup-and-onboarding.md`), perfil y avatar (`reader-profile.md`), y el patrón de módulo bajo `/me` de `reader-history-and-saved-articles.md`.

## Decisiones de diseño

### 1. Publicación inmediata + moderación posterior

El comentario aparece apenas se envía. No hay cola de aprobación previa: para el volumen de tráfico actual, una cola implicaría que nadie vea su comentario publicado hasta que un editor entre al panel, y eso mata la conversación antes de que empiece.

A cambio, la moderación existe y es real:

- Cada comentario tiene un `status`: `visible`, `oculto` (moderado) o `eliminado` (borrado por su autor o por un moderador).
- Los lectores registrados pueden **reportar** un comentario (`CommentReport`, uno por usuario y comentario) — pide confirmación con `ConfirmDialog.vue` antes de enviarlo, para que no se dispare por error ni sin entender qué implica (el diálogo aclara que solo lo marca para revisión, no lo oculta al instante).
- Pantalla nueva `/nexoat-admin/comentarios` (EDITOR+) para listar, filtrar por estado/reportados, ocultar, restaurar y borrar.
- Toda acción de moderación queda en `AuditLog` (`comment.hide`, `comment.restore`, `comment.delete`), igual que el resto del admin.

Dado el tipo de contenido del sitio (maltrato, salud mental, discapacidad), la moderación no es opcional: es parte del alcance mínimo, no una fase 2.

### 2. Dos niveles de lectura, árbol real en la base

Visualmente el hilo tiene **dos niveles**: comentario raíz + respuestas planas debajo (patrón YouTube/Medium). Responder a una respuesta cuelga el nuevo comentario del mismo hilo, mostrando «En respuesta a _Nombre_».

En la base, en cambio, se guarda el árbol completo:

- `parentId` → el comentario concreto al que se respondió (a cualquier profundidad).
- `rootId` → el comentario raíz del hilo (`null` en los raíz), denormalizado y calculado en el service: `rootId = parent.rootId ?? parent.id`.

Así la consulta de un hilo es un `findMany({ where: { rootId } })` plano y ordenado, sin recursión; y si algún día se quiere indentar más niveles, el dato ya está — no hace falta migrar nada. El aplanado es una decisión de presentación, no de almacenamiento.

### 3. Texto plano, sin Markdown ni links clicables

El cuerpo del comentario se guarda y se muestra como **texto plano** (se respetan los saltos de línea, nada más). No se procesa Markdown ni se autolinkean URLs:

- El renderer de Markdown del sitio está pensado para contenido propio y confiable; pasarle entrada de usuario abre superficie de XSS sin necesidad.
- Los links clicables en comentarios son el vector nº 1 de spam SEO. Una URL pegada se ve como texto y no se puede clickear.

Límites: 1 a 3.000 caracteres, con contador visible a partir de los 2.700.

### 4. El borrador del visitante vive en `localStorage`, no en el backend

El visitante escribe sin sesión: no hay a quién atribuirle el borrador en el servidor. Se guarda en `localStorage` con clave `nexoat:comment-draft:<slug>` (junto al `parentId` si estaba respondiendo) y un TTL de 7 días.

El botón dice **«Accedé con una cuenta gratuita para comentar»** y navega a `/registrarme?redirect=/articulo/<slug>%23comentarios`. Al volver, `CommentsSection` rehidrata el textarea desde `localStorage`, hace scroll al ancla `#comentarios` y muestra el aviso «Recuperamos lo que estabas escribiendo». El borrador se borra solo cuando el envío sale bien.

El mismo mecanismo protege al usuario ya logueado ante una recarga accidental.

**Limitación aceptada y documentada:** el alta por email es en dos pasos (email → activar desde el correo → completar datos). Si el lector abre el link de activación en **otro navegador o dispositivo**, el borrador queda en el navegador original y no viaja con él. Con OAuth (Google/Facebook) y con activación en la misma pestaña, que es el caso mayoritario, funciona. Persistir el borrador en el servidor exigiría identificar al anónimo con una cookie propia — no vale el costo ni encaja con la línea del sitio sobre datos (ver `analytics-umami.md`).

Además hay que verificar que el `?redirect=` sobreviva la cadena completa: `/registrarme` → correo de activación → `/completar-registro` → `/bienvenida` (onboarding) → artículo. El guard de router ya propaga `redirect` hacia `onboarding`; falta confirmar que `CompleteSignupView.vue` y el link del correo de activación lo arrastren. **Si algún eslabón lo pierde, arreglarlo es parte de esta funcionalidad**, no un extra.

### 5. Comentarios visibles siempre, también en artículos con paywall

Un artículo de alcance `suscriptores_nivel_*` se muestra recortado, pero su sección de comentarios se ve completa y cualquier usuario registrado puede comentar. Es una regla única, fácil de explicar, y la conversación funciona como argumento extra para registrarse justo donde el contenido se corta.

### 6. Firma pública: nombre y avatar, nunca el email

El comentario se muestra con `user.name` y `user.avatarUrl`. El email **no** se expone en ninguna respuesta de la API pública.

Si el usuario no tiene `name` cargado (cuentas viejas, altas por OAuth sin nombre), el formulario pide **«¿Cómo querés firmar?»** antes del primer envío y lo guarda en `user.name` con el endpoint de perfil ya existente. Es preferible a inventar un alias genérico: el lector decide cómo aparece.

Bajo el formulario, un aviso permanente y breve: _«Tu nombre y tu foto de perfil serán visibles junto a tu comentario.»_ Dado el contenido del sitio, alguien puede estar por contar algo personal — tiene que saberlo antes de enviar, no después. Se suma también un párrafo en `/terminos`.

### 7. Likes con contador denormalizado

`CommentLike` con `@@unique([commentId, userId])` (un like por persona, toggle) más un campo `likeCount Int @default(0)` en `Comment`, actualizado dentro de la misma transacción que crea o borra el like.

El contador denormalizado evita un `_count` por comentario en cada listado y deja la puerta abierta a ordenar por «más valorados» sin rediseñar nada. El auto-like está bloqueado (`ForbiddenException` si `comment.authorId === userId`) — el botón de like queda deshabilitado en el propio comentario, con un `title` que explica por qué.

### 8. Borrado blando, para no romper hilos — y lo mismo aplica a ocultar

Borrar un comentario que tiene respuestas dejaría huérfana la conversación. Por eso `DELETE` marca `status: eliminado` y vacía el `body`; el frontend muestra el hueco como _«Comentario eliminado»_ solo si tiene respuestas visibles, y lo omite por completo si es una hoja. La fila queda en la base para la auditoría.

**El mismo razonamiento aplica a `oculto`** (moderación): ocultar un comentario raíz no debe arrastrar consigo las respuestas de otros usuarios que sí siguen `visible`. El query de `listForArticle` trata `oculto` y `eliminado` igual en este aspecto — ambos sobreviven al listado público únicamente si tienen alguna respuesta `visible` colgando, y en ese caso se muestran como el mismo tipo de hueco vacío (sin body ni autor), con el texto distinto según el caso: _«Comentario oculto»_ vs _«Comentario eliminado»_. `toPublicComment` blanquea body/autor para cualquier `status` distinto de `visible` (campo `isHidden`), no solo para `eliminado` (`isDeleted` sigue existiendo, más angosto, solo para distinguir el texto del hueco).

### 9. Se pueden cerrar los comentarios de un artículo puntual

`Article` suma `commentsEnabled Boolean @default(true)`, con un checkbox en el formulario del admin. Un artículo especialmente delicado (o uno que se descontroló) se puede cerrar sin desactivar el sistema entero: los comentarios existentes se siguen leyendo, el formulario se reemplaza por «Los comentarios de este artículo están cerrados».

### 10. Anti-spam mínimo, sin dependencias nuevas

- Máximo **1 comentario cada 30 segundos** y **20 por día** por usuario (chequeo por conteo en el service, sin librería de rate limit).
- Rechazo de envío idéntico al último comentario del mismo usuario en el mismo artículo (evita el doble click y el flood tonto).
- Solo comentan cuentas con email verificado — cosa que el alta en dos pasos ya garantiza para altas por email, y OAuth por definición.

## Schema (`backend/prisma/schema.prisma`)

```prisma
enum CommentStatus {
  visible
  oculto // moderado por un editor
  eliminado // borrado por su autor o por un moderador (borrado blando)
}

model Comment {
  id          String        @id @default(cuid())
  articleId   String
  article     Article       @relation("ArticleComments", fields: [articleId], references: [id], onDelete: Cascade)
  authorId    String
  author      User          @relation("CommentAuthor", fields: [authorId], references: [id], onDelete: Cascade)
  body        String
  status      CommentStatus @default(visible)
  // Comentario concreto al que se respondió (a cualquier profundidad).
  parentId    String?
  parent      Comment?      @relation("CommentReplies", fields: [parentId], references: [id], onDelete: Cascade)
  replies     Comment[]     @relation("CommentReplies")
  // Raíz del hilo, denormalizada (null en los comentarios raíz) — permite
  // traer un hilo completo con una consulta plana. Ver decisión 2.
  rootId      String?
  likeCount   Int           @default(0)
  likes       CommentLike[]
  reports     CommentReport[]
  editedAt    DateTime?
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt

  @@index([articleId, status, createdAt])
  @@index([rootId, createdAt])
  @@index([authorId, createdAt])
  @@map("comments")
}

model CommentLike {
  id        String   @id @default(cuid())
  commentId String
  comment   Comment  @relation(fields: [commentId], references: [id], onDelete: Cascade)
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())

  @@unique([commentId, userId])
  @@index([userId])
  @@map("comment_likes")
}

model CommentReport {
  id        String   @id @default(cuid())
  commentId String
  comment   Comment  @relation(fields: [commentId], references: [id], onDelete: Cascade)
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  reason    String?
  createdAt DateTime @default(now())

  @@unique([commentId, userId])
  @@index([createdAt])
  @@map("comment_reports")
}
```

`Article` suma `comments Comment[] @relation("ArticleComments")` y `commentsEnabled Boolean @default(true)`.
`User` suma `comments Comment[] @relation("CommentAuthor")`, `commentLikes CommentLike[]` y `commentReports CommentReport[]`.

Migración: `pnpm --filter @nexoat/backend db:migrate` (`add_comments`). Todos los campos nuevos tienen default, así que no requiere backfill.

## Backend — módulo nuevo `backend/src/comments/`

| Archivo                        | Qué hace                                                                                                                                                                                         |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `comments.service.ts`          | `listForArticle`, `create` (valida `commentsEnabled`, rate limit, calcula `rootId`), `update` (solo autor, setea `editedAt`), `remove` (autor o EDITOR+, borrado blando).                        |
| `comment-likes.service.ts`     | `like` / `unlike`, transacción con el `likeCount` denormalizado.                                                                                                                                 |
| `comments.controller.ts`       | Endpoints públicos y de lector (ver tabla de abajo).                                                                                                                                             |
| `my-comments.controller.ts`    | `@Controller('me/comments')` — mis comentarios paginados, con artículo y likes recibidos.                                                                                                        |
| `admin-comments.controller.ts` | `@Controller('admin/comments')`, `RolesGuard` EDITOR+ — listado con filtros, cambio de estado, borrado; registra en `AuditService`.                                                              |
| `comments.mapper.ts`           | `toPublicComment(comment, viewer)` — expone `id`, `body`, `createdAt`, `editedAt`, `status`, `likeCount`, `likedByMe`, `author { id, name, avatarUrl }`, `replyTo { name }`. **Nunca el email.** |
| `dto/`                         | `CreateCommentDto` (`body` 1-3000, `parentId?`), `UpdateCommentDto`, `QueryCommentsDto` (paginación), `ReportCommentDto` (`reason?`), `ModerateCommentDto` (`status`).                           |
| `comments.module.ts`           | Registra todo; importa `AuditModule`.                                                                                                                                                            |

### Endpoints

| Método   | Ruta                         | Guard                  | Notas                                                                                                   |
| -------- | ---------------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------- |
| `GET`    | `/articles/:slug/comments`   | `OptionalJwtAuthGuard` | Público. Raíces paginadas (10/pág.) + hasta 3 respuestas embebidas por hilo. `likedByMe` si hay viewer. |
| `GET`    | `/comments/:id/replies`      | `OptionalJwtAuthGuard` | Resto de las respuestas de un hilo («Ver N respuestas más»).                                            |
| `POST`   | `/articles/:slug/comments`   | `JwtAuthGuard`         | Body `{ body, parentId? }`. 403 si `commentsEnabled` es false; 429 si pega el rate limit.               |
| `PATCH`  | `/comments/:id`              | `JwtAuthGuard`         | Solo el autor.                                                                                          |
| `DELETE` | `/comments/:id`              | `JwtAuthGuard`         | Autor o EDITOR+. Borrado blando.                                                                        |
| `POST`   | `/comments/:id/like`         | `JwtAuthGuard`         | Idempotente.                                                                                            |
| `DELETE` | `/comments/:id/like`         | `JwtAuthGuard`         | Idempotente.                                                                                            |
| `POST`   | `/comments/:id/report`       | `JwtAuthGuard`         | Idempotente (`@@unique`). Devuelve `{ ok: true }` aunque ya lo hubiera reportado.                       |
| `GET`    | `/me/comments`               | `JwtAuthGuard`         | Paginado, más reciente primero, con `article { slug, title }` y `likeCount`.                            |
| `GET`    | `/admin/comments`            | `RolesGuard` EDITOR+   | Filtros `status`, `reported=true`, `q`, `articleId`. Incluye email del autor (es el panel).             |
| `PATCH`  | `/admin/comments/:id/status` | `RolesGuard` EDITOR+   | `visible` / `oculto`. Audita.                                                                           |
| `DELETE` | `/admin/comments/:id`        | `RolesGuard` ADMIN+    | Borrado blando + auditoría.                                                                             |

Los comentarios `oculto` y `eliminado` no salen nunca por los endpoints públicos (salvo el hueco «Comentario eliminado» descrito en la decisión 8).

## Frontend — archivos a crear/tocar

Todo lo visual sigue el skill `.claude/skills/nexoat-design-system/SKILL.md` (paleta salvia/arcilla/ocre, Fraunces para títulos + Karla para cuerpo, tokens de `main.css`, sin estilos sueltos).

| Archivo                                       | Cambio                                                                                                                                                                                                           |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `types/comments.ts` (nuevo)                   | `Comment`, `CommentThread`, `MyCommentEntry`, `CommentStatus`.                                                                                                                                                   |
| `services/comments.api.ts` (nuevo)            | Wrappers sobre `http` para los endpoints públicos y de lector.                                                                                                                                                   |
| `services/admin/comments.api.ts` (nuevo)      | Wrappers del panel.                                                                                                                                                                                              |
| `composables/useCommentDraft.ts` (nuevo)      | Guardar/leer/limpiar el borrador en `localStorage` con TTL (decisión 4).                                                                                                                                         |
| `components/blog/CommentsSection.vue` (nuevo) | Orquestador: `id="comentarios"`, contador en el encabezado, carga y paginación, estado vacío («Todavía no hay comentarios. Escribí el primero.»), rehidratación del borrador.                                    |
| `components/blog/CommentForm.vue` (nuevo)     | Textarea + contador de caracteres + aviso de visibilidad. Con sesión: botón «Publicar comentario». Sin sesión: **«Accedé con una cuenta gratuita para comentar»**. Campo «¿Cómo querés firmar?» si falta `name`. |
| `components/blog/CommentItem.vue` (nuevo)     | Avatar, nombre, fecha relativa, cuerpo, botón de like con contador, «Responder», y menú propio (editar/borrar) o «Reportar» según quién mire. Respuestas anidadas un solo nivel.                                 |
| `views/MyCommentsView.vue` (nuevo)            | `/mi-cuenta/comentarios` — lista de comentarios propios con extracto, título del artículo enlazado, fecha y likes recibidos. Reusa el patrón de `SavedArticlesView.vue` y `ConfirmDialog` para borrar.           |
| `views/admin/AdminCommentsView.vue` (nuevo)   | `/nexoat-admin/comentarios` — tabla con filtros, acciones ocultar/restaurar/borrar, y el texto completo del comentario.                                                                                          |
| `views/ArticleView.vue`                       | Monta `<CommentsSection>` al pie (después de fuentes y disclaimer). Link «Comentarios (N)» en el bloque de meta del encabezado que hace scroll al ancla.                                                         |
| `components/ui/UserMenu.vue`                  | Ítem nuevo «Mis comentarios» → `/mi-cuenta/comentarios`.                                                                                                                                                         |
| `layouts/AdminLayout.vue`                     | Ítem nuevo «Comentarios» (`IconChat` nuevo en `components/admin/icons/`), con badge de cantidad de reportados sin resolver.                                                                                      |
| `views/admin/AdminArticleFormView.vue`        | Checkbox «Permitir comentarios» (`commentsEnabled`).                                                                                                                                                             |
| `router/index.ts`                             | `/mi-cuenta/comentarios` (`requiresAuth: true`) y `/nexoat-admin/comentarios` (`minRole: ['EDITOR','ADMIN','SUPER_ADMIN']`).                                                                                     |
| `views/TermsView.vue`                         | Párrafo sobre comentarios públicos, visibilidad del nombre/avatar y moderación.                                                                                                                                  |

## Orden de implementación

1. **Schema + migración** (`Comment`, `CommentLike`, `CommentReport`, `commentsEnabled`).
2. **Backend núcleo**: `comments.service` + controller público/lector + mapper + tests.
3. **Frontend lectura y escritura**: `CommentsSection` / `CommentItem` / `CommentForm` en `ArticleView`, incluido el CTA de visitante y el borrador.
4. **Likes** (backend + botón).
5. **`/mi-cuenta/comentarios`**.
6. **Reportes + panel de moderación + auditoría + `commentsEnabled` en el form admin.**
7. **Términos** y verificación completa.

Los pasos 1-3 ya dan una funcionalidad usable; 4-6 se pueden hacer y desplegar por separado.

## Fuera de alcance

- **Avisos por correo** de respuestas o likes (decisión tomada: no en esta etapa). Cuando se haga, va sobre el `MailService` de Resend ya implementado, con opt-out en `/mi-cuenta/preferencias`.
- Ordenar los comentarios por «más valorados» (el `likeCount` denormalizado ya lo deja listo).
- Menciones `@usuario`, adjuntos, imágenes, emojis reaccionables más allá del like.
- Contador de comentarios en `ArticleCard` / listados (exigiría tocar el mapper de listados).
- Indentación de más de dos niveles (el dato está en la base, es solo presentación).
- Detección automática de spam o filtros de palabras.

## Plan de verificación

**Tests de backend**

1. `create` con `parentId` de una respuesta → el comentario nuevo queda con `rootId` apuntando a la **raíz** del hilo, no a la respuesta.
2. `create` en un artículo con `commentsEnabled: false` → 403, sin crear fila.
3. `create` dos veces seguidas por el mismo usuario → la segunda choca con el rate limit (429).
4. `update` / `remove` sobre un comentario ajeno con rol `USER` → 403.
5. `remove` de un comentario con respuestas → `status: eliminado` y `body` vacío, las respuestas siguen existiendo.
6. `like` dos veces → idempotente: una sola fila y `likeCount === 1`; `unlike` lo devuelve a 0 (nunca negativo).
7. `listForArticle` no devuelve comentarios `oculto`; el mapper público no incluye `email` en ninguna rama.
8. `report` repetido del mismo usuario → sigue habiendo un solo `CommentReport`.

**Verificación manual**

9. Sin sesión: la sección se lee completa, el botón dice «Accedé con una cuenta gratuita para comentar», escribir un texto y tocarlo lleva a `/registrarme` con el `redirect` correcto.
10. **Flujo completo de recuperación del borrador**: escribir sin sesión → registrarse por email en el mismo navegador (incluye activación por correo, `/completar-registro` y `/bienvenida`) → al terminar se vuelve al artículo, con scroll a `#comentarios` y el texto intacto en el textarea. Repetir con Google/OAuth.
11. Publicar, responder a un comentario propio y responder a esa respuesta → los tres quedan en un solo hilo de dos niveles, el tercero con «En respuesta a _Nombre_».
12. Like/unlike desde dos cuentas distintas → el contador refleja 2 y el estado del botón es correcto en cada sesión tras recargar.
13. Editar el propio comentario → aparece la marca de editado; borrarlo (con `ConfirmDialog`) → desaparece o queda como «Comentario eliminado» si tenía respuestas.
14. `/mi-cuenta/comentarios` lista los comentarios propios con link al artículo y los likes recibidos; el link abre el artículo en el ancla correcta.
15. Reportar un comentario desde otra cuenta → aparece en `/nexoat-admin/comentarios` filtrando por reportados; ocultarlo lo saca de la vista pública y deja una entrada en `/nexoat-admin/auditoria`.
16. Cuenta sin `name`: al comentar por primera vez se pide la firma, se guarda en el perfil y el comentario sale con ese nombre.
17. Desmarcar «Permitir comentarios» en un artículo → el formulario se reemplaza por el aviso de cerrados y los comentarios previos se siguen leyendo.
18. Artículo con paywall estando deslogueado → contenido recortado pero sección de comentarios completa y visible.
19. Responsive y tema oscuro: hilo con respuestas y avatares legible en móvil, sin desbordes; contraste correcto en ambos temas.
