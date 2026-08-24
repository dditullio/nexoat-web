# Registro en dos pasos (email → activar) + onboarding

**Estado:** implementado y verificado.

## Contexto

El registro por email hoy es un único paso (`RegisterDto`: email + contraseña + nombre → cuenta y sesión de una). Se reemplaza por el patrón habitual (Slack/Notion/Linear): pedir solo el email, mandar un link de activación, y recién al confirmarlo pedir nombre y contraseña. OAuth no cambia (Google/Facebook ya verifican el email). Después de cualquiera de los dos caminos, un onboarding corto de hasta 3 pasos.

## Decisiones

### 1. La verificación de email pasa de opcional a obligatoria — a propósito

`email-verification-and-password-reset.md` documentó la verificación como "opcional, no bloqueante". Este cambio la vuelve **obligatoria por construcción** para altas por email: no se puede poner contraseña sin haber clickeado el link. Es una decisión consciente, no un descuido — reemplaza la decisión anterior, no la complementa. OAuth sigue sin verificación explícita (el proveedor ya la hizo).

### 2. Cuenta "pendiente" = mismo estado que ya usan las cuentas 100% OAuth

Al pedir el alta se crea el `User` de una (`passwordHash: null`) — no hace falta una tabla de "registros pendientes" aparte. `validateLocalUser` ya rechaza cualquier cuenta sin `passwordHash` (es el mismo guard que protege a las cuentas OAuth-only); una cuenta pendiente ya es inutilizable para loguearse sin código nuevo.

### 3. Mismo mecanismo de token que el reset de contraseña, un `type` más

`VerificationToken` suma `account_activation` a su enum `type`. Mismo patrón: token de un solo uso, hash guardado, expiración (24h, igual que `email_verification`).

### 4. Reintentar el alta con un email ya registrado nunca lo revela

`POST /auth/signup` con un email que ya tiene cuenta completa responde igual `{ ok: true }` (anti-enumeración, mismo criterio que `forgot-password`), pero manda un email distinto ("ya tenés cuenta, ¿ingresar o recuperar tu contraseña?") en vez del de activación. Con un email que ya tiene una cuenta _pendiente_ (alguien pidió el alta y no completó), se reenvía un token de activación nuevo — idempotente, como `NewsletterService.subscribe`.

### 5. `POST /auth/register` se elimina, no se deja como alias

Nada más en el repo lo llama aparte de `RegisterView.vue`, que se reescribe. Se borra `AuthService.register`/`RegisterDto` en vez de dejarlos muertos — mismo criterio de higiene que ya se aplicó con `NewsletterModal.vue` (mejor un componente vivo reusado que uno abandonado; acá es al revés: mejor borrar un endpoint muerto que dejarlo).

### 6. Onboarding: paso 1+2 son un solo request atómico; el paso 3 es aparte y opcional

- **Paso 1** (tipo de usuario) y **paso 2** (términos + newsletter) se completan en una sola pantalla-wizard del lado del cliente, pero se guardan juntos recién al terminar el paso 2 (`POST /me/onboarding/complete`). Así no queda un estado intermedio raro (alguien que eligió tipo de usuario pero abandonó antes de aceptar términos) — mientras no se llame ese endpoint, el guard del router lo sigue mandando de vuelta al paso 1.
- **Paso 3** (perfil profesional, solo AT/Cuidador) reusa `PUT /me/profile/professional` tal cual, sin endpoint nuevo. Es salteable — "más tarde desde tu perfil" navega directo, sin guardar nada.
- Confirmado con vos: los pasos 1-2 son obligatorios y sin poder saltear — mientras `onboardingCompletedAt` sea `null`, el guard del router redirige a `/bienvenida` desde **cualquier** página pública (no solo las que ya exigían sesión).

### 7. Newsletter del onboarding: checkbox sin marcar por defecto

Confirmado con vos — opt-in real, no por omisión. Mejor pie legal (Ley 25.326 viene alineándose con el criterio de consentimiento afirmativo de GDPR) y mejor reputación de envío en Resend a largo plazo (una lista más chica pero de gente que de verdad lo pidió tiene menos quejas/rebotes que una inflada por defaults).

### 8. `onboardingCompletedAt` es un campo propio, no derivado de `profileRole`

`ProfileRole` ya se puede volver a `null` desde `/mi-cuenta/perfil` ("Enviar `null` para volver a 'sin elegir'", ver `update-profile.dto.ts`) — si "onboarding completo" se derivara de `profileRole !== null`, alguien que edita su perfil después y vuelve a "sin elegir" quedaría atrapado de nuevo en el onboarding forzado. Por eso es un timestamp aparte que, una vez seteado, no se vuelve a tocar.

### 9. Usuarios existentes no pasan por el onboarding retroactivamente

