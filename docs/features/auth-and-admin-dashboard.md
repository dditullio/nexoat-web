# Gestión de usuarios robusta + Dashboard admin (`/nexoat-admin`)

**Estado:** documentado, pendiente de implementar. Este documento es la especificación completa para que una sesión de desarrollo (con o sin el historial de chat que lo originó) pueda implementarlo sin ambigüedad.

## Contexto

NexoAT hoy es un sitio 100% estático en el frontend: los artículos viven en `frontend/src/data/mockArticles.ts` y se cargan al store de Pinia por `App.vue` en el arranque. El backend (`backend/`) es apenas un scaffold NestJS con un `AppController`/`AppService` de health-check y un `schema.prisma` con `Category`/`Tag`/`Article`/`ArticleTag`, pero **sin `PrismaService`, sin auth, sin ningún módulo de negocio**.

El roadmap del proyecto prioriza: 1) backend para poder subir/mantener artículos, 2) bolsa de trabajo, 3) directorio de acompañantes, 4) cuentas de usuario. Esta funcionalidad adelanta y unifica la pieza de autenticación (etapa 4) porque es prerrequisito de todo lo demás: sin usuarios con roles no hay forma de restringir quién administra el sitio, y las etapas futuras (bolsa de trabajo, directorio) van a reutilizar el mismo sistema de cuentas en vez de crear uno nuevo por función.

**Stack:** monorepo pnpm workspaces (`frontend` + `backend`), NestJS (backend, Fastify adapter) + Vue 3 + Composition API + Pinia (frontend). Sin cambios respecto al scaffold actual.

## Alcance acordado

- Backend robusto y completo para las 4 áreas: autenticación, artículos, usuarios, auditoría, suscripciones.
- Frontend admin: shell + login (email/contraseña y botones OAuth condicionados a que el backend los tenga configurados) + sección de **Artículos completamente funcional** (CRUD real, conectada de punta a punta, reemplazando los datos mock del blog público).
- Frontend admin: Usuarios, Auditoría y Suscripciones como **vistas funcionales simples** (listado + acciones básicas) — se pulen visualmente en una pasada posterior.
- **Sin proveedor de email todavía** → sin verificación de email obligatoria ni reset de contraseña por correo en esta etapa (se agrega después sin tocar el resto del sistema). El primer `SUPER_ADMIN` se crea por seed script, no por auto-registro público.
- OAuth (Google/Facebook): cableado completo mirando variables de entorno, pero **activado condicionalmente** — si no están seteadas las credenciales, esos botones no aparecen en el login y el registro/login por email funciona igual. Así no bloquea el desarrollo por no tener las apps de Google/Facebook creadas todavía.

**Explícitamente fuera de alcance de esta etapa** (no implementar todavía):

- Verificación de email obligatoria y reset de contraseña por correo (esperan proveedor de email — a definir en el futuro).
- Pulido visual fino de Usuarios/Auditoría/Suscripciones.
- Bolsa de trabajo y directorio de acompañantes (etapas futuras del roadmap; no dependen de bloquear esto, pero reutilizarán este mismo sistema de cuentas).

## Decisiones técnicas y su razón de ser

### Tokens de sesión

JWT de acceso de vida corta (15 min, guardado en memoria en el store de Pinia — **nunca en `localStorage`**, para reducir superficie de robo por XSS) + refresh token opaco de vida larga (30 días), **rotado en cada uso**, guardado hasheado (SHA-256 — es solo para lookup rápido en DB, no necesita el costo de un hash de contraseña) en la tabla `RefreshToken`, entregado al navegador como cookie `httpOnly` + `Secure` (solo en producción) + `SameSite=Lax`, con el `path` acotado al endpoint de refresh (defensa en profundidad: la cookie no viaja en cada request, solo cuando se llama a `/v1/auth/refresh`).

Implica: `credentials: true` en la config de CORS del backend, y `credentials: 'include'` en todas las llamadas del cliente HTTP del frontend.

### Hashing de contraseña: `bcryptjs`, no `bcrypt` ni `argon2`

`backend/Dockerfile` instala dependencias de producción con `pnpm install --frozen-lockfile --filter @nexoat/backend... --prod`, sin toolchain de compilación (no hay `apk add build-base python3` en la imagen `node:20-alpine`). Un binding nativo (`bcrypt`, `argon2`) rompería ese build tal como está hoy. `bcryptjs` es JS puro, algo más lento pero funciona en cualquier entorno sin tocar el Dockerfile. **Si en el futuro se quiere migrar a `argon2`, hay que agregar el toolchain de build a la imagen builder primero.**

