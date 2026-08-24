# Verificación de email y reset de contraseña

**Estado:** implementado.

## Contexto

Fase 2 de `email-provider-resend.md`: retoma lo que `auth-and-admin-dashboard.md` dejó pendiente desde el primer día ("sin proveedor de email todavía → sin verificación de email obligatoria ni reset de contraseña por correo"). Ahora que Resend está andando (fase 1, `nexoat.com` verificado), se cierra ese hueco.

## Decisiones

### 1. La verificación de email sigue siendo opcional, no bloqueante

`auth-and-admin-dashboard.md` decidió explícitamente no exigirla en su momento. Nada en esta fase cambia esa decisión: se construye el mecanismo completo (token, email, pantalla, endpoint), pero **no se bloquea login ni ninguna acción del sitio** por no estar verificado — `User.emailVerified` sigue siendo informativo. Si más adelante se quiere gatear algo (ej. el perfil profesional público del futuro directorio) detrás de "email verificado", ya está la pieza lista para usarla.

### 2. Un solo email en el registro, no dos

En vez de mandar "bienvenida" + "verificá tu email" como dos correos separados (spam de bandeja), se combina en uno: `welcomeEmailHtml(name, verifyUrl?)` suma un botón "Confirmá tu email" cuando hay `verifyUrl`. Los altas por OAuth no llevan ese botón — el proveedor (Google/Facebook) ya verificó el email, `emailVerified` se setea directo al crear la cuenta, como ya hacía `validateOAuthLogin`.

### 3. Un solo modelo de token para verificación y reset, no dos

Ambos flujos son "token de un solo uso, con expiración, atado a un usuario, mandado por email" — se modelan como un único `VerificationToken` con un campo `type` (`email_verification` | `password_reset`), en vez de duplicar la tabla. Vencimiento distinto por tipo (verificación: 24h: es de baja urgencia; reset: 1h, ventana corta porque es una acción sensible).

### 4. Reset de contraseña revoca todas las sesiones activas

Al resetear la contraseña con éxito, se revocan **todos** los `RefreshToken` activos del usuario (mismo mecanismo que ya usa `revokeRefreshToken`, extendido a "todos los del usuario") — si alguien pidió el reset porque su cuenta estaba comprometida, cualquier sesión robada con el refresh token viejo queda cortada.

### 5. `forgot-password` nunca revela si el email existe

Responde `{ ok: true }` siempre, exista o no el usuario — evita que alguien use el formulario para enumerar qué emails tienen cuenta en el sitio. Mismo criterio que ya usa `validateLocalUser` (no distingue el motivo de una credencial inválida).

## Schema (`backend/prisma/schema.prisma`)

```prisma
enum VerificationTokenType {
  email_verification
  password_reset
}

model VerificationToken {
  id        String                @id @default(cuid())
  userId    String
  user      User                  @relation(fields: [userId], references: [id], onDelete: Cascade)
  tokenHash String                @unique
  type      VerificationTokenType
  expiresAt DateTime
  usedAt    DateTime?
  createdAt DateTime              @default(now())

  @@index([userId, type])
  @@map("verification_tokens")
}
```

`User` suma `verificationTokens VerificationToken[]`.

## Backend

| Archivo                                                                                    | Cambio                                                                                                                                                                                                                                                                     |
| ------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `auth/auth.service.ts`                                                                     | `requestEmailVerification`, `verifyEmail(rawToken)`, `requestPasswordReset(email)`, `resetPassword(rawToken, newPassword)`, `revokeAllRefreshTokens(userId)`. Mismo patrón de token que ya usa `RefreshToken` (random 48 bytes, se guarda el hash sha256, nunca el crudo). |
| `auth/dto/verify-email.dto.ts`, `forgot-password.dto.ts`, `reset-password.dto.ts` (nuevos) | DTOs de los 4 endpoints nuevos.                                                                                                                                                                                                                                            |
| `auth/auth.controller.ts`                                                                  | `POST /auth/verify-email`, `POST /auth/verify-email/resend` (requiere sesión), `POST /auth/forgot-password`, `POST /auth/reset-password`. Los dos primeros que disparan email llevan el mismo `@Throttle` estricto que login/register.                                     |
| `mail/templates/welcome.template.ts`                                                       | Suma parámetro opcional `verifyUrl`.                                                                                                                                                                                                                                       |
| `mail/templates/reset-password.template.ts` (nuevo)                                        | Plantilla del email de reset.                                                                                                                                                                                                                                              |

## Frontend

| Archivo                                                                                 | Cambio                                                                                                                                        |
| --------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `stores/auth.ts`                                                                        | `verifyEmail`, `resendVerification`, `requestPasswordReset`, `resetPassword`.                                                                 |
| `router/index.ts`                                                                       | `/verificar-correo`, `/recuperar-contrasena`, `/restablecer-contrasena` (públicas, sin `requiresAuth` — el token de la URL es la credencial). |
| `views/VerifyEmailView.vue`, `ForgotPasswordView.vue`, `ResetPasswordView.vue` (nuevos) | Mismo lenguaje visual que `LoginView.vue`/`RegisterView.vue` (clases `.auth__*`).                                                             |
| `views/LoginView.vue`                                                                   | Suma link "¿Olvidaste tu contraseña?" → `/recuperar-contrasena`.                                                                              |
| `components/layout/EmailVerificationBanner.vue` (nuevo)                                 | Aviso no bloqueante, visible con sesión iniciada y `emailVerified: null`, con botón "Reenviar" — se monta en `App.vue`.                       |

## Plan de verificación

1. Test de backend: token de verificación vencido/usado/inexistente → rechaza sin marcar `emailVerified`. ✅
2. Test de backend: `forgot-password` con email inexistente → `{ ok: true }` igual, sin crear ningún token. ✅
3. Test de backend: `reset-password` exitoso → revoca todos los `RefreshToken` activos del usuario. ✅
4. Manual: registrarse con email/contraseña → un solo correo con botón "Confirmá tu email" (confirmado leyendo el HTML real vía la API de Resend) → clic → `/verificar-correo?token=...` marca la cuenta como verificada; reusar el mismo link después → rechazado ("no es válido o ya venció"). ✅
5. Manual: `forgot-password` con un email inexistente responde igual que con uno real (`{ ok: true }`), sin filtrar nada. ✅
6. Manual: pedir el reset con un email real → llega el correo → cambiar la contraseña desde `/restablecer-contrasena` → login con la contraseña vieja da 401, con la nueva da 201. ✅

Todos los pasos manuales se verificaron end-to-end contra el backend/frontend real corriendo en local, extrayendo los links de los emails directo desde la API de Resend (`GET /emails/:id`) en vez de revisar la bandeja a mano.