Migración: todo `User` ya existente recibe `onboardingCompletedAt = now()` (no se los fuerza a elegir tipo de usuario ni a aceptar términos retroactivamente). `termsAcceptedAt` queda `null` para ellos a propósito — nunca los hicimos aceptar nada, no se simula que sí. La exigencia de aceptar términos aplica solo hacia adelante, para altas nuevas.

### 10. Nombre: un solo campo, no nombre+apellido separados

Todo el resto del sitio (`ProfileView`, admin de usuarios, `toPublicUser`) ya trabaja con `User.name` como un único string. Separar nombre/apellido es un cambio de schema más invasivo (tocaría todo lo que muestra el nombre) que no está pedido en ningún otro lado — se mantiene un solo campo "Nombre completo" en el formulario de activación, por consistencia con el resto del sitio.

### 11. Términos y Privacidad: primer borrador, no texto legal final

Se escribe `/terminos` con contenido honesto sobre qué datos junta el sitio hoy (cuenta, Cloudinary para imágenes, Resend para email, Umami sin cookies) y para qué — pero **no reemplaza una revisión legal real**. Se marca explícitamente como borrador pendiente de esa revisión antes de considerarlo definitivo.

### 12. Deliverability: `MailService.send` suma una alternativa en texto plano

Resend arma el email solo con `html` si no se le pasa `text` — un fallback multipart/text mejora cómo lo tratan varios filtros de spam. Se agrega un cuarto parámetro opcional (`send(to, subject, html, text?)`) — no rompe ningún caller existente (todos siguen mandando solo HTML). Se usa en el email de activación, el caso que más importa acá porque **si cae en spam, la persona ni siquiera puede terminar de crear la cuenta**. El texto del email también avisa explícitamente "revisá spam/correo no deseado" — no hay forma de garantizar entrega, así que se avisa de antemano.

## Schema (`backend/prisma/schema.prisma`)

```prisma
enum VerificationTokenType {
  email_verification
  password_reset
  account_activation // nuevo
}

model User {
  // ...campos existentes...
  termsAcceptedAt      DateTime? // null = nunca aceptó (cuentas viejas, a propósito)
  onboardingCompletedAt DateTime? // null = todavía tiene que pasar por /bienvenida
}
```

## Backend

| Archivo                                                                                          | Cambio                                                                                                                                                                                                                                                                                                                                                  |
| ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `auth/auth.service.ts`                                                                           | Se borra `register`. Nuevos: `requestSignup(email)` (crea/reusa cuenta pendiente, manda activación o el email de "ya tenés cuenta"), `completeSignup(token, name, password)` (consume el token, setea `passwordHash`/`name`/`emailVerified`, devuelve tokens de sesión igual que `login`).                                                              |
| `auth/dto/request-signup.dto.ts`, `complete-signup.dto.ts` (nuevos)                              | Reemplazan a `register.dto.ts` (se borra). `CompleteSignupDto` valida `password === passwordConfirm` con un validator custom de `class-validator`.                                                                                                                                                                                                      |
| `auth/auth.controller.ts`                                                                        | `POST /auth/register` se borra. Nuevos `POST /auth/signup`, `POST /auth/signup/complete` (mismo `@Throttle` que login/register tenían).                                                                                                                                                                                                                 |
| `mail/templates/activate-account.template.ts` (nuevo)                                            | Botón "Activar mi cuenta" + aviso explícito de revisar spam. Versión `text` incluida.                                                                                                                                                                                                                                                                   |
| `mail/templates/already-registered.template.ts` (nuevo)                                          | "Ya tenés una cuenta con este email" + links a ingresar/recuperar contraseña.                                                                                                                                                                                                                                                                           |
| `mail/mail.service.ts`                                                                           | `send(to, subject, html, text?)` — `text` opcional, se lo pasa a Resend si viene.                                                                                                                                                                                                                                                                       |
| `profile/`                                                                                       | Sin cambios de código — `PATCH /me/profile` y `PUT /me/profile/professional` ya existen y se reusan tal cual desde el onboarding.                                                                                                                                                                                                                       |
| `onboarding/` (módulo nuevo — `onboarding.controller.ts`, `onboarding.service.ts`)               | `POST /me/onboarding/complete` — `{ profileRole, acceptedTerms: true, subscribeNewsletter }`. 400 si `acceptedTerms` no es `true`. Setea `profileRole`, `termsAcceptedAt`, `onboardingCompletedAt` en un solo `update`; si `subscribeNewsletter`, llama `NewsletterService.subscribe` (por eso `NewsletterModule` pasa a exportar `NewsletterService`). |
| Script de migración (dentro de la migración de Prisma, un `UPDATE` directo, no un script aparte) | `UPDATE users SET onboarding_completed_at = now() WHERE onboarding_completed_at IS NULL` — corre una sola vez, en la propia migración SQL.                                                                                                                                                                                                              |

## Frontend