### Roles y matriz de permisos

`enum Role { SUPER_ADMIN ADMIN EDITOR USER }`. `USER` es el default de cualquier alta por email u OAuth — es el rol de un usuario común (futuro acompañante, familia, postulante a la bolsa de trabajo), **no** implica ningún acceso al admin.

| Acción                                                   | Rol mínimo requerido |
| -------------------------------------------------------- | -------------------- |
| CRUD de artículos/categorías/tags (`/admin/articles/*`)  | `EDITOR`             |
| Ver listado de usuarios, ver auditoría, ver suscriptores | `ADMIN`              |
| Cambiar el **rol** o el estado activo de otro usuario    | `SUPER_ADMIN`        |

El cambio de rol se restringe a `SUPER_ADMIN` específicamente (no `ADMIN`) para que un `ADMIN` comprometido o malintencionado no pueda autopromoverse a `SUPER_ADMIN` ni promover a un cómplice.

### Bootstrap del primer admin

`backend/package.json` ya referencia `"db:seed": "ts-node prisma/seed.ts"`, pero **ese archivo no existe todavía** — hay que crearlo. Debe:

1. Crear/actualizar (upsert, idempotente) un usuario `SUPER_ADMIN` a partir de las variables de entorno `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`.
2. Sembrar las 10 categorías que el frontend ya usa (mismos `slug` que `frontend/src/stores/blog.ts` → array `CATEGORIES`: `acompanamiento-terapeutico`, `guia-cuidador`, `cuidar-al-cuidador`, `neurodiversidad-y-discapacidad`, `familia-y-vinculos`, `salud-mental`, `patologias-en-la-vejez`, `sistema-de-salud-y-recursos`, `herramientas-practicas`, `evidencia-en-foco`), para que el selector de categoría del admin tenga datos reales desde el primer momento y los slugs coincidan con lo que ya espera el frontend público.

Sin esto no hay forma de entrar al admin la primera vez, porque el registro público solo puede crear usuarios `USER`.

### Rate limiting

`@nestjs/throttler` con un límite global razonable + un límite más estricto específicamente en `POST /auth/login` y `POST /auth/register` (mitigación de fuerza bruta / credential stuffing — parte de que la gestión de usuarios sea "robusta", no solo funcional).

### Auditoría

Un `AuditService.record({ actorId, action, entityType?, entityId?, metadata?, ip? })` genérico, invocado **explícitamente** (no vía interceptor mágico) desde los services de `users` y `articles` en cada mutación: alta, edición, borrado, cambio de rol/estado, cambio de status de artículo (publicar/archivar). No se audita tráfico de lectura — solo lo que cambia estado.

### Contenido de artículo: Markdown renderizado en el cliente

El campo `Article.content` sigue siendo `String` en Prisma (Markdown plano, sin cambio de tipo). Se agrega `marked` (sin dependencias transitivas) para convertirlo a HTML — tanto en el preview del editor admin como en `ArticleView.vue` del sitio público, que hoy solo muestra un placeholder fijo (buscar el texto `El contenido del artículo se cargará acá` en ese archivo). Se agrega `dompurify` para sanitizar ese HTML antes de inyectarlo con `v-html` — defensa en profundidad: aunque solo `EDITOR+` puede escribir contenido, sanitizar evita que un paste accidental de HTML sin escapar o una cuenta admin comprometida se conviertan en XSS almacenado contra visitantes públicos.

### Diseño visual del admin

Debe seguir el skill de proyecto `.claude/skills/nexoat-design-system/SKILL.md` — mismos tokens de color (paleta salvia/arcilla/ocre), tipografía (Fraunces + Karla), tema claro/oscuro ya implementados. La diferencia es de **composición**, no de paleta: el admin es una interfaz densa (sidebar + tablas + formularios), no la estética editorial abierta del blog público — nada de arcos decorativos ni orbes difusos ahí, pero sí los mismos `--color-*`, radios y sombras.

`App.vue` debe elegir entre el layout público (`AppHeader`/`AppFooter` actuales) y un `AdminLayout` nuevo según `route.meta.layout`.

## Cambios de schema (`backend/prisma/schema.prisma`)

Se agregan estos modelos/enums junto a lo ya existente (`Category`, `Tag`, `Article`, `ArticleTag`, que **se mantienen sin romper compatibilidad**):

