# SEO e indexación en Google

**Estado: fase 1 y 2 implementadas.** Fase 3 (renderizado del lado del servidor) queda documentada pero deliberadamente pospuesta — ver "Decisiones" y "Pendiente" más abajo.

## Contexto

El frontend (`frontend/`) es una SPA pura: Vite + Vue Router en modo `history`, sin SSR ni prerender (`frontend/index.html` es un `<div id="app">` vacío que Vue rellena en el cliente). Hasta ahora:

- El único `<meta name="description">` era el genérico del `index.html`, igual en todas las páginas.
- El único manejo de `<title>` era un `document.title` fijado en `router.afterEach()` ([router/index.ts:336](../../frontend/src/router/index.ts)), sin descripción, sin Open Graph, sin canonical.
- No existía `sitemap.xml` ni `robots.txt`.
- No había datos estructurados (JSON-LD).

Para un sitio cuyo modelo depende de que lo encuentren en Google (y de que los artículos se compartan bien en WhatsApp/redes, donde caregivers y profesionales efectivamente los pasan entre sí), esto es una limitación real, no cosmética.

## Decisiones

- **No se implementa SSR/SSG todavía.** Se evaluó (`vite-ssg`, prerender en build) y se descarta por ahora porque el contenido se publica desde `/nexoat-admin` en cualquier momento, sin pipeline de rebuild atado a esa acción — el deploy actual es manual (`git pull` + `docker compose up --build` en el VPS, ver `docs/features/deploy-vps-traefik.md`). Un artículo nuevo quedaría con HTML estático desactualizado (o inexistente) hasta el próximo deploy manual, lo que sería peor que la situación actual para el caso concreto que más importa: que un artículo recién publicado se indexe rápido.
- **Se prioriza lo que no depende de renderizado**: metadatos dinámicos por ruta (client-side, pero presentes en el DOM final que Google sí ejecuta y lee) + `sitemap.xml`/`robots.txt` generados en caliente desde la base de datos. Google indexa SPAs ejecutando JS desde 2019 — más lento que HTML estático, pero funcional — así que esto ya destraba la mayor parte del problema sin tocar la arquitectura de renderizado.
- **`@unhead/vue`** para meta tags dinámicos: es la librería que reemplazó a `@vueuse/head` (mismo autor/API, ahora el estándar de facto en el ecosistema Vue, la usa Nuxt 3+ internamente) — evita reinventar el manejo de `<head>` reactivo.
- **El sitemap lo genera el backend**, no un job estático: el contenido vive en Postgres y cambia por altas/bajas de artículos sin ningún build de por medio. Vive bajo la ruta de la API (`/v1/sitemap.xml`) pero se expone al público en `https://nexoat.com/sitemap.xml` — mismo patrón que WordPress/otros CMS (el sitemap tiene que estar en el dominio canónico del contenido, no en el de la API). Se resuelve con un proxy en `nginx.conf` del frontend, sin exponer el dominio de la API en el sitemap.
- **`robots.txt` es estático** (`frontend/public/robots.txt`): solo necesita listar rutas privadas + apuntar al sitemap, y esas rutas no cambian con el contenido — no vale la pena generarlo dinámicamente.
- **JSON-LD solo en `ArticleView`** (schema `Article`) por ahora — es la página que Google puede convertir en rich result. `BreadcrumbList`/`Organization` quedan para una iteración futura si hace falta.
- **Fase 3 (pospuesta): renderizado para bots.** Si tras medir en Search Console (ver "Plan de verificación") la indexación real resulta pobre, o si compartir un link de artículo en WhatsApp/Facebook no muestra preview (esos crawlers _no_ ejecutan JS, a diferencia de Googlebot), la solución de menor esfuerzo no es SSR completo sino **dynamic rendering**: detectar user-agents de bots conocidos (`Googlebot`, `facebookexternalhit`, `Twitterbot`, `WhatsApp`, `LinkedInBot`, etc.) en nginx o en un middleware, y servirles una vista prerenderizada solo para esos casos (ej. con Puppeteer/`prerender.io`/servicio propio), dejando el resto del tráfico igual que hoy. Se documenta acá para no perder el análisis, pero no se implementa mientras no haya evidencia de que hace falta.