| Archivo                                | Cambio                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `stores/auth.ts`                       | `register()` se borra. Nuevos: `requestSignup(email)`, `completeSignup(token, name, password, passwordConfirm)`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `views/RegisterView.vue`               | Pasa a ser el paso 1: solo email. Al enviar, pantalla "Revisá tu correo" con aviso explícito de mirar spam/promociones.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `views/CompleteSignupView.vue` (nuevo) | `/completar-registro?token=...` — nombre, contraseña, confirmar contraseña. Al completar, ya queda logueado (la respuesta trae sesión) y se redirige a `/bienvenida`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `views/OnboardingView.vue` (nuevo)     | `/bienvenida` — wizard de 3 pasos con estado local de Vue (no se guarda nada hasta terminar el paso 2). Paso 1: radio-cards de tipo de usuario (markup similar a `ProfileView.vue`, duplicado a propósito en vez de extraer un componente compartido — el riesgo de tocar `ProfileView.vue` para una vista nueva no valía la pena del ahorro). Paso 2: checkbox de términos (link a `/terminos`, obligatorio) + checkbox de newsletter (opcional, sin marcar) + botón "Finalizar" → `POST /me/onboarding/complete`. Paso 3 (solo si el tipo elegido es AT/Cuidador): mini-formulario de perfil profesional (mismos campos que `ProfileView.vue`), con "Guardar y continuar" o "Hacerlo más tarde" — los dos terminan el onboarding igual. |
| `views/TermsView.vue` (nuevo)          | `/terminos` — contenido estático, marcado como borrador. Pública, sin `requiresAuth`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `types/auth.ts`                        | `AuthUser` suma `onboardingCompletedAt: string \| null` (llega solo con incluir la columna, `toPublicUser` ya hace spread de todo el `User`).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `router/index.ts`                      | Ruta `/bienvenida` (`requiresAuth: true`) y `/terminos` (pública) y `/completar-registro` (pública). El guard existente gana una tercera rama: si hay sesión y `!user.onboardingCompletedAt` y la ruta destino no es `/bienvenida`/`/terminos`/logout, redirige a `/bienvenida` — aplica a cualquier página pública, no solo a las que ya exigían sesión.                                                                                                                                                                                                                                                                                                                                                                                 |

## Fuera de alcance

- Reenvío manual del email de activación desde la UI (si el link vence, hoy habría que pedir el alta de nuevo con el mismo email — reusa la cuenta pendiente). Se puede agregar un botón "Reenviar" más adelante si hace falta.
- Traducir/adaptar el onboarding para OAuth de forma distinta al de email — es el mismo wizard para los dos, solo cambia cómo se llegó ahí.

## Plan de verificación

1. Test de backend: `requestSignup` con un email nuevo → crea `User` con `passwordHash: null`, manda el email de activación. ✅
2. Test de backend: `requestSignup` con un email que ya tiene cuenta completa → no crea nada nuevo, manda el email de "ya tenés cuenta", igual responde `{ ok: true }`. ✅
3. Test de backend: `completeSignup` con token vencido/usado/inexistente, o de otro `type` (ej. `password_reset`), o con contraseñas que no coinciden → rechaza. ✅
4. Test de backend: `completeSignup` exitoso → `passwordHash` seteado, `emailVerified` seteado, devuelve sesión válida. ✅
5. Test de backend: `POST /me/onboarding/complete` sin `acceptedTerms: true` → 400. ✅
6. Test de backend: `POST /me/onboarding/complete` con `subscribeNewsletter: true` → llama a `NewsletterService.subscribe` con `source: 'onboarding'`. ✅
7. **Manual, de punta a punta con Resend real** (extrayendo los links de los emails vía `GET /emails/:id` de la API de Resend, no revisando la bandeja a mano): pedir alta con un email real → llega el email de activación (HTML + texto plano, mismo link en los dos, aviso de spam incluido) → completar nombre/contraseña/confirmar → sesión abierta → redirige solo a `/bienvenida` (el guard del router lo detecta) → paso 1 (tipo AT) → paso 2 (términos + newsletter tildado) → paso 3 (perfil profesional, "Hacerlo más tarde") → termina en `/` → `onboardingCompletedAt`, `termsAcceptedAt`, `profileRole`, `passwordHash`, `emailVerified` todos seteados en la DB, y el contacto apareció en la audiencia real de Resend por el opt-in del paso 2. ✅
8. Manual: pedir el alta de nuevo con el mismo email ya completo → mismo `{ ok: true }`, pero llega el email de "ya tenés cuenta" (confirmado por asunto real vía la API de Resend), no una activación. ✅
9. Manual: pedir el alta dos veces con el mismo email sin completar nunca → sigue existiendo una sola fila en `users` (confirmado por conteo directo en la DB), no duplica la cuenta pendiente. ✅
10. Manual: un usuario ya existente (de antes de este cambio, con `onboardingCompletedAt` seteado por el backfill) inicia sesión y navega → no lo manda a `/bienvenida`. ✅
11. Manual: navegar a `/mi-cuenta/perfil` con la cuenta recién onboardeada → no vuelve a pedir el onboarding. ✅
