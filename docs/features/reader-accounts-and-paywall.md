# Cuentas de lector + recorte de contenido (fase 2 del "alcance")

**Estado:** implementado. Continúa [`article-scope-filters.md`](article-scope-filters.md) (fase 1: clasificación + filtros) — leer ese doc primero para el contexto y las decisiones ya tomadas (nombre del campo, valores, marcador de corte).

## Objetivo de esta fase

Que el `scope` de un artículo deje de ser solo clasificación y empiece a restringir de verdad: quien no tenga el nivel de acceso requerido ve el contenido hasta el marcador `<!--corte-->` (o los primeros 2-3 párrafos si el artículo no lo tiene) y una invitación a registrarse/suscribirse en vez del resto. Cobro real (`suscriptores_nivel_2`/`nivel_3`) sigue **fuera de alcance** — ver "Fuera de alcance" al final.

## Hallazgo clave: gran parte del backend de auth ya sirve tal cual

Se revisó el código de `backend/src/auth/` y `frontend/src/stores/auth.ts` / `services/http.ts` antes de planificar, para no reinventar nada:

- `POST /auth/register` **ya es público** (sin guard), crea un usuario `Role.USER` y abre sesión — es exactamente lo que necesita un lector para crear una cuenta gratuita. No hace falta tocar el backend de auth para esto.
- `useAuthStore` (Pinia) y `services/http.ts` **no son específicos del admin** — `login`, `register` (falta agregarlo al store, hoy solo tiene `login`), `logout`, `refresh`, `bootstrap()` sirven igual para un lector público. `http()` ya adjunta el `Authorization` header con el access token en memoria si existe, en **cualquier** request — incluida la de `ArticleView.vue`, que hoy pasa `skipAuthRetry: true` pero eso solo evita el retry automático tras un 401, no impide que el token viaje si ya está seteado.
- Lo que **falta** es la superficie pública: pantallas de login/registro fuera de `/nexoat-admin`, algo en `AppHeader.vue` que muestre sesión/logout, y que el backend sepa leer ese token en el endpoint público de artículos (hoy no lo hace en absoluto, ver más abajo).

## Decisiones (confirmadas)

1. **Pantalla pública de login/registro:** se construye ya, en esta fase.
2. **Mensaje para `suscriptores_nivel_2`/`nivel_3` sin sistema de pagos:** confirmada la propuesta — CTA depende del `scope` requerido; `suscriptores_nivel_1` → botón real "Registrate gratis" al registro; `nivel_2`/`nivel_3` → CTA a `/planes` (ver más abajo, agregado después de la primera implementación — al principio era solo texto "Próximamente" sin acción, se reemplazó por una lista de espera real).
3. **OAuth:** se pospone. El login/registro público de esta fase es **solo email + contraseña**. El redirect hardcodeado a `/nexoat-admin/oauth-callback` en `google-auth.controller.ts`/`facebook-auth.controller.ts` queda sin tocar — se revisa cuando se agregue OAuth público más adelante.
4. **Cálculo del corte:** confirmado, en cada request (buscar `<!--corte-->` en `article.content` al armar la respuesta, sin persistir copia recortada).

## Cambios de schema propuestos

`backend/prisma/schema.prisma`, modelo `User` (nuevo campo, no confundir con `Role`, que sigue siendo solo permisos de admin):

```prisma
enum SubscriptionTier {
  gratuito    // cualquier cuenta registrada — equivale a suscriptores_nivel_1
  nivel_2
  nivel_3
}

model User {
  // ...campos existentes...
  subscriptionTier SubscriptionTier @default(gratuito)
}
```

Cualquier alta nueva (`register`, OAuth) ya nace en `gratuito` = acceso a `suscriptores_nivel_1`. `nivel_2`/`nivel_3` no tienen forma de asignarse todavía (sin sistema de pagos) — el campo existe para que el resto de la lógica de comparación de niveles ya esté escrita cuando llegue esa fase, pero el valor por default es el único alcanzable hoy.

## Backend — módulos a tocar

| Archivo                           | Cambio                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `auth/guards/` (nuevo)            | `OptionalJwtAuthGuard` — variante de `JwtAuthGuard` que **no** lanza si falta el token o es inválido, solo deja `req.user` en `undefined`. `JwtAuthGuard` actual no sirve tal cual porque los endpoints públicos deben seguir funcionando sin sesión.                                                                                                                                                                                                                 |
| `articles/articles.controller.ts` | `GET /articles/:slug` pasa a usar `@UseGuards(OptionalJwtAuthGuard)` + `@CurrentUser({ optional: true })` (o similar) para obtener el viewer si existe.                                                                                                                                                                                                                                                                                                               |
| `articles/scope.util.ts` (nuevo)  | `rankOf(scope)` / `rankOf(tier)` → `0/1/2/3`, y `hasAccess(articleScope, viewerTier, viewerRole)` — `EDITOR+` siempre tiene acceso completo (revisión editorial), independientemente del `scope`.                                                                                                                                                                                                                                                                     |
| `articles/articles.service.ts`    | `findPublishedBySlug(slug, viewer)` deja de devolver siempre `toPublicArticleFull` — si `!hasAccess(...)`, arma la versión recortada (corta en `<!--corte-->` o fallback de párrafos) y agrega `isTruncated: true`, `requiredScope`. **El contenido completo no debe salir en la respuesta HTTP en ningún caso** — ese es el punto de todo este trabajo, así que hay que verificarlo con un test que inspeccione el body crudo, no solo lo que renderiza el frontend. |
| `articles/articles.mapper.ts`     | Nueva función `toPublicArticleFullFor(article, viewer)` en vez de (o adaptando) `toPublicArticleFull`.                                                                                                                                                                                                                                                                                                                                                                |

