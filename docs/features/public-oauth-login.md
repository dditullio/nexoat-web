# Login con Google/Facebook para lectores públicos

**Estado:** implementado y verificado end-to-end en dev (tests, type-check, lint, y login real completo con una cuenta de Google desde `/ingresar`, sesión abierta correctamente) — pendiente el deploy a producción.

## Contexto

[`auth-and-admin-dashboard.md`](auth-and-admin-dashboard.md) ya dejó el cableado de OAuth (Google/Facebook) completo y condicional a nivel backend (`GoogleStrategy`/`FacebookStrategy`, `GoogleAuthController`/`FacebookAuthController`, registrados solo si las credenciales están seteadas), pero **solo lo consume `/nexoat-admin/login`**. [`reader-accounts-and-paywall.md`](reader-accounts-and-paywall.md) construyó el login/registro público de lectores (`/ingresar`, `/registrarme`) explícitamente **solo con email + contraseña** — la decisión #3 de ese doc pospuso OAuth público a propósito: "el redirect hardcodeado a `/nexoat-admin/oauth-callback` (...) queda sin tocar — se revisa cuando se agregue OAuth público más adelante".

Ese momento es ahora: los lectores en `https://nexoat.com/ingresar` (y `/registrarme`) también deben poder entrar con Google/Facebook, no solo con email.

## Ajuste de UX posterior: OAuth como opción principal, no secundaria

Una vez andando el mecanismo de arriba, se decidió que OAuth no debía ser un agregado al pie del formulario de email — para lectores, tiene que ser **la opción principal**: menos fricción (un click, sin contraseña que recordar) para quien solo quiere leer un artículo. El formulario de email pasa a ser la alternativa, detrás de un link chico.

- `/ingresar` y `/registrarme` ahora renderizan `AuthEntryView.vue` (nueva): el/los botón(es) OAuth configurados como CTA principal (`OAuthButtons` con `variant="primary"` — el primer proveedor en sólido `.btn--primary`, el resto en `.btn--ghost`, sin el divisor "o continuá con"), y un link chico debajo ("o ingresar/registrate con correo electrónico") que lleva al formulario de email de siempre.
- El formulario de email se movió a rutas nuevas: `/ingresar/correo` (`LoginView.vue`) y `/registrarme/correo` (`RegisterView.vue`) — mismo componente y lógica de antes, sin el bloque OAuth (que ahora vive solo en `AuthEntryView`). Cada uno suma, simétricamente, un link chico de vuelta ("o ingresar/registrate con Google") — el label lista dinámicamente solo los proveedores que `GET /auth/providers` reporta activos (nunca dice "Facebook" si esas credenciales no están cargadas).
- Si `GET /auth/providers` no reporta ningún proveedor activo (ej. dev sin credenciales seteadas), `AuthEntryView` se salta sola al formulario de email — no tiene sentido mostrar una tarjeta con un solo link chico y nada más.
- **El admin queda afuera de este cambio a propósito** (decisión explícita): en `/nexoat-admin/login` el email sigue siendo la única opción visible — es una herramienta interna para el equipo editorial, no tiene sentido priorizar redes sociales ahí. El botón de `AdminLoginView.vue` se comentó en el template (no se borró el mecanismo: `context=admin` en el backend y `<OAuthButtons>` siguen funcionando igual si se quisiera reactivar).

## El problema a resolver

`GoogleAuthController`/`FacebookAuthController` son un único endpoint compartido (`GET /v1/auth/google`, `GET /v1/auth/facebook`) — no hay "una instancia para admin y otra para lectores". Hoy el callback redirige siempre, sin condición, a `${FRONTEND_URL}/nexoat-admin/oauth-callback`. Si un lector public hiciera clic en "Continuar con Google" desde `/ingresar` tal cual está el código hoy, terminaría redirigido al login del admin.

## Decisión: `state` de OAuth como canal de ida y vuelta

El flujo de referencia OAuth2 (`passport-oauth2`, base tanto de `passport-google-oauth20` como de `passport-facebook`) soporta pasar un `state` arbitrario al iniciar el flow — el proveedor (Google/Facebook) lo devuelve intacto en el callback, sin que el backend necesite sesión ni guardar nada. Se usa ese canal para decirle al callback a dónde volver:

