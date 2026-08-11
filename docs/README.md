# Documentación de desarrollo — NexoAT

Índice de la documentación técnica del proyecto. Vive en el repo (no en el historial de chat) para que sobreviva a limpiezas de contexto entre sesiones.

## Convención

- `docs/features/` — un documento por funcionalidad/etapa del roadmap: contexto, decisiones técnicas, schema, módulos/archivos a crear, dependencias, y plan de verificación. Se escriben **antes** de implementar (o durante, si cambian decisiones) y quedan como referencia una vez implementado.
- Formato: Markdown, en español, con el mismo nivel de detalle que un ADR (Architecture Decision Record) — no solo "qué" sino "por qué".

## Documentos

- [`features/auth-and-admin-dashboard.md`](features/auth-and-admin-dashboard.md) — Gestión de usuarios (email + Google/Facebook OAuth), roles, y dashboard administrativo en `/nexoat-admin` (artículos, usuarios, auditoría, suscripciones). **Estado: documentado, pendiente de implementar.**

## Referencias relacionadas (fuera de `/docs`)

- `.claude/skills/nexoat-design-system/SKILL.md` — sistema de diseño visual del sitio («Humanista cálido»); toda UI nueva (incluido el admin) debe seguirlo.
- Memoria de proyecto (`project-nexoat.md`, fuera del repo, en el directorio de memoria de Claude Code) — stack, estructura, roadmap de producto a alto nivel.