## Fase 1 — Metadatos dinámicos + JSON-LD (frontend)

### Qué se agrega

- `@unhead/vue` instalado y registrado en `main.ts` (`createHead()` + `app.use(head)`).
- `frontend/src/composables/useSeoMeta.ts`: composable central que arma `title`, `meta description`, `canonical`, Open Graph (`og:title`, `og:description`, `og:image`, `og:type`, `og:url`) y Twitter Card, con defaults del sitio y overrides por página. Reemplaza el `document.title` manual del router guard.
- Cada vista pública (`HomeView`, `CategoryView`, `ArticleView`, `SearchView`, `AboutView`, `PlansView`) llama a `useSeoMeta()` con sus propios título/descripción/imagen — en `ArticleView`/`CategoryView`, derivados de los datos reales del artículo/categoría (no un texto genérico).
- `VITE_SITE_URL` (nueva env var, `https://nexoat.com` en producción) para armar URLs absolutas de `canonical` y `og:url`/`og:image` — Vite la inlinea en build igual que `VITE_API_URL`.
- JSON-LD `Article` inyectado en `ArticleView` vía el mismo `useHead` (script `type="application/ld+json"`), con `headline`, `description`, `image`, `datePublished`, `author` (nombre fijo del sitio, no hay autoría individual hoy), `publisher`.
- Rutas privadas/transaccionales (`/nexoat-admin/*`, `/mi-cuenta/*`, `/ingresar*`, `/registrarme*`, flujos de auth) reciben `<meta name="robots" content="noindex, nofollow">` vía el mismo composable — no tiene sentido que Google las indexe y en algunos casos (login, reset de contraseña) es directamente indeseable.

### Archivos

| Archivo                                                                                                                      | Cambio                                                                                                                                                      |
| ---------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `frontend/package.json`                                                                                                      | + dependencia `@unhead/vue`                                                                                                                                 |
| `frontend/src/main.ts`                                                                                                       | `createHead()` + `app.use(head)`                                                                                                                            |
| `frontend/src/composables/useSeoMeta.ts`                                                                                     | nuevo — composable central                                                                                                                                  |
| `frontend/src/router/index.ts`                                                                                               | el `router.afterEach` deja de tocar `document.title` directo (lo maneja `useSeoMeta` por vista); se mantiene como fallback para rutas sin llamada explícita |
| `frontend/src/views/HomeView.vue`, `CategoryView.vue`, `ArticleView.vue`, `SearchView.vue`, `AboutView.vue`, `PlansView.vue` | agregan `useSeoMeta(...)`                                                                                                                                   |
| `frontend/vite-env.d.ts` o similar                                                                                           | tipo de `VITE_SITE_URL`                                                                                                                                     |
| `.env.example`, `docker-compose.prod.yml`, `frontend/Dockerfile`                                                             | nueva build arg `VITE_SITE_URL`                                                                                                                             |

## Fase 2 — `sitemap.xml` + `robots.txt`

### Qué se agrega

- `backend/src/sitemap/` (módulo nuevo): `SitemapController` (`GET /sitemap.xml`, fuera del versionado `/v1` — ver nota abajo) + `SitemapService`, que arma el XML con:
  - Rutas estáticas públicas de valor SEO: `/`, `/acerca-de`, `/buscar`, `/planes`, `/terminos`.
  - Una entrada por categoría (`/categoria/:slug`), desde `Category`.
  - Una entrada por artículo publicado (`/articulo/:slug`), desde `Article` con `status: publicado` — mismo filtro que ya usa `findPublished`, y **sin filtrar por `scope` visible**: un artículo restringido igual conviene que esté en el sitemap (Google lo indexa con el contenido recortado que ve un visitante anónimo, no es contenido oculto).
  - `lastmod` = `updatedAt` de cada fila.
- `frontend/public/robots.txt`: `Sitemap: https://nexoat.com/sitemap.xml` + `Disallow` de `/nexoat-admin/`, `/mi-cuenta/`, `/ingresar`, `/registrarme`, `/completar-registro`, `/oauth-callback`, `/verificar-correo`, `/recuperar-contrasena`, `/restablecer-contrasena`, `/bienvenida`.
- `frontend/nginx.conf`: nuevo `location = /sitemap.xml` que hace `proxy_pass` al backend (`http://backend:3001/sitemap.xml` dentro de la red de Docker) — así el sitemap se sirve desde `nexoat.com`, no desde `api.nexoat.com`, sin duplicar lógica en el frontend.