```prisma
enum Role {
  SUPER_ADMIN
  ADMIN
  EDITOR
  USER
}

enum AuthProvider {
  EMAIL
  GOOGLE
  FACEBOOK
}

model User {
  id            String         @id @default(cuid())
  email         String         @unique
  emailVerified DateTime?
  name          String?
  avatarUrl     String?
  passwordHash  String?        // null si es cuenta 100% OAuth
  role          Role           @default(USER)
  isActive      Boolean        @default(true)
  accounts      OAuthAccount[]
  refreshTokens RefreshToken[]
  articles      Article[]      @relation("ArticleAuthor")
  auditLogs     AuditLog[]     @relation("AuditActor")
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt

  @@map("users")
}

model OAuthAccount {
  id             String       @id @default(cuid())
  provider       AuthProvider
  providerUserId String
  userId         String
  user           User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  createdAt      DateTime     @default(now())

  @@unique([provider, providerUserId])
  @@index([userId])
  @@map("oauth_accounts")
}

model RefreshToken {
  id        String    @id @default(cuid())
  tokenHash String    @unique
  userId    String
  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  userAgent String?
  ip        String?
  expiresAt DateTime
  revokedAt DateTime?
  createdAt DateTime  @default(now())

  @@index([userId])
  @@map("refresh_tokens")
}

model AuditLog {
  id         String   @id @default(cuid())
  actorId    String?
  actor      User?    @relation("AuditActor", fields: [actorId], references: [id], onDelete: SetNull)
  action     String   // ej: "article.publish", "user.role_change"
  entityType String?  // ej: "Article", "User"
  entityId   String?
  metadata   Json?
  ip         String?
  createdAt  DateTime @default(now())

  @@index([actorId])
  @@index([entityType, entityId])
  @@index([createdAt])
  @@map("audit_logs")
}

model NewsletterSubscriber {
  id             String    @id @default(cuid())
  email          String    @unique
  isActive       Boolean   @default(true)
  source         String?   // ej: "homepage-hero", "footer"
  subscribedAt   DateTime  @default(now())
  unsubscribedAt DateTime?

  @@map("newsletter_subscribers")
}
```

Y en el modelo `Article` ya existente, agregar el vínculo al autor:

```prisma
model Article {
  // ...campos existentes sin cambios...
  authorId String?
  author   User?   @relation("ArticleAuthor", fields: [authorId], references: [id], onDelete: SetNull)
}
```

Al implementar: correr `pnpm --filter @nexoat/backend db:migrate` para generar la migración (nombre sugerido: `add_users_auth_audit_newsletter`).

## Backend (`backend/src`) — módulos a crear

Todos los endpoints van bajo el prefijo `/v1` ya configurado en `main.ts` (`app.enableVersioning`).