## Frontend — módulos a tocar

| Archivo                                                                                    | Cambio                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `stores/auth.ts`                                                                           | Agregar `register(email, password, name?)` (falta hoy, solo hay `login`).                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `router/index.ts`                                                                          | Rutas públicas nuevas, ej. `/ingresar`, `/registrarme` (fuera del árbol `/nexoat-admin`, sin `meta.layout: 'admin'`).                                                                                                                                                                                                                                                                                                                                                                                   |
| `views/LoginView.vue`, `views/RegisterView.vue` (nuevos)                                   | Formularios mínimos **solo email + contraseña** (sin botones de OAuth — pospuesto, ver decisión #3), mismo patrón visual que `AdminLoginView.vue` pero con el layout público (`AppHeader`/`AppFooter`), siguiendo el skill de diseño.                                                                                                                                                                                                                                                                   |
| `components/layout/AppHeader.vue`                                                          | Mostrar "Ingresar" o el nombre de usuario + "Salir" según `authStore.isAuthenticated`.                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `App.vue`                                                                                  | Llamar `authStore.bootstrap()` también en el layout público (hoy probablemente solo se dispara para rutas admin — confirmar al implementar).                                                                                                                                                                                                                                                                                                                                                            |
| `types/index.ts`                                                                           | `ArticleFull` suma `isTruncated: boolean`, `requiredScope?: ArticleScope`.                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `views/ArticleView.vue`                                                                    | Sacar `skipAuthRetry: true` de la request si ya hay sesión (o dejarlo, no bloquea el envío del token — confirmar que no haga falta tocarlo). Si `article.isTruncated`, renderizar el contenido parcial + bloque de CTA en vez del resto (según la decisión pendiente #2). Suma aviso "Vista previa" en la cabecera (antes de que el lector empiece a leer) y degradado hacia el fondo de página al final del texto cortado (`.art__body--truncated::after`), para que el corte se lea como intencional. |
| `views/PlansView.vue` (nuevo), `router/index.ts`                                           | Página pública `/planes` — presenta Nivel 2/Nivel 3 como "en preparación" y ofrece anotarse a una lista de espera (reusa `NewsletterForm` con `source: 'plans-waitlist'`). Es el destino del CTA de nivel_2/nivel_3 en `ArticleView.vue`, en vez de un texto "Próximamente" sin acción — no hay checkout ni cobro, solo captura de email para avisar cuando esté disponible.                                                                                                                            |
| `components/blog/NewsletterForm.vue`, `NewsletterModal.vue` (nuevos, ver commit `5adfee0`) | El formulario de alta al newsletter (extraído de `HomeView.vue`) ahora acepta `title`/`description`/`button-label`/`success-message` como props opcionales, para poder reusarlo tal cual en `PlansView.vue` con copy distinto sin duplicar la lógica de submit.                                                                                                                                                                                                                                         |

## Fuera de alcance de esta fase

- Cobro real (Stripe/Mercado Pago/etc.) y todo lo que dependa de saber si un pago está al día (renovaciones, vencimientos, webhooks).
- Login/registro público con Google/Facebook (OAuth) — el login público arranca solo con email + contraseña, ver decisión #3.
- Verificación de email obligatoria para el registro público (mismo criterio que ya aplica al admin — se posterga hasta tener proveedor de email, ver `auth-and-admin-dashboard.md`).
- Panel de "mi cuenta" para que un lector vea/cambie su nivel — no tiene sentido hasta que haya algo pago que gestionar.

## Plan de verificación

1. Test de backend (`articles.service.spec.ts`): pedir `findPublishedBySlug` de un artículo `suscriptores_nivel_1` sin viewer → el `content` de la respuesta **no contiene** el texto posterior al marcador (se inspecciona el string devuelto, no el render). ✅
2. Test de backend: mismo artículo, con un viewer `USER`/`gratuito` → contenido completo (`isTruncated: false`). ✅
3. Test de backend: viewer `EDITOR` siempre ve completo, sin importar `scope` ni `subscriptionTier`. ✅
4. Test de backend: slug inexistente o no publicado → `NotFoundException`. ✅
5. Manual (navegador): artículo con `scope: suscriptores_nivel_1` visto sin sesión → chip "Registrados", **aviso de "Vista previa" en la cabecera** (antes de empezar a leer, con CTA "Registrate gratis" — agregado después de la primera implementación, para que el lector sepa de antemano que no es el artículo completo), contenido cortado en el marcador con degradado hacia el fondo de página, bloque "Seguí leyendo gratis" al pie del contenido con botón a `/registrarme`. ✅
6. Manual: registro real desde `/registrarme` (email + contraseña) → sesión abierta de inmediato (`AppHeader` muestra el nombre + "Salir"), mismo artículo ahora se ve completo (fuentes incluidas). ✅
7. Manual: artículo `suscriptores_nivel_2` — aviso "Ver planes" en la cabecera y bloque "Estamos preparando este contenido" con CTA "Sumarme a la lista de espera" al pie del contenido cortado, ambos apuntan a `/planes`; anotarse ahí con un email real crea el registro en `NewsletterSubscriber` con `source: 'plans-waitlist'`, verificado con `EDITOR` viendo el contenido completo igual que en nivel_1. ✅