1. El link "Continuar con Google" arma `GET /v1/auth/google?context=admin|reader&redirect=<path>`.
2. Un guard (`GoogleAuthGuard`/`FacebookAuthGuard`, que extienden `AuthGuard('google'|'facebook')` sobreescribiendo `getAuthenticateOptions()`) lee esos dos query params del request, arma `state = JSON.stringify({ context, redirect })` y se lo pasa a Passport — reemplaza el uso desnudo de `AuthGuard('google')`/`AuthGuard('facebook')` **solo** en la ruta `GET /auth/google` / `GET /auth/facebook` (no en `/callback`, que no necesita mandar nada, solo recibir).
3. En el callback, se parsea `req.query.state` (función `resolveOAuthRedirectUrl` en `auth.utils.ts`) y se decide la URL de destino: `${FRONTEND_URL}/nexoat-admin/oauth-callback` si `context === 'admin'`, `${FRONTEND_URL}/oauth-callback` en cualquier otro caso (default seguro: `reader`), con `?redirect=<path>` si vino uno.
4. **Validación anti open-redirect:** `redirect` solo se acepta y se reenvía si es un path relativo "seguro" — empieza con `/` pero no con `//` ni contiene `://` (si no, se ignora y se usa el default de cada landing). Mismo criterio para el `state` corrupto/ausente: cualquier error de parseo cae al default (`reader`, sin redirect).

Esto es aditivo: hoy nada manda `context`/`redirect` a esas rutas, así que el comportamiento sin querystring (que no debería darse una vez armado el frontend, pero por robustez) cae al default `reader` → `/oauth-callback`. El único llamador real (`AdminLoginView.vue`) pasa explícitamente `context=admin`, así que no hay regresión.

## Landing pages del callback: una por superficie, mismo patrón

`AdminOAuthCallbackView.vue` ya existe y funciona así: la cookie httpOnly de refresh quedó puesta por el backend antes del redirect, así que la vista solo llama `authStore.refresh()` (que pega a `POST /auth/refresh`, usa la cookie, y trae el access token + user) y navega. Se replica el mismo patrón para lectores, sin duplicar lógica de negocio — solo el destino final cambia:

- `AdminOAuthCallbackView.vue` (ya existe, ruta `/nexoat-admin/oauth-callback`): ahora además respeta `route.query.redirect` si vino (antes redirigía siempre a `/nexoat-admin` a secas).
- `OAuthCallbackView.vue` (nuevo, ruta pública `/oauth-callback`, fuera del árbol `/nexoat-admin`): mismo `authStore.refresh()`, redirige a `route.query.redirect ?? '/'` si funcionó, a `{ name: 'login' }` si no.

## Botones de OAuth: componente compartido

`AdminLoginView.vue` ya tenía el bloque de botones "Google"/"Facebook" condicionado a `authStore.providers` (que ya se carga para toda la app en `authStore.bootstrap()`, no es admin-specific). Se extrae a `components/auth/OAuthButtons.vue` (props: `context: 'admin' | 'reader'`, `redirect?: string`) para no triplicar el markup entre `AdminLoginView.vue`, `LoginView.vue` y `RegisterView.vue` — arma el `href` de cada proveedor con `context`/`redirect` como querystring. Misma paleta/tokens del skill de diseño en los tres casos (ya comparten `.btn.btn--ghost`).

`LoginView.vue`/`RegisterView.vue` lo usan con `context="reader"` y `:redirect` = el `redirect` de la query actual (mismo patrón que ya usan para el submit de email/contraseña vía `redirectTarget()`), así un lector que llega a `/ingresar?redirect=/articulo/x` desde un paywall y entra con Google también vuelve a `/articulo/x`.

## Archivos a tocar