| Módulo        | Contenido                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `prisma/`     | `PrismaService` + `PrismaModule`. **No existe todavía — es la base de todo lo demás**, ningún otro módulo puede escribir a la DB sin esto.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `auth/`       | `AuthModule`, `AuthController` con `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `GET /auth/me`, `GET /auth/providers` (le dice al frontend qué botones OAuth mostrar), `GET /auth/google` + `GET /auth/google/callback` y sus análogos `facebook`, **registrados solo si** `GOOGLE_CLIENT_ID`/`FACEBOOK_CLIENT_ID` están seteadas en el entorno. `AuthService` (hashing, emisión/rotación de tokens). Estrategias Passport: `jwt` (valida access token), `jwt-refresh` (lee la cookie de refresh), `local` (email+contraseña), `google`/`facebook` (condicionales). Guards: `JwtAuthGuard`, `RolesGuard`. Decorators: `@Roles(...)`, `@CurrentUser()`. |
| `users/`      | CRUD admin: `GET /admin/users` (listado paginado/filtrable), `PATCH /admin/users/:id` (rol y/o estado activo — el cambio de **rol** exige `@Roles(SUPER_ADMIN)`, el resto `@Roles(ADMIN, SUPER_ADMIN)`).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `articles/`   | Endpoints públicos: `GET /articles` y `GET /articles/:slug` (solo `status: publicado`). Endpoints admin bajo `/admin/articles`: CRUD completo (`@Roles(EDITOR, ADMIN, SUPER_ADMIN)`), incluye gestión de categorías/tags y findOrCreate de tags por slug al guardar un artículo.                                                                                                                                                                                                                                                                                                                                                                                                                |
| `audit/`      | `AuditService.record()` reutilizable desde otros services + `GET /admin/audit-logs` (`@Roles(ADMIN, SUPER_ADMIN)`, filtrable por actor/tipo de entidad/rango de fecha).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `newsletter/` | `POST /newsletter/subscribe` público (reemplaza el fake `submitted.value = true` de `HomeView.vue`) + `GET /admin/newsletter/subscribers` (`@Roles(ADMIN, SUPER_ADMIN)`).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `mail/`       | `MailService` con una única implementación "no-op" por ahora (loguea en vez de enviar de verdad). Punto de extensión para cuando haya proveedor de email — no bloquea el resto.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |

Cambios en `main.ts`: registrar el plugin `@fastify/cookie`, y agregar `credentials: true` a `app.enableCors({...})`.

## Frontend (`frontend/src`) — archivos a crear/tocar

| Archivo                                                                                         | Qué hace                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| ----------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `stores/auth.ts` (nuevo)                                                                        | Pinia store: `user`, `accessToken` (en memoria, nunca `localStorage`), `login()`, `logout()`, `fetchMe()`, `refresh()` (silent refresh al bootear la app vía la cookie httpOnly de refresh).                                                                                                                                                                                                                                                                                                                     |
| `services/http.ts` (nuevo)                                                                      | Wrapper sobre `fetch` nativo — **sin sumar `axios`** como dependencia (el frontend hoy solo depende de `pinia`, `vue`, `vue-router`; mantenerlo así es intencional). Agrega el header `Authorization`, y ante un 401 dispara `refresh()` una vez y reintenta la request original.                                                                                                                                                                                                                                |
| `services/admin/articles.api.ts`, `users.api.ts`, `audit.api.ts`, `subscribers.api.ts` (nuevos) | Llamadas tipadas a los endpoints admin correspondientes, usando `services/http.ts`.                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `router/index.ts`                                                                               | Agregar árbol de rutas bajo `/nexoat-admin`: `login`, ``(dashboard),`articulos`, `articulos/nuevo`, `articulos/:id`, `usuarios`, `auditoria`, `suscripciones`. Todas lazy-loaded (mismo patrón `() => import(...)`que ya usan las rutas públicas). Todas con`meta: { layout: 'admin' }`salvo diferenciar`login`(no requiere sesión). Agregar un`router.beforeEach`que, para cualquier ruta bajo`/nexoat-admin`distinta de`login`, exija sesión activa y rol mínimo — si falla, redirige a `/nexoat-admin/login`. |
| `App.vue`                                                                                       | Elegir `AppHeader`/`AppFooter` (layout público actual) o el nuevo `AdminLayout` según `route.meta.layout`. Llamar `authStore.refresh()` al montar, junto al `themeStore.init()` que ya existe. **Dejar de importar `mockArticles`** — ver fila de `stores/blog.ts`.                                                                                                                                                                                                                                              |
| `layouts/AdminLayout.vue` (nuevo)                                                               | Sidebar con navegación (Artículos, Usuarios, Auditoría, Suscripciones) + topbar con usuario logueado y logout. Sigue los tokens del skill de diseño en modo denso, no la estética del blog público.                                                                                                                                                                                                                                                                                                              |
| `views/admin/AdminLoginView.vue` (nuevo)                                                        | Formulario email+contraseña + botones "Continuar con Google"/"Continuar con Facebook" que solo se renderizan si `GET /auth/providers` los reporta habilitados.                                                                                                                                                                                                                                                                                                                                                   |
| `views/admin/AdminDashboardView.vue` (nuevo)                                                    | Vista de inicio del admin (resumen/accesos rápidos a las 4 secciones).                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `views/admin/AdminArticlesView.vue` + `AdminArticleFormView.vue` (nuevos)                       | Listado con filtros (status, categoría, búsqueda) + formulario de alta/edición con editor Markdown y preview en vivo usando la clase `.prose` ya existente, renderizado con `marked` + `dompurify`.                                                                                                                                                                                                                                                                                                              |
| `views/admin/AdminUsersView.vue` (nuevo)                                                        | Listado de usuarios + acción de cambiar rol/estado activo (solo visible/habilitada si el usuario logueado es `SUPER_ADMIN` para el cambio de rol).                                                                                                                                                                                                                                                                                                                                                               |
| `views/admin/AdminAuditView.vue` (nuevo)                                                        | Tabla de solo lectura del log de auditoría, con filtros básicos.                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `views/admin/AdminSubscribersView.vue` (nuevo)                                                  | Listado de suscriptores al newsletter.                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `stores/blog.ts`                                                                                | `loadArticles()` deja de recibir el array mock; se agregan `fetchArticles()` y `fetchCategories()` que golpean la API real. Las categorías que devuelve la API (`slug`, `name`, `description`) se siguen mergeando en el frontend con `CATEGORY_THEMES` de `utils/theme.ts` por `slug` — **el tema visual de cada categoría (color, ícono, gradiente) sigue viviendo 100% en el frontend**, por diseño: es presentación, no contenido, y así lo estableció el skill de diseño.                                   |
| `views/ArticleView.vue`                                                                         | Reemplazar el placeholder de contenido (buscar `El contenido del artículo se cargará acá`) por el Markdown real renderizado con `marked` + sanitizado con `dompurify`, reutilizando la clase `.prose`.                                                                                                                                                                                                                                                                                                           |
| `views/HomeView.vue`                                                                            | La función `subscribe()` del formulario de newsletter deja de simular el éxito localmente (`submitted.value = true`) y pasa a llamar `POST /newsletter/subscribe`.                                                                                                                                                                                                                                                                                                                                               |

## Dependencias nuevas a instalar

**`backend`:**

```
@nestjs/jwt @nestjs/passport passport passport-jwt passport-local
passport-google-oauth20 passport-facebook @fastify/cookie bcryptjs
@nestjs/throttler marked
```

Más sus tipos de desarrollo: `@types/passport-jwt @types/passport-local @types/passport-google-oauth20 @types/passport-facebook @types/bcryptjs`.

**`frontend`:**

```
marked dompurify
```

Más `@types/dompurify` si el paquete no trae tipos propios (verificar al instalar — versiones recientes de `dompurify` incluyen tipos).

## Variables de entorno nuevas (agregar a `.env.example` en la raíz del repo)

```env
# Auth
JWT_ACCESS_SECRET=
JWT_REFRESH_SECRET=