### Nota sobre versionado

`main.ts` tiene `app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' })` global, así que por default cualquier controller nuevo cuelga de `/v1/...`. `SitemapController` usa `@Controller({ path: 'sitemap.xml', version: VERSION_NEUTRAL })` para quedar en `/sitemap.xml` sin prefijo — igual que cualquier motor de búsqueda espera encontrarlo.

### Archivos

| Archivo                                                                                | Cambio                                                                                                                                                  |
| -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `backend/src/sitemap/sitemap.module.ts`, `sitemap.controller.ts`, `sitemap.service.ts` | nuevo módulo                                                                                                                                            |
| `backend/src/app.module.ts`                                                            | registra `SitemapModule`                                                                                                                                |
| `frontend/public/robots.txt`                                                           | nuevo                                                                                                                                                   |
| `frontend/nginx.conf`                                                                  | proxy de `/sitemap.xml` al backend                                                                                                                      |
| `docker-compose.dev.yml` / flujo de dev                                                | sin proxy de nginx en dev (Vite sirve directo) — se documenta que en local el sitemap se prueba pegándole directo a `http://localhost:3001/sitemap.xml` |

## Plan de verificación

1. `pnpm --filter @nexoat/backend build` y `pnpm --filter @nexoat/frontend build` sin errores de tipos.
2. En dev: abrir `/`, `/categoria/:slug`, `/articulo/:slug` y confirmar en devtools que `<title>`, `meta[name=description]`, `meta[property^=og:]` y el `<script type="application/ld+json">` cambian por página con datos reales (no el texto genérico de antes).
3. `curl http://localhost:3001/sitemap.xml` en dev devuelve XML válido con las categorías y artículos publicados reales de la base local.
4. Login en `/nexoat-admin`, confirmar que esas rutas (y `/mi-cuenta/*`) traen `noindex` en el `<head>`.
5. Ya en producción: `curl -I https://nexoat.com/sitemap.xml` devuelve `200` con `Content-Type: application/xml`; `curl https://nexoat.com/robots.txt` devuelve el `Disallow` esperado.
6. Dar de alta la propiedad `nexoat.com` en Google Search Console (si no existe todavía), enviar el sitemap, y a los pocos días revisar cobertura/indexación — esa lectura es la que decide si hace falta la Fase 3.
7. Probar compartir un link de artículo real en WhatsApp y confirmar si genera preview (imagen/título/descripción) — si no, es la señal concreta de que vale la pena la Fase 3 (esos bots no ejecutan JS, por más que los meta tags de la Fase 1 estén bien armados client-side).

## Pendiente

- ~~Alta en Google Search Console + envío del sitemap~~ — hecho (26 de agosto de 2026).
- ~~Alta en Bing Webmaster Tools con el mismo sitemap~~ — hecho (26 de agosto de 2026).
- Medir resultado real (cobertura en Search Console, previews en WhatsApp/redes) antes de decidir si se invierte en la Fase 3 — dar unos días para que Google/Bing rastreen el sitemap recién enviado antes de sacar conclusiones.
- **Google Indexing API**: llamada desde el backend al publicar/actualizar un artículo (`UrlNotifications: publish`), para pedirle a Google que lo recrawlee de inmediato en vez de esperar el rastreo espontáneo — requiere una cuenta de servicio de Google Cloud verificada como dueña de la propiedad en Search Console. Evaluar junto con la Fase 3; no se implementa todavía por no tener aún ese alta hecha.
- `sitemap-index` con `lastmod` a nivel de imagen (`image:image` en el XML) si en algún momento se quiere aprovechar Google Images — no se hizo en esta fase por alcance.
- **Explícitamente descartado** (visto en una revisión de tips genéricos de YouTube, no aplican a este caso): migrar de dominio ante problemas de indexación (no hay evidencia de que `nexoat.com` tenga un problema real) y comprar paquetes de backlinks/servicios de indexación paga (riesgo de penalización por señales artificiales, resultados que el propio material fuente reconoce como irregulares).