| Archivo                                                                     | Cambio                                                                                                                                                                                                 |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `backend/src/auth/auth.utils.ts`                                            | `buildOAuthState(context, redirect?)`, `resolveOAuthRedirectUrl(frontendUrl, rawState)`, `isSafeRedirectPath(path)` (nuevas).                                                                          |
| `backend/src/auth/guards/oauth-authenticate.guard.ts` (nuevo)               | `GoogleAuthGuard`/`FacebookAuthGuard`, cada uno extendiendo su `AuthGuard(...)` y sobreescribiendo `getAuthenticateOptions()` con `buildOAuthState` y `getResponse()` (fix de Fastify, ver más abajo). |
| `backend/src/auth/filters/oauth-error.filter.ts` (nuevo)                    | `OAuthErrorFilter` — atrapa cualquier falla del intercambio OAuth y redirige al login correspondiente con `?error=oauth` en vez de un JSON 500 crudo.                                                  |
| `backend/src/auth/google-auth.controller.ts`, `facebook-auth.controller.ts` | `auth()` pasa a usar el guard nuevo; `callback()` usa `resolveOAuthRedirectUrl` en vez del `res.redirect` hardcodeado.                                                                                 |
| `frontend/src/components/auth/OAuthButtons.vue` (nuevo)                     | Botones compartidos, ver arriba.                                                                                                                                                                       |
| `frontend/src/views/admin/AdminLoginView.vue`                               | Usa `<OAuthButtons context="admin" :redirect="redirectTarget()" />` en vez del bloque inline.                                                                                                          |
| `frontend/src/views/admin/AdminOAuthCallbackView.vue`                       | Respeta `route.query.redirect` (antes: siempre `/nexoat-admin`).                                                                                                                                       |
| `frontend/src/views/OAuthCallbackView.vue` (nuevo)                          | Landing pública, ver arriba.                                                                                                                                                                           |
| `frontend/src/views/LoginView.vue`, `RegisterView.vue`                      | Suman `<OAuthButtons context="reader" :redirect="..." />`.                                                                                                                                             |
| `frontend/src/router/index.ts`                                              | Ruta pública nueva `/oauth-callback` → `OAuthCallbackView.vue`.                                                                                                                                        |

Sin cambios de schema, sin dependencias nuevas — reutiliza `passport-google-oauth20`/`passport-facebook` ya instalados y el mecanismo de `state` que ya traen.

## Fuera de alcance

- Facebook sigue sin credenciales cargadas en producción (`FACEBOOK_CLIENT_ID`/`SECRET` vacías) — el mecanismo queda simétrico para cuando se configuren, pero hoy solo Google es funcional de punta a punta (`GET /auth/providers` → `{"google":true,"facebook":false}`).
- Vincular una cuenta existente (creada por email) con Google/Facebook manualmente desde "mi cuenta" — no existe pantalla de "mi cuenta" todavía (ver `reader-accounts-and-paywall.md`, fuera de alcance también ahí). Hoy, si el email de la cuenta de Google coincide con una cuenta ya registrada por email, `AuthService.validateOAuthLogin` decide qué hacer (comportamiento ya existente, sin cambios en esta etapa).

## Bug preexistente encontrado y corregido: `GET /auth/google` reventaba con Fastify

Al verificar el flujo en dev (clic real hasta la pantalla de Google), `GET /auth/google` tiraba `TypeError: res.setHeader is not a function` **siempre**, con o sin `state` — es decir, ya rompía antes de este cambio, para el único consumidor que existía (`AdminLoginView.vue`). No se había detectado porque la verificación manual de `auth-and-admin-dashboard.md` no incluía un clic real de punta a punta en el botón de Google, solo que apareciera/desapareciera según `GET /auth/providers`.

Causa: `passport-oauth2` redirige al proveedor llamando `res.setHeader(...)`/`res.end()` directo sobre el `response` que `@nestjs/passport` le pasa — asume una API estilo Express. `FastifyReply` (lo que `context.switchToHttp().getResponse()` devuelve con el adapter de Fastify) no tiene `setHeader`, tiene `.header()`/`.send()`.

Arreglado en el mismo guard que ya se necesitaba para el `state` (`oauth-authenticate.guard.ts`): `getResponse()` sobreescrito para devolver `reply.raw` (el `http.ServerResponse` de Node de siempre, que sí tiene `setHeader`) después de llamar `reply.hijack()` (le dice a Fastify "no toques más esta respuesta, la manejo a mano" — sin esto, Fastify intentaría además serializar/enviar la misma respuesta y competir con la escritura directa sobre `raw`). No hacía falta tocar `/callback`: ahí Passport solo corre `validate()` de la estrategia y el controller responde con `res.redirect()` de Fastify (que si funciona normal), nunca pasa por `strategy.redirect()`.