# Bootstrap del primer super-admin (usado por prisma/seed.ts)
SEED_ADMIN_EMAIL=
SEED_ADMIN_PASSWORD=

# OAuth — opcionales; si faltan, esos botones no aparecen en el login admin
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
FACEBOOK_CLIENT_ID=
FACEBOOK_CLIENT_SECRET=
```

`JWT_ACCESS_SECRET`/`JWT_REFRESH_SECRET` deben ser strings largos y aleatorios distintos entre sí (ej. `openssl rand -hex 32`), nunca commiteados con un valor real — `.env.example` solo debe traer las claves vacías.

## Docker

`backend/Dockerfile`: el `CMD` final (`["node", "backend/dist/main"]`) debe pasar a aplicar las migraciones antes de arrancar, porque hoy el contenedor de producción nunca las corre. Intención (ajustar sintaxis exacta al implementar, verificando que `prisma` esté disponible en el stage `runner`):

```dockerfile
CMD ["sh", "-c", "npx prisma migrate deploy --schema=./backend/prisma/schema.prisma && node backend/dist/main"]
```

## Plan de verificación (al implementar)

1. `pnpm --filter @nexoat/backend db:migrate` + `pnpm --filter @nexoat/backend db:seed` contra el Postgres de `docker-compose.dev.yml` → confirmar en Prisma Studio (`pnpm --filter @nexoat/backend db:studio`) que existen el usuario `SUPER_ADMIN` y las 10 categorías con los slugs correctos.
2. `pnpm --filter @nexoat/backend test` — cubrir como mínimo `auth.service`, `roles.guard`, `articles.service`, `users.service`.
3. Levantar el backend (`pnpm --filter @nexoat/backend start:dev`) y su Swagger en `/api/docs` → probar a mano `register` → `login` → `refresh` → `me` → `logout`.
4. `pnpm --filter frontend test` + `pnpm --filter frontend type-check`.
5. Con backend y frontend corriendo: loguearse en `/nexoat-admin/login` con el admin sembrado, crear y publicar un artículo desde el admin, y confirmar que aparece en el blog público (`/`, `/categoria/:slug`, `/articulo/:slug`) con el contenido Markdown correctamente renderizado. Este es el criterio de éxito central — cierra el ciclo que motivó todo el trabajo (poder mantener el blog sin tocar código).
6. Confirmar que **sin** `GOOGLE_CLIENT_ID`/`FACEBOOK_CLIENT_ID` seteados, el login sigue funcionando por email y los botones de esos proveedores no se muestran en `AdminLoginView`.
7. Confirmar la matriz de permisos a mano: un usuario `EDITOR` puede crear/editar artículos pero un `GET /admin/users` le devuelve 403; un `ADMIN` puede ver usuarios pero un `PATCH /admin/users/:id` cambiando `role` le devuelve 403; solo `SUPER_ADMIN` puede cambiar roles.
