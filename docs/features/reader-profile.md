# Perfil de lector — foto, tipo de usuario y mini-currículum profesional

**Estado:** implementado y verificado.

## Contexto

El menú de usuario del header (`components/ui/UserMenu.vue`, ver `sidebar-navigation.md`/commit de "menú de usuario mockeado") tiene cuatro ítems marcados "Pronto": Mi perfil, Artículos guardados, Historial de lectura, Preferencias de correo. Este documento planifica el primero: **Mi perfil**.

Hoy `User` (`auth-and-admin-dashboard.md`, `reader-accounts-and-paywall.md`) solo tiene `name`, `avatarUrl` (poblado por OAuth, no editable a mano) y `subscriptionTier`. No hay forma de que un lector:

1. Suba/cambie su propia foto de perfil.
2. Diga **quién es** dentro del público del sitio: Acompañante Terapéutico (o estudiante), Cuidador/a, Familiar, u Otro.
3. Si es AT o Cuidador/a, cargue un perfil profesional breve (área/especialización, experiencia, una bio corta) — un mini-currículum, no un CV completo.

## Por qué esto importa para el roadmap (no solo para esta pantalla)

El roadmap de producto (`CLAUDE.md`) menciona un futuro **directorio de acompañantes**. El perfil profesional que se arma acá es exactamente la base de datos que ese directorio va a necesitar — por eso el modelo se diseña ahora pensando en ese uso futuro (campo `isPublic`, ver más abajo), aunque el directorio en sí **no se construye en esta etapa**. Es la única pieza de este plan que mira más allá del pedido inmediato; el resto es estrictamente "Mi perfil".

## Decisiones de diseño

### 1. Nombres para el tipo de usuario

Se agrega un enum nuevo — **no confundir con `Role`** (permisos de administración) ni con `SubscriptionTier` (nivel de pago). Propuesta de nombre y etiquetas (a confirmar):

| Valor Prisma (`ProfileRole`) | Etiqueta en la UI                          |
| ---------------------------- | ------------------------------------------ |
| `acompanante_terapeutico`    | "Acompañante Terapéutico (o en formación)" |
| `cuidador`                   | "Cuidador/a"                               |
| `familiar`                   | "Familiar o allegado"                      |
| `otro`                       | "Otro"                                     |

`acompanante_terapeutico` cubre tanto AT en ejercicio como estudiantes — separarlos en dos opciones no aporta nada útil hoy (ambos acceden al mismo perfil profesional) y se puede partir más adelante si hace falta distinguir.

El campo es **opcional** (`ProfileRole?`, default `null`) — todo usuario existente y cualquier alta nueva (email u OAuth) nace sin elegir. La pantalla de perfil va a invitar a completarlo, pero no se fuerza en el registro (no bloquea el flujo de alta que ya funciona) ni en ningún otro flujo del sitio.

### 2. Perfil profesional como tabla aparte, no campos sueltos en `User`

Se agrega `ProfessionalProfile`, 1-a-1 con `User`, en vez de sumar más columnas a `User`:

- Solo aplica a 2 de los 4 `ProfileRole` (AT y Cuidador/a) — dejarlo en su propia tabla evita llenar `User` de columnas `null` para Familiar/Otro.
- Es el punto de extensión natural para el futuro directorio (ver arriba) sin volver a tocar `User`.

Campos (mini-currículum, deliberadamente simple — no adjuntos, no múltiples experiencias tipo LinkedIn):

- `specialization` (String, requerido): área o especialización principal — texto libre corto, ej. "Acompañamiento en primera infancia con TEA".
- `experienceYears` (Int?, opcional): años de experiencia.
- `bio` (String?, opcional, texto más largo): formación, trayectoria, enfoque de trabajo — el "sobre mí" tipo LinkedIn.
- `isPublic` (Boolean, default `false`): reservado para el futuro directorio. **En esta etapa no se expone en ningún endpoint público** — el campo se guarda pero no tiene ningún efecto visible todavía; se lo deja ya modelado para no migrar la tabla de nuevo cuando se construya el directorio.

Si un usuario cambia su `ProfileRole` a Familiar/Otro después de haber cargado un perfil profesional, el registro de `ProfessionalProfile` **no se borra automáticamente** (se conserva por si vuelve a AT/Cuidador/a) pero deja de mostrarse/editarse desde la pantalla de perfil.

### 3. Avatar: mismo patrón que las imágenes de artículo/categoría, carpeta nueva en Cloudinary

