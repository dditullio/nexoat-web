# Analítica del sitio — Umami self-hosted

**Estado: implementado en el repo (compose + frontend) — pendiente de desplegar en el VPS y generar el website ID.**

## Contexto

El sitio no tenía ninguna analítica. Se evaluó Google Analytics (GA4) y se descartó: NexoAT es un sitio sobre salud mental, cuidado y discapacidad — el tipo de tema donde entregarle a un tercero (Google) el comportamiento de navegación de la audiencia (qué artículos lee alguien sobre "depresión en cuidadores" o "demencia en un familiar") pesa distinto que en un sitio genérico. GA4 además usa cookies/fingerprinting y obliga a un cookie banner de consentimiento en serio, fricción que el sitio no tiene hoy.

Se eligió **Umami self-hosted**: no usa cookies, no hace fingerprinting persistente entre sitios, los datos quedan en la propia infraestructura (mismo VPS del [deploy](deploy-vps-traefik.md)), y da lo esencial — páginas vistas, referrers, tiempo en página, países/dispositivos — sin necesitar cookie banner.

## Decisiones

- **Contenedor propio de Umami + Postgres propia** (`umami-db`, imagen `postgres:15-alpine`, volumen `umami_db_data`), separada de `nexoat-db`. No se reutiliza la Postgres de negocio para no mezclar el ciclo de vida (migraciones de Prisma, backups de `docs/features/database-backups.md`) con el de Umami, que gestiona su propio esquema.
- **Imagen `ghcr.io/umami-software/umami:postgresql-latest`** (variante oficial que habla con Postgres — la app usa Postgres o MySQL según la imagen; se eligió Postgres por consistencia con el resto del stack).
- **Subdominio propio detrás de Traefik**, mismo patrón wildcard que `BACKEND_DOMAIN`/`FRONTEND_DOMAIN` (`ANALYTICS_DOMAIN`, ej. `nexoat-analytics-xxxx.srv1734551.hstgr.cloud`) — nuevo router Traefik (`nexoat-analytics`), nombre único en todo el Traefik del VPS igual que los otros dos.
- **Script de tracking inyectado condicionalmente**, no hardcodeado en `index.html`: `frontend/src/main.ts` lo agrega vía JS solo si `VITE_UMAMI_SRC` y `VITE_UMAMI_WEBSITE_ID` están seteadas. Mismo mecanismo que `VITE_API_URL` (build arg de Vite, inlineado en build time — ver [`deploy-vps-traefik.md`](deploy-vps-traefik.md)). En desarrollo local esas vars quedan vacías, así que no se trackea nada desde `localhost`.
- **El website ID no se puede conocer de antemano**: Umami lo genera recién cuando se crea el sitio "NexoAT" desde su propio panel admin, después del primer deploy del contenedor. Flujo de dos pasos inevitable la primera vez (ver más abajo).
- **Sin cookie banner nuevo**: Umami no usa cookies ni almacenamiento persistente para trackear visitantes (calcula una "visita" con un hash de IP+user-agent que rota diariamente, sin guardar el dato crudo) — no cambia la postura de privacidad del sitio ni agrega fricción de consentimiento.

## Qué se agregó/cambió

| Archivo                   | Qué hace                                                                              |
| ------------------------- | ------------------------------------------------------------------------------------- |
| `docker-compose.prod.yml` | Servicios `umami-db` + `umami`, con labels de Traefik para `${ANALYTICS_DOMAIN}`.     |
| `frontend/Dockerfile`     | Build args nuevos `VITE_UMAMI_SRC` / `VITE_UMAMI_WEBSITE_ID`.                         |
| `frontend/src/main.ts`    | Inyecta el `<script>` de tracking de Umami solo si las vars de arriba están seteadas. |

### Variables nuevas (solo en `/docker/nexoat/.env` del VPS — no van en `.env.example`, mismo criterio que `BACKEND_DOMAIN`/`FRONTEND_DOMAIN`, ver [`deploy-vps-traefik.md`](deploy-vps-traefik.md))

```
ANALYTICS_DOMAIN=nexoat-analytics-xxxx.srv1734551.hstgr.cloud
UMAMI_DB_PASSWORD=<generar>
UMAMI_APP_SECRET=<openssl rand -hex 32>
VITE_UMAMI_SRC=https://${ANALYTICS_DOMAIN}/script.js
VITE_UMAMI_WEBSITE_ID=<se completa después del paso 1 de abajo>
```

## Cómo desplegar (primera vez)

1. `git pull` en el VPS, completar `ANALYTICS_DOMAIN`, `UMAMI_DB_PASSWORD` y `UMAMI_APP_SECRET` en `.env` (dejar `VITE_UMAMI_SRC`/`VITE_UMAMI_WEBSITE_ID` vacías todavía).
2. `docker compose -f docker-compose.prod.yml --env-file .env up -d --build umami-db umami` — solo esos dos servicios, no hace falta rebuildear el frontend todavía.
3. Entrar a `https://${ANALYTICS_DOMAIN}`, crear el usuario admin de Umami (primer login) y agregar un sitio nuevo llamado "NexoAT" con el dominio público del sitio (`FRONTEND_DOMAIN`, o el dominio propio cuando se compre). Umami muestra el **website ID** generado.
4. Completar `VITE_UMAMI_SRC=https://${ANALYTICS_DOMAIN}/script.js` y `VITE_UMAMI_WEBSITE_ID=<el ID del paso 3>` en el `.env` del VPS.
5. `docker compose -f docker-compose.prod.yml --env-file .env up -d --build frontend` — rebuild del frontend con el script ya inlineado.

Actualizaciones normales después de esto siguen el flujo estándar de `git pull` + `up -d --build` de [`deploy-vps-traefik.md`](deploy-vps-traefik.md), sin pasos extra (las vars ya quedan en el `.env` del VPS).

## Plan de verificación

1. `docker compose -f docker-compose.prod.yml --env-file .env config` sin errores, interpola bien las labels nuevas.
2. `umami-db` y `umami` quedan `Up`/`healthy`; `https://${ANALYTICS_DOMAIN}` carga el login de Umami con TLS válido (Traefik/Let's Encrypt).
3. Después de completar los pasos 3-5: `view-source:` sobre el sitio público muestra el `<script>` de Umami con el `data-website-id` correcto.
4. Navegar el sitio público y confirmar que aparecen visitas en tiempo real en el panel de Umami (`Realtime` o el dashboard del sitio).
5. Confirmar en local (`pnpm dev`) que el script **no** se inyecta (`VITE_UMAMI_SRC` vacía en `.env` de dev) — no se debe trackear tráfico de desarrollo.
