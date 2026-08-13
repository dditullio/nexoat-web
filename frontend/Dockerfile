FROM node:20-alpine AS builder

WORKDIR /app

RUN npm install -g pnpm

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY frontend/package.json ./frontend/

RUN pnpm install --frozen-lockfile --filter @nexoat/frontend...

COPY frontend/ ./frontend/

# Vite inlinea las env vars VITE_* en el bundle en tiempo de build, no en
# runtime — por eso hace falta pasarla como build arg (ver
# docker-compose.prod.yml) en vez de una variable de entorno del
# contenedor final, que ya no tendría efecto.
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

RUN pnpm --filter @nexoat/frontend build

FROM nginx:alpine AS runner

COPY --from=builder /app/frontend/dist /usr/share/nginx/html
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
