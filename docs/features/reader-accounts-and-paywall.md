# Cuentas de lector + recorte de contenido (fase 2 del "alcance")

**Estado:** planificado, no implementado. Continúa [`article-scope-filters.md`](article-scope-filters.md) (fase 1: clasificación + filtros, ya implementada) — leer ese doc primero para el contexto y las decisiones ya tomadas (nombre del campo, valores, marcador de corte).

## Objetivo de esta fase

Que el `scope` de un artículo deje de ser solo clasificación y empiece a restringir de verdad: quien no tenga el nivel de acceso requerido ve el contenido hasta el marcador `<!--corte-->` (o los primeros 2-3 párrafos si el artículo no lo tiene) y una invitación a registrarse/suscribirse en vez del resto. Cobro real (`suscriptores_nivel_2`/`nivel_3`) sigue **fuera de alcance** — ver "Fuera de alcance" al final.

## Hallazgo clave: gran parte del backend de auth ya sirve tal cual

Se revisó el código de `backend/src/auth/` y `frontend/src/stores/auth.ts` / `services/http.ts` antes de planificar, para no reinventar nada:

- `POST /auth/register` **ya es público** (sin guard), crea un usuario `Role.USER` y abre sesión — es exactamente lo que necesita un lector para crear una cuenta gratuita. No hace falta tocar el backend de auth para esto.
- `useAuthStore` (Pinia) y `services/http.ts` **no son específicos del admin** — `login`, `register` (falta agregarlo al store, hoy solo tiene `login`), `logout`, `refresh`, `bootstrap()` sirven igual para un lector público. `http()` ya adjunta el `Authorization` header con el access token en memoria si existe, en **cualquier** request — incluida la de `ArticleView.vue`, que hoy pasa `skipAuthRetry: true` pero eso solo evita el retry automático tras un 401, no impide que el token viaje si ya está seteado.
- Lo que **falta** es la superficie pública: pantallas de login/registro fuera de `/nexoat-admin`, algo en `AppHeader.vue` que muestre sesión/logout, y que el backend sepa leer ese token en el endpoint público de artículos (hoy no lo hace en absoluto, ver más abajo).

## Decisiones a tomar (no resueltas todavía — confirmar antes de empezar a picar código)

1. **¿Se construye ya la pantalla pública de login/registro, o se sigue esperando?** Es un prerrequisito real: sin ella, nadie externo puede ser `suscriptores_nivel_1`, y "recortar contenido" sería una función que nunca se activa en la práctica.
2. **Mensaje para `suscriptores_nivel_2`/`nivel_3` sin sistema de pagos.** Propuesta (no confirmada): el CTA que se muestra depende del `scope` requerido — si es `suscriptores_nivel_1`, botón real "Registrate gratis" que lleva al registro; si es `nivel_2`/`nivel_3`, mensaje "Próximamente" sin acción, para todos los visitantes (incluidos los ya registrados en nivel_1), porque comprar todavía no existe.
3. **Redirect de OAuth hardcodeado al callback del admin.** `google-auth.controller.ts`/`facebook-auth.controller.ts` hoy redirigen siempre a `${FRONTEND_URL}/nexoat-admin/oauth-callback` — si el login público también ofrece "Continuar con Google", hace falta diferenciar el destino (ej. un parámetro `state` que viaje ida y vuelta por el proveedor OAuth, con el callback público como `views/PublicOAuthCallbackView.vue` separado del admin). Si por ahora el login público es solo email+contraseña (sin OAuth), este punto se puede posponer.
4. **¿El corte se calcula en cada request o se guarda pre-calculado?** Recomendado: en cada request (buscar `<!--corte-->` en `article.content` y cortar ahí, sin persistir una copia recortada) — el contenido es texto plano corto, no vale la pena la complejidad de mantener dos copias sincronizadas.

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

| Archivo                                                  | Cambio                                                                                                                                                                                                                                                                    |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `stores/auth.ts`                                         | Agregar `register(email, password, name?)` (falta hoy, solo hay `login`).                                                                                                                                                                                                 |
| `router/index.ts`                                        | Rutas públicas nuevas, ej. `/ingresar`, `/registrarme` (fuera del árbol `/nexoat-admin`, sin `meta.layout: 'admin'`).                                                                                                                                                     |
| `views/LoginView.vue`, `views/RegisterView.vue` (nuevos) | Formularios mínimos, mismo patrón visual que `AdminLoginView.vue` pero con el layout público (`AppHeader`/`AppFooter`), siguiendo el skill de diseño.                                                                                                                     |
| `components/layout/AppHeader.vue`                        | Mostrar "Ingresar" o el nombre de usuario + "Salir" según `authStore.isAuthenticated`.                                                                                                                                                                                    |
| `App.vue`                                                | Llamar `authStore.bootstrap()` también en el layout público (hoy probablemente solo se dispara para rutas admin — confirmar al implementar).                                                                                                                              |
| `types/index.ts`                                         | `ArticleFull` suma `isTruncated: boolean`, `requiredScope?: ArticleScope`.                                                                                                                                                                                                |
| `views/ArticleView.vue`                                  | Sacar `skipAuthRetry: true` de la request si ya hay sesión (o dejarlo, no bloquea el envío del token — confirmar que no haga falta tocarlo). Si `article.isTruncated`, renderizar el contenido parcial + bloque de CTA en vez del resto (según la decisión pendiente #2). |

## Fuera de alcance de esta fase

- Cobro real (Stripe/Mercado Pago/etc.) y todo lo que dependa de saber si un pago está al día (renovaciones, vencimientos, webhooks).
- Verificación de email obligatoria para el registro público (mismo criterio que ya aplica al admin — se posterga hasta tener proveedor de email, ver `auth-and-admin-dashboard.md`).
- Panel de "mi cuenta" para que un lector vea/cambie su nivel — no tiene sentido hasta que haya algo pago que gestionar.

## Plan de verificación (al implementar)

1. Test de backend: pedir `GET /articles/:slug` de un artículo `suscriptores_nivel_1` sin token → el `content` de la respuesta **no contiene** el texto posterior al marcador (inspeccionar el body, no confiar en el frontend).
2. Test de backend: mismo artículo, con token de un usuario `gratuito` → contenido completo.
3. Test de backend: `EDITOR`/`ADMIN`/`SUPER_ADMIN` siempre ven completo, sin importar `scope` ni `subscriptionTier`.
4. Manual: registrarse desde `/registrarme`, confirmar que la sesión persiste tras recargar (vía `refresh()`/cookie httpOnly) y que un artículo `suscriptores_nivel_1` que antes se veía recortado ahora se ve completo.
5. Manual: artículo `suscriptores_nivel_2` — confirmar que muestra "Próximamente" (o lo que se decida en el punto pendiente #2) incluso estando registrado en nivel_1.
