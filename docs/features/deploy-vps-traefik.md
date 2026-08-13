# Deploy a producción — VPS Hostinger + Traefik

**Estado: implementado en esta misma sesión.**

## Contexto

El VPS (Hostinger, Ubuntu 24.04, IP `2.25.176.94`, hostname `srv1734551.hstgr.cloud`) ya corre otras apps (n8n, WordPress, Hermes) detrás de una instancia compartida de **Traefik v3** (proyecto `traefik-thko`, en `/docker/traefik-thko/docker-compose.yml`). NexoAT tiene que convivir ahí sin pisar esas apps ni requerir su propio proxy.

Todavía no hay dominio propio comprado. Se usa el subdominio wildcard que Hostinger ya provee para el VPS (`*.srv1734551.hstgr.cloud → 2.25.176.94`, confirmado por DNS), el mismo patrón que usan las otras apps del servidor (`wordpress-ukkk.srv1734551.hstgr.cloud`, `n8n-kxsc.srv1734551.hstgr.cloud`). Cuando se compre un dominio propio, solo hace falta cambiar `BACKEND_DOMAIN`/`FRONTEND_DOMAIN` en el `.env` del servidor y redeployar — Traefik y Let's Encrypt no necesitan cambios.

## Cómo descubre Traefik a los contenedores (importante para no romper nada)

El Traefik del VPS corre con `--network=host` y el **Docker provider** (`--providers.docker=true --providers.docker.exposedbydefault=false`). Eso significa:

- **No hace falta una red docker compartida** — Traefik lee el socket de Docker (`/var/run/docker.sock`, montado read-only) y contacta a cada contenedor por su IP interna, alcanzable desde el namespace de red del host.
- **No hay que publicar puertos al host** (`ports:` en el compose) para que Traefik enrute — de hecho es mejor no hacerlo, evita colisiones de puertos con las otras apps.
- Cada contenedor que quiere ser enrutado necesita las labels `traefik.enable=true` + un router (`Host(...)`, `certresolver=letsencryt`) + `loadbalancer.server.port`. Los nombres de router (`nexoat-api`, `nexoat-web`) tienen que ser únicos en **todo** el Traefik (ve routers de todas las apps del VPS), no solo dentro del compose de NexoAT.

Verificado inspeccionando los labels reales de `wordpress-ukkk` y `n8n-kxsc` antes de replicar el patrón.

## Decisiones

- **Build en el propio VPS**, no imágenes pre-armadas ni registry — el VPS tiene recursos de sobra para un build de este tamaño y evita mantener un registry aparte.
- **Contexto de build = raíz del monorepo**, no `./backend`/`./frontend` — los `Dockerfile` copian `package.json`/`pnpm-lock.yaml`/`pnpm-workspace.yaml` de la raíz antes de instalar con `--filter`, así que necesitan verla. El `docker-compose.yml` de desarrollo tenía este bug latente (`context: ./backend` / `./frontend`, nunca se había probado un build real con él) — corregido en `docker-compose.prod.yml`.
- **`VITE_API_URL` como build arg**, no env var de runtime — Vite inlinea las `VITE_*` en el bundle al momento del build (`frontend/Dockerfile`, `ARG VITE_API_URL` + `ENV` antes de `pnpm build`). Pasarla solo en runtime (como hacía el compose de dev) no tiene efecto en producción.
- **Secretos fuera del repo**: `docker-compose.prod.yml` solo referencia `${VARS}` — el `.env` real con `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `POSTGRES_PASSWORD`, `SEED_ADMIN_EMAIL`/`PASSWORD`, credenciales de Cloudinary (reutilizadas de dev) y los dos dominios vive únicamente en `/docker/nexoat/.env` en el VPS, nunca en git.
- **Código llevado al VPS por `tar` sobre SSH** (no `git clone` en el servidor) — evita tener que gestionar una deploy key de GitHub para este primer despliegue; se reevalúa si en el futuro se arma CI/CD.
- **Clave SSH dedicada** (`~/.ssh/nexoat_vps_deploy`, ed25519) agregada como `authorized_key` en el VPS — separada de otras claves personales, más fácil de revocar si hiciera falta.

## Dónde vive

| Archivo                                      | Qué hace                                                                                                                                  |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `docker-compose.prod.yml`                    | Postgres + backend + frontend, sin puertos publicados, con labels de Traefik parametrizadas por `${BACKEND_DOMAIN}`/`${FRONTEND_DOMAIN}`. |
| `frontend/Dockerfile`                        | Ahora acepta `VITE_API_URL` como build arg.                                                                                               |
| `/docker/nexoat/.env` (en el VPS, no en git) | Secretos + dominios de producción.                                                                                                        |

## Plan de verificación

1. `docker compose -f docker-compose.prod.yml --env-file .env config` en el VPS sin errores (interpola bien las labels).
2. `docker compose ... up -d --build` — los 3 contenedores (`nexoat-db`, `nexoat-backend`, `nexoat-frontend`) quedan `Up`/`healthy`.
3. `docker compose ... exec backend pnpm --filter @nexoat/backend db:seed` — crea el `SUPER_ADMIN` inicial y siembra categorías.
4. `curl -I https://<FRONTEND_DOMAIN>` y `curl https://<BACKEND_DOMAIN>/v1/...` devuelven `200`/`certificado válido` (Traefik ya emitió el cert de Let's Encrypt).
5. Login en `/nexoat-admin` con el `SUPER_ADMIN` sembrado, confirmar que el panel carga artículos/categorías desde la API real.
6. `docker logs traefik-thko-traefik-1 --tail 50` sin errores de ACME para los nuevos hosts.
