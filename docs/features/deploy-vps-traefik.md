# Deploy a producción — VPS Hostinger + Traefik

**Estado: implementado en esta misma sesión.**

## Contexto

El VPS (Hostinger, Ubuntu 24.04, IP `2.25.176.94`, hostname `srv1734551.hstgr.cloud`) ya corre otras apps (n8n, WordPress, Hermes) detrás de una instancia compartida de **Traefik v3** (proyecto `traefik-thko`, en `/docker/traefik-thko/docker-compose.yml`). NexoAT tiene que convivir ahí sin pisar esas apps ni requerir su propio proxy.

En el setup inicial no había dominio propio comprado y se usaba el subdominio wildcard que Hostinger provee para el VPS (`*.srv1734551.hstgr.cloud → 2.25.176.94`), el mismo patrón que usan las otras apps del servidor (`wordpress-ukkk.srv1734551.hstgr.cloud`, `n8n-kxsc.srv1734551.hstgr.cloud`). **Desde el 19 de agosto de 2026 hay dominio propio activo**: `FRONTEND_DOMAIN=nexoat.com` y `BACKEND_DOMAIN=api.nexoat.com`, ya cargados en el `.env` de producción del VPS — tal como se anticipaba, el cambio no requirió tocar Traefik ni Let's Encrypt, solo esas dos variables.

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
- **Código actualizado con `git pull` en el servidor**, con una **deploy key de solo lectura** (`~/.ssh/nexoat_github_deploy`, ed25519, generada en el propio VPS — la privada nunca sale de ahí) agregada en GitHub → Settings → Deploy keys del repo, sin "Allow write access". `~/.ssh/config` en el VPS mapea `Host github.com` a esa identidad, así `git pull` no necesita `-i` explícito.
  - **Reemplaza el enfoque anterior** (`tar` sobre SSH desde la máquina local) — se cambió después de un incidente real: un `tar` sin excluir el `.env` de desarrollo local pisó el `.env` de producción al extraerse en el servidor. `git pull` no puede pisarlo porque `.env` está en `.gitignore` — nunca es parte del árbol que git toca.
  - El repo vive clonado en `/docker/nexoat` (mismo path de siempre); el `.env` real queda ahí mismo, ignorado por git, y sobrevive intacto a cualquier `git pull`/`git reset`.
- **Clave SSH dedicada** (`~/.ssh/nexoat_vps_deploy`, ed25519) agregada como `authorized_key` en el VPS — separada de otras claves personales, más fácil de revocar si hiciera falta. Sigue siendo la que se usa para conectarse _al_ VPS por SSH; la deploy key de arriba es una clave distinta, generada _en_ el VPS, que el VPS usa para autenticarse _contra_ GitHub.

## Dónde vive

| Archivo                                      | Qué hace                                                                                                                                  |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `docker-compose.prod.yml`                    | Postgres + backend + frontend, sin puertos publicados, con labels de Traefik parametrizadas por `${BACKEND_DOMAIN}`/`${FRONTEND_DOMAIN}`. |
| `frontend/Dockerfile`                        | Ahora acepta `VITE_API_URL` como build arg.                                                                                               |
| `/docker/nexoat/.env` (en el VPS, no en git) | Secretos + dominios de producción.                                                                                                        |
| `/docker/nexoat` (en el VPS)                 | Clon git del repo (`origin` = GitHub, deploy key de solo lectura) — ya no una copia suelta de archivos por `tar`.                         |
| `~/.ssh/nexoat_github_deploy*` (en el VPS)   | Deploy key de solo lectura del repo — la privada nunca sale del VPS.                                                                      |

## Cómo desplegar una actualización (después del primer setup)

```bash
ssh -i ~/.ssh/nexoat_vps_deploy root@2.25.176.94
cd /docker/nexoat
git pull
docker compose -f docker-compose.prod.yml --env-file .env up -d --build
```

Si la actualización agrega una migración de Prisma, se aplica sola al arrancar el contenedor (el `CMD` del `backend/Dockerfile` corre `prisma migrate deploy` antes de levantar el server) — conviene igual revisar los logs para confirmarlo: `docker logs nexoat-backend --tail 30`.

Si además hay que correr `db:seed` o un script de `backend/scripts/` (como `backfill:tracks`): la imagen de producción solo instala dependencias `--prod`, así que `ts-node` no está disponible ahí. Compilar el script a JS plano localmente (`npx tsc --module commonjs --target ES2021 --esModuleInterop --skipLibCheck --outDir /tmp/salida archivo.ts`) y copiarlo al contenedor con `docker cp`, o instalar devDependencies temporalmente en el contenedor con `pnpm install --filter @nexoat/backend...` (sin `--prod`, se pierde al reiniciar el contenedor). Evaluar en algún momento un target de build separado para esto si se vuelve algo frecuente.

## Plan de verificación

1. `docker compose -f docker-compose.prod.yml --env-file .env config` en el VPS sin errores (interpola bien las labels).
2. `docker compose ... up -d --build` — los 3 contenedores (`nexoat-db`, `nexoat-backend`, `nexoat-frontend`) quedan `Up`/`healthy`.
3. `docker compose ... exec backend pnpm --filter @nexoat/backend db:seed` — crea el `SUPER_ADMIN` inicial y siembra categorías.
4. `curl -I https://<FRONTEND_DOMAIN>` y `curl https://<BACKEND_DOMAIN>/v1/...` devuelven `200`/`certificado válido` (Traefik ya emitió el cert de Let's Encrypt).
5. Login en `/nexoat-admin` con el `SUPER_ADMIN` sembrado, confirmar que el panel carga artículos/categorías desde la API real.
6. `docker logs traefik-thko-traefik-1 --tail 50` sin errores de ACME para los nuevos hosts.

### Migración a `git pull` (14 de agosto de 2026)

1. Deploy key generada en el VPS y agregada en GitHub (solo lectura), probada con `ssh -T git@github.com`. ✅
2. `.env` de producción respaldado fuera del repo (`/root/nexoat-env-safekeep/`) y el dump de DB que había quedado en `/docker/nexoat/pre-reset-backups/` movido a `/root/nexoat-db-backups/` — ninguno de los dos vive ya dentro de un directorio que un futuro `git pull`/reset pueda tocar. ✅
3. Repo clonado limpio en `/docker/nexoat-git`, verificado en el commit esperado y `git status` limpio, luego swapeado con el directorio anterior (`/docker/nexoat` → `/docker/nexoat-old-tar`). ✅
4. `.env` restaurado dentro del nuevo `/docker/nexoat`, confirmado que `git status` no lo ve (bien gitignoreado) y que `docker compose config` interpola los dominios sin warnings. ✅
5. Contenedores no se tocaron durante la migración — siguieron `Up`/`healthy` todo el proceso, cero downtime. ✅
6. `/docker/nexoat-old-tar` se deja como red de seguridad temporal — borrar una vez que el próximo `git pull` real confirme que el flujo nuevo funciona de punta a punta.