Se reusa `MediaService` (`media-uploads-cloudinary.md`) tal cual — ya es genérico por `folder`. Cambios:

- `MEDIA_FOLDERS` suma `'avatars'` (`nexoat/avatars/...` en Cloudinary).
- `User` suma `avatarPublicId String?` — mismo rol que `Article.coverImagePublicId`: permite borrar el asset viejo de Cloudinary al reemplazar o quitar la foto.
- **Endpoint nuevo, no el existente:** `/admin/media` exige rol `EDITOR+` (es para gestión editorial). La subida de avatar la hace cualquier lector autenticado sobre **su propio** usuario — necesita un endpoint distinto, sin `RolesGuard`, que ata la subida al usuario del token (no a un `id` arbitrario en la URL). Ver módulo `profile` más abajo.
- Mismo límite y validación que ya existe: máx. 5MB, `image/jpeg|png|webp|gif`. **Confirmado:** el `transformation` de optimización pasa a depender de la carpeta — `avatars` usa un tope de 512px (nunca se muestra más grande que eso en la UI) en vez de los 1920px de `articles`/`categories`, mismo `quality: 'auto:good', fetch_format: 'auto'` en los tres casos.

### 4. Endpoints de "mi perfil": módulo nuevo, no `UsersModule`

`backend/src/users/` es exclusivamente admin (`/admin/users`, requiere `ADMIN+`, gestiona **otros** usuarios). Esto es distinto: cada lector gestiona **su propio** registro. Se crea `backend/src/profile/` con rutas bajo `/me`, protegidas solo por `JwtAuthGuard` (cualquier rol autenticado, sin `RolesGuard`).

## Cambios de schema (`backend/prisma/schema.prisma`)

```prisma
enum ProfileRole {
  acompanante_terapeutico
  cuidador
  familiar
  otro
}

model User {
  // ...campos existentes...
  avatarPublicId      String? // Cloudinary — mismo rol que Article.coverImagePublicId
  profileRole         ProfileRole?
  professionalProfile ProfessionalProfile?
}

model ProfessionalProfile {
  id              String   @id @default(cuid())
  userId          String   @unique
  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  specialization  String
  experienceYears Int?
  bio             String?
  // Reservado para el futuro directorio de acompañantes — sin efecto hoy,
  // ver docs/features/reader-profile.md.
  isPublic        Boolean  @default(false)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@map("professional_profiles")
}
```

`toPublicUser` (`auth/auth.utils.ts`) no necesita cambios (sigue siendo "todo el User menos `passwordHash`"), pero si se agrega `professionalProfile` a la respuesta de `/auth/me` hay que incluirlo en el `include` de la query, no en el mapper.

## Backend — módulos a crear/tocar

| Archivo                                                  | Cambio                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `media/media.service.ts`                                 | `MEDIA_FOLDERS` suma `'avatars'`; `OPTIMIZED_TRANSFORMATION` pasa a resolverse por carpeta (`avatars` → tope 512px, `articles`/`categories` → 1920px como hoy).                                                                                                                                                                                                                                                                                                                      |
| `profile/profile.module.ts` (nuevo)                      | Registra controller + service, importa `MediaModule` y `PrismaModule`.                                                                                                                                                                                                                                                                                                                                                                                                               |
| `profile/profile.controller.ts` (nuevo)                  | `@Controller('me')`, `@UseGuards(JwtAuthGuard)` (sin `RolesGuard` — cualquier rol). `GET /me/profile` (perfil completo incl. `professionalProfile`), `PATCH /me/profile` (name, profileRole), `POST /me/profile/avatar` (multipart, mismo patrón que `MediaController.upload`), `DELETE /me/profile/avatar`, `PUT /me/profile/professional` (upsert specialization/experienceYears/bio/isPublic — 400 si `profileRole` actual no es AT/Cuidador), `DELETE /me/profile/professional`. |
| `profile/dto/update-profile.dto.ts` (nuevo)              | `name?`, `profileRole?` (enum validado con `@IsEnum`).                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `profile/dto/update-professional-profile.dto.ts` (nuevo) | `specialization` (requerido, `@MaxLength`), `experienceYears?` (`@IsInt @Min(0) @Max(80)`), `bio?` (`@MaxLength` generoso, ej. 2000), `isPublic?` (bool).                                                                                                                                                                                                                                                                                                                            |
| `profile/profile.service.ts` (nuevo)                     | Lógica de arriba + limpieza de Cloudinary (borra `avatarPublicId` viejo al reemplazar/quitar, mismo cuidado que `AdminArticleFormView` de subir-antes-de-borrar si conviene hacerlo también acá o alcanza con manejar el error).                                                                                                                                                                                                                                                     |
| `app.module.ts`                                          | Importa `ProfileModule`.                                                                                                                                                                                                                                                                                                                                                                                                                                                             |

