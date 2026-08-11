FROM node:20-alpine AS builder

WORKDIR /app

RUN npm install -g pnpm

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY backend/package.json ./backend/

RUN pnpm install --frozen-lockfile --filter @nexoat/backend...

COPY backend/ ./backend/

RUN pnpm --filter @nexoat/backend build
RUN pnpm --filter @nexoat/backend db:generate

FROM node:20-alpine AS runner

WORKDIR /app

RUN npm install -g pnpm

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY backend/package.json ./backend/

RUN pnpm install --frozen-lockfile --filter @nexoat/backend... --prod

COPY --from=builder /app/backend/dist ./backend/dist
COPY --from=builder /app/backend/node_modules/.prisma ./backend/node_modules/.prisma
COPY backend/prisma ./backend/prisma

EXPOSE 3001

# "prisma" es dependencia normal (no dev) justamente para que la CLI esté
# disponible acá: el contenedor de producción nunca corría las migraciones
# antes de este cambio.
CMD ["sh", "-c", "npx prisma migrate deploy --schema=./backend/prisma/schema.prisma && node backend/dist/main"]