Verificado en dev con clic real hasta la pantalla de "Acceso: Cuentas de Google" (sin completar el login, que requiere una cuenta real): `state` en la URL de Google llega como `{"context":"reader","redirect":"/articulo/x"}`/`{"context":"admin",...}` según corresponda, `redirect_uri` correcto — confirma que tanto el mecanismo de `context`/`redirect` como el fix de Fastify funcionan para los dos casos.

## Segundo bug preexistente: `/callback` "funcionaba" pero el navegador nunca seguía el redirect

Con el fix de arriba ya en pie, el login real (con cuenta de Google de verdad) seguía terminando en una pantalla en blanco — pero esta vez sin ninguna excepción en el backend. Diagnóstico paso a paso (ver conversación): reproducir con códigos ya usados primero confundió la pista (esos sí tiraban `TokenError: invalid_grant`, un caso real pero distinto), hasta que se inspeccionaron los **response headers** del request real en DevTools → Network:

```
HTTP/1.1 200 OK
location: http://localhost:3000/oauth-callback?redirect=%2F
set-cookie: nexoat_refresh_token=...; HttpOnly; SameSite=Lax
content-length: 0
```

El `Location` y la cookie de sesión estaban perfectos — **el login funcionaba end-to-end** — pero el status era `200`, no `302`. Un navegador solo sigue automáticamente un `Location` en una respuesta 3xx; con 200 simplemente renderiza el body (vacío) y se queda ahí. De ahí la "pantalla en blanco": no era un fallo del login, era que el resultado exitoso nunca llegaba a mostrarse.

Causa, en el código fuente de Fastify 5 (`reply.redirect`):

```js
Reply.prototype.redirect = function (url, code) {
  if (!code) {
    code = this[kReplyHasStatusCode] ? this.raw.statusCode : 302
  }
  return this.header('location', url).code(code).send()
}
```

Si no se pasa `code` explícito, y la respuesta **ya tiene un status explícito seteado** (`kReplyHasStatusCode`, cierto acá porque Nest prepara la respuesta de una ruta `@Res()` con un status por default antes de correr el handler), Fastify reusa ese status en vez de default a 302. `res.redirect(url)` a secas —tal como estaba en `google-auth.controller.ts`, `facebook-auth.controller.ts` y `OAuthErrorFilter`— quedaba pisado a 200 silenciosamente, sin ningún error que lo delatara.

Arreglado pasando el código explícito en los tres lugares: `res.redirect(url, 302)`. Verificado repitiendo el flujo con un `code` de prueba inválido: la respuesta ahora sí redirige de verdad (`location.href` termina en `http://localhost:3000/ingresar?error=oauth`, con el aviso "No pudimos completar el ingreso con Google/Facebook. Probá de nuevo." visible en pantalla) en vez de quedar en blanco.

## Manejo de errores del callback: `OAuthErrorFilter`

Cualquier falla del intercambio OAuth (code inválido/expirado, consentimiento negado, el proveedor no expone el email) explota **dentro del guard** de Passport (`AuthGuard('google'|'facebook')` en `/callback`), antes de que el controller llegue a correr — un `try/catch` ahí no la agarra. `backend/src/auth/filters/oauth-error.filter.ts` (`@Catch()`, aplicado a nivel de controller con `@UseFilters`) loguea el error completo (`Logger`, visible en la terminal del backend) y redirige al login que corresponda (`/nexoat-admin/login` o `/ingresar`) con `?error=oauth`, que `AdminLoginView.vue`/`LoginView.vue` leen para mostrar el aviso en vez de dejar al usuario en un JSON 500 crudo.

## Plan de verificación

1. `pnpm --filter @nexoat/backend test` — sigue en verde (no se tocan services/guards existentes salvo los dos controllers de OAuth).
2. `pnpm --filter frontend type-check`.
3. Manual (producción o dev con `GOOGLE_CLIENT_ID`/`SECRET` seteadas): desde `/nexoat-admin/login`, click en "Google" sigue llevando al dashboard admin como antes (sin regresión).
4. Manual: desde `/ingresar`, click en "Google" → login real → vuelve a `/` (o al `redirect` si se llegó con uno) con sesión de lector activa (`AppHeader` muestra el nombre).
5. Manual: mismo desde `/registrarme`.
6. Manual: probar con un `redirect` manipulado (`?redirect=https://evil.com`) y confirmar que se ignora (cae al default), no se abre un redirect externo.
