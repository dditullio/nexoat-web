# NexoAT — Guía para Claude Code

Sitio de divulgación en español sobre Acompañamiento Terapéutico (AT) y cuidado de personas. Monorepo `pnpm` con `frontend` (Vue 3, blog público + dashboard admin) y `backend` (NestJS, API).

**Antes de trabajar en cualquier parte no trivial del proyecto, leé `docs/README.md`** — ahí está el índice de la documentación técnica de desarrollo (decisiones de arquitectura, schema, plan de implementación por funcionalidad). Este archivo (`CLAUDE.md`) es solo el mapa; el detalle vive en `docs/`.

## Stack

- **Monorepo:** `pnpm` workspaces (`frontend/`, `backend/`) — Node ≥20, pnpm ≥9.
- **Frontend** (`frontend/`): Vue 3 (Composition API + `<script setup>`) + TypeScript + Vite + Vue Router + Pinia + Tailwind CSS v4.
- **Backend** (`backend/`): NestJS 11 (Fastify adapter) + Prisma + PostgreSQL + Swagger (`/api/docs`). Hoy es mayormente un scaffold — ver estado actual más abajo.
- **Calidad:** ESLint v10 (flat config) + Prettier 3, Husky (`pre-commit` → lint-staged, `commit-msg` → commitlint), Changesets para versionado semántico.
- **Testing:** Vitest + `@vue/test-utils` + `happy-dom` (frontend); Jest + `@nestjs/testing` + `ts-jest` (backend).

## Comandos

Todos se corren desde la raíz del repo.

| Comando                                          | Qué hace                                        |
| ------------------------------------------------ | ----------------------------------------------- |
| `pnpm install`                                   | Instala todo el monorepo                        |
| `pnpm dev`                                       | Frontend en `http://localhost:3000`             |
| `docker-compose -f docker-compose.dev.yml up -d` | Levanta solo PostgreSQL para desarrollo local   |
| `pnpm --filter @nexoat/backend start:dev`        | Backend en `http://localhost:3001` (watch mode) |
| `pnpm build` / `pnpm build:backend`              | Build de producción de frontend / backend       |
| `pnpm type-check`                                | Type-check de todo el monorepo                  |
| `pnpm test` / `pnpm test:cov`                    | Tests de todo el monorepo (con cobertura)       |
| `pnpm lint` / `pnpm format`                      | Lint y formateo con auto-fix                    |
| `pnpm --filter @nexoat/backend db:migrate`       | Nueva migración de Prisma (dev)                 |
| `pnpm --filter @nexoat/backend db:seed`          | Corre `prisma/seed.ts`                          |
| `pnpm --filter @nexoat/backend db:studio`        | Prisma Studio                                   |
| `pnpm changeset`                                 | Registra un cambio para el próximo release      |

Variables de entorno: copiar `.env.example` a `.env` en la raíz antes de levantar backend o Docker.

## Convenciones

- **Commits:** [Conventional Commits](https://www.conventionalcommits.org/) en minúscula, sin punto final, header ≤100 caracteres. Tipos permitidos: `feat fix docs style refactor perf test chore ci build revert` (ver `commitlint.config.cjs`). Se valida automáticamente en el commit-msg hook — no hace falta correrlo a mano.
- **Idioma:** todo el contenido de cara al usuario (UI, copy, commits, docs) va en español.
- **Diseño visual:** el frontend sigue el skill de proyecto **`.claude/skills/nexoat-design-system/SKILL.md`** — sistema «Humanista cálido» (paleta salvia/arcilla/ocre, tipografía Fraunces+Karla, el motivo del "arco", tokens de tema claro/oscuro en `frontend/src/assets/styles/main.css`). Se auto-invoca al tocar UI; **toda pantalla o componente nuevo (incluido el futuro dashboard admin) debe seguirlo**, no inventar estilos sueltos.
- **Documentación de desarrollo:** vive en `docs/`, no en el historial de chat ni solo en memoria — sobrevive a limpiezas de contexto. Convención: un documento por funcionalidad en `docs/features/`, escrito **antes** de implementar, con contexto + decisiones técnicas + schema + módulos/archivos a crear + plan de verificación. Ver `docs/README.md` para el índice completo.

## Estructura

```
frontend/src/
  assets/styles/main.css   — sistema de diseño (tokens, ver skill de arriba)
  components/layout/       — AppHeader, AppFooter
  components/blog/         — ArticleCard, CategoryCard, FilterBar
  components/ui/           — AppChip, ThemeToggle
  composables/             — useReveal (scroll-reveal)
  stores/                  — blog.ts (artículos/categorías/filtros), theme.ts
  views/                   — HomeView, CategoryView, ArticleView, SearchView, AboutView, NotFoundView
  router/index.ts          — rutas públicas
  data/mockArticles.ts     — datos estáticos actuales (a reemplazar por la API, ver docs/features/)

backend/
  src/                     — scaffold NestJS (main.ts, app.module.ts) — sin auth ni módulos de negocio todavía
  prisma/schema.prisma     — Category, Tag, Article, ArticleTag (más modelos pendientes, ver docs/features/)

docs/
  README.md                — índice de documentación de desarrollo
  features/                — un doc por funcionalidad (contexto + decisiones + plan)
```

## Estado actual y próximos pasos

- El blog público funciona con datos **estáticos** (`frontend/src/data/mockArticles.ts`); el backend es un scaffold sin auth ni endpoints de negocio.
- **Ya documentado, pendiente de implementar:** `docs/features/auth-and-admin-dashboard.md` — gestión de usuarios (email + OAuth Google/Facebook condicional), roles, y dashboard admin en `/nexoat-admin` (artículos CRUD, usuarios, auditoría, suscripciones). Es el próximo paso del roadmap y tiene el schema de Prisma, los módulos backend/frontend y el plan de verificación completos — **leerlo antes de tocar código de esa funcionalidad**.
- Roadmap de producto completo (bolsa de trabajo, directorio de acompañantes) más allá de esta funcionalidad: si no está aún documentado en `docs/features/`, preguntar antes de asumir alcance.