No se toca `AuthController`/`AuthService` — `register`/`login` siguen igual, el perfil se completa después desde `/me/profile`.

## Frontend — archivos a crear/tocar

| Archivo                                                         | Cambio                                                                                                                                                                                                                                                                                                                               |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `types/auth.ts`                                                 | `ProfileRole` (union type, valores iguales al enum Prisma), `ProfessionalProfile` interface, `AuthUser` suma `profileRole: ProfileRole \| null` y `professionalProfile?: ProfessionalProfile \| null`.                                                                                                                               |
| `services/profile.api.ts` (nuevo)                               | `getProfile()`, `updateProfile(dto)`, `uploadAvatar(file)`, `deleteAvatar()`, `upsertProfessionalProfile(dto)`, `deleteProfessionalProfile()` — wrappers sobre `http`/`httpBlob` como el resto de `services/`.                                                                                                                       |
| `stores/auth.ts`                                                | `fetchMe()` ya trae el `User` completo desde `/auth/me` — si ese endpoint no incluye `professionalProfile`, `ProfileView` lo pide aparte con `getProfile()`. Se agrega un `updateLocalUser(patch)` para reflejar cambios sin refetch completo.                                                                                       |
| `router/index.ts`                                               | Ruta nueva `/mi-cuenta/perfil` (`name: 'my-profile'`), meta `{ requiresAuth: true, title: 'Mi perfil' }`; `beforeEach` suma una rama para `to.meta.requiresAuth` (redirect a `/ingresar?redirect=...` si no hay sesión, igual patrón que el guard admin ya existente).                                                               |
| `views/ProfileView.vue` (nuevo)                                 | Formulario: avatar (preview + subir/quitar, mismo patrón que `AdminArticleFormView`), nombre, selector de `ProfileRole` (4 opciones), y si es AT/Cuidador un bloque "Perfil profesional" (especialización, años de experiencia, bio) que aparece/desaparece según el rol elegido. Sigue el skill de diseño (`nexoat-design-system`). |
| `components/ui/UserMenu.vue`, `components/layout/AppHeader.vue` | El ítem "Mi perfil" deja de estar en `mockItems`/`accountItems` (inerte) y pasa a ser un `RouterLink` real a `/mi-cuenta/perfil`, igual que ya son "Planes y suscripción"/"Panel de administración". Los otros tres ítems siguen mockeados.                                                                                          |

## Fuera de alcance de esta etapa

- El **directorio de acompañantes** en sí (listado público de perfiles `isPublic`) — el campo se modela, no se construye la pantalla ni el endpoint público.
- Los otros tres ítems del menú de usuario (Artículos guardados, Historial de lectura, Preferencias de correo) — quedan mockeados, son planes aparte.
- Verificación de identidad/credenciales del AT (matrícula, título) — el campo `specialization`/`bio` es autodeclarado, sin validación de veracidad.

## Plan de verificación

1. `pnpm --filter @nexoat/backend db:migrate` → confirmar columnas nuevas en `users` y la tabla `professional_profiles`.
2. Test de backend (`profile.service.spec.ts`): `PUT /me/profile/professional` con `profileRole: familiar` → rechaza (400).
3. Test de backend: `PUT /me/profile/professional` con `profileRole: acompanante_terapeutico` o `cuidador` → guarda y devuelve el registro.
4. Test de backend: un usuario no puede tocar el perfil de otro (no hay `id` en la URL, todo cuelga del `req.user` del token — confirmar que no hay forma de pasar un `userId` ajeno).
5. Manual: subir avatar → aparece en Cloudinary (`nexoat/avatars`) y se ve en `UserMenu`/`AppHeader`/`ProfileView`; reemplazar → el viejo se borra de Cloudinary; quitar → vuelve a iniciales, sin asset huérfano.
6. Manual: elegir cada uno de los 4 `ProfileRole` → el bloque de perfil profesional aparece solo para AT/Cuidador; completarlo y guardar → persiste al recargar.
7. Manual: acceder a `/mi-cuenta/perfil` sin sesión → redirige a `/ingresar?redirect=/mi-cuenta/perfil`; tras iniciar sesión, vuelve ahí.
