# Documentación de desarrollo — NexoAT

Índice de la documentación técnica del proyecto. Vive en el repo (no en el historial de chat) para que sobreviva a limpiezas de contexto entre sesiones.

## Convención

- `docs/features/` — un documento por funcionalidad/etapa del roadmap: contexto, decisiones técnicas, schema, módulos/archivos a crear, dependencias, y plan de verificación. Se escriben **antes** de implementar (o durante, si cambian decisiones) y quedan como referencia una vez implementado.
- Formato: Markdown, en español, con el mismo nivel de detalle que un ADR (Architecture Decision Record) — no solo "qué" sino "por qué".

## Documentos

- [`features/auth-and-admin-dashboard.md`](features/auth-and-admin-dashboard.md) — Gestión de usuarios (email + Google/Facebook OAuth), roles, y dashboard administrativo en `/nexoat-admin` (artículos, usuarios, auditoría, suscripciones). **Estado: implementado y verificado.**
- [`features/media-uploads-cloudinary.md`](features/media-uploads-cloudinary.md) — Subida/reemplazo/borrado de imágenes de portada de artículos vía Cloudinary, directo desde el formulario del admin. **Estado: implementado.**
- [`features/article-md-import.md`](features/article-md-import.md) — Autocompletar el formulario de artículo soltando el `.md` de origen (drag & drop). **Estado: implementado.**
- [`features/category-cover-images.md`](features/category-cover-images.md) — Imagen de portada por categoría (tarjetas y encabezado), con pantalla admin nueva en `/nexoat-admin/categorias`. **Estado: implementado.**
- [`features/database-backups.md`](features/database-backups.md) — Copias de seguridad manuales de la DB (zip con JSONL + metadata), listado/descarga/restauración en `/nexoat-admin/respaldos`, solo SUPER_ADMIN. **Estado: implementado.**
- [`features/article-sources-and-published-date.md`](features/article-sources-and-published-date.md) — La `fecha` del `.md` importado pasa a ser `publishedAt` real, y las `fuentes` del `.md` (o cargadas a mano) se muestran en el artículo público. **Estado: implementado.**
- [`features/article-scope-filters.md`](features/article-scope-filters.md) — Campo `alcance`/`scope` en artículos (público / suscriptores nivel 1-3): clasificación editorial + filtros en listados públicos y admin. **Estado: fase 1 (clasificación/filtros) implementada.**
- [`features/reader-accounts-and-paywall.md`](features/reader-accounts-and-paywall.md) — Fase 2 del `alcance`: registro/login público de lectores (solo email) + recorte real de contenido (marcador `<!--corte-->`) en el backend. **Estado: implementado.**
- [`features/new-categories-batch-1.md`](features/new-categories-batch-1.md) — 5 categorías nuevas (Maltrato y Abuso, Aspectos Legales y Derechos, Historias que Humanizan, Autismo y TEA, Discapacidad Intelectual y Psicosocial) que llevan el set de 10 a 15. **Estado: implementado (alta de categoría — reclasificación de artículos pendiente).**
- [`features/deploy-vps-traefik.md`](features/deploy-vps-traefik.md) — Deploy a producción en el VPS de Hostinger, detrás del Traefik compartido con las otras apps del servidor. **Estado: implementado.**
- [`features/site-settings-visible-scopes.md`](features/site-settings-visible-scopes.md) — Sección "Configuración" en el admin (`/nexoat-admin/configuracion`, solo ADMIN+) para prender/apagar por nivel (1/2/3) qué artículos de suscripción se muestran en el sitio público, mientras no exista el cobro real. **Estado: implementado.**
- [`features/new-categories-batch-2.md`](features/new-categories-batch-2.md) — 5 categorías nuevas de contenido laboral/profesional para AT (Redacción Clínica y Objetivos, Encuadre/Honorarios/Facturación, Organización y Salud Ocupacional, Recursos y Materiales de Trabajo, Equipo/Familias/Capacitación) que llevan el set de 15 a 20. **Estado: implementado (alta de categoría — los artículos que las motivaron todavía no están escritos).**
- [`features/content-tracks.md`](features/content-tracks.md) — Eje temático (`ContentTrack`: acompañamiento terapéutico / cuidado de mayores / recursos profesionales AT) como filtro suave y persistente, para que cada público vea menos "ruido" del otro sin ocultarlo. **Estado: implementado y verificado en desarrollo local — pendiente de desplegar a producción.**

## Referencias relacionadas (fuera de `/docs`)

- `.claude/skills/nexoat-design-system/SKILL.md` — sistema de diseño visual del sitio («Humanista cálido»); toda UI nueva (incluido el admin) debe seguirlo.
- Memoria de proyecto (`project-nexoat.md`, fuera del repo, en el directorio de memoria de Claude Code) — stack, estructura, roadmap de producto a alto nivel.
