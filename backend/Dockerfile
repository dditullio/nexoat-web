FROM node:20-alpine AS builder

WORKDIR /app

# El "prepare: husky" del package.json raíz se dispara en cualquier
# "pnpm install" (incluido --prod en la etapa runner, donde husky ni
# siquiera está instalado por ser devDependency) — HUSKY=0 es la forma
# soportada por husky de saltear ese hook fuera de un entorno de desarrollo.
ENV HUSKY=0

RUN npm install -g pnpm

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY backend/package.json ./backend/

# HUSKY=0 no alcanza en la etapa runner: ahí la instalación es --prod, así
# que husky ni siquiera queda en node_modules/.bin y el shell falla con
# "husky: not found" antes de que el propio binario llegue a leer esa
# variable. Se borra el script directamente del package.json copiado.
RUN npm pkg delete scripts.prepare

RUN pnpm install --frozen-lockfile --filter @nexoat/backend...

COPY backend/ ./backend/

# db:generate (prisma generate) tiene que ir antes del build: "nest build"
# necesita los tipos del cliente de Prisma (Role, User, Prisma.*, etc.) ya
# generados, si no falla con "no exported member" en cada import.
RUN pnpm --filter @nexoat/backend db:generate
RUN pnpm --filter @nexoat/backend build

FROM node:20-alpine AS runner

WORKDIR /app

ENV HUSKY=0

RUN npm install -g pnpm

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY backend/package.json ./backend/

# HUSKY=0 no alcanza en la etapa runner: ahí la instalación es --prod, así
# que husky ni siquiera queda en node_modules/.bin y el shell falla con
# "husky: not found" antes de que el propio binario llegue a leer esa
# variable. Se borra el script directamente del package.json copiado.
RUN npm pkg delete scripts.prepare

RUN pnpm install --frozen-lockfile --filter @nexoat/backend... --prod

COPY --from=builder /app/backend/dist ./backend/dist
COPY backend/prisma ./backend/prisma

# Con pnpm workspaces el cliente generado no queda en
# backend/node_modules/.prisma sino dentro del store virtual
# (node_modules/.pnpm/...), así que copiarlo de la etapa "builder" por esa
# ruta no funciona (ni existe ahí). Más simple: generarlo de nuevo acá,
# contra el node_modules --prod recién instalado.
RUN pnpm --filter @nexoat/backend db:generate

EXPOSE 3001

# "prisma" es dependencia normal (no dev) justamente para que la CLI esté
# disponible acá: el contenedor de producción nunca corría las migraciones
# antes de este cambio. "npx prisma" no sirve: con el layout de pnpm no
# encuentra el binario ya instalado (6.19.3) y termina bajando el último
# major de npm (7.x, incompatible con "url" en el datasource) — "pnpm
# --filter ... exec" sí resuelve el binario del workspace.
CMD ["sh", "-c", "pnpm --filter @nexoat/backend exec prisma migrate deploy && node backend/dist/main"]
