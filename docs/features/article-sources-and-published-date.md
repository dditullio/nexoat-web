# Fecha de publicación real y fuentes citadas

**Estado:** documentado e implementado en esta misma sesión.

## Contexto

Los `.md` de origen (ver [`article-md-import.md`](article-md-import.md)) traen dos datos que hasta ahora no se aprovechaban al importar un artículo:

1. `fecha`: la fecha real en la que el texto se dio por terminado/revisado. El import la ignoraba a propósito — `publishedAt` se seteaba a `new Date()` en el momento en que el status pasaba a `publicado`, no a la fecha del texto.
2. `fuentes`: un array nuevo en la metadata (título, url, descripción) con la bibliografía en la que se basa el artículo — no existía ningún campo para esto ni en el schema ni en el form.

Se pidió: usar `fecha` como fecha de publicación real, mostrar las fuentes en el artículo público cuando existan, permitir cargarlas a mano en el form admin (para artículos no importados), y guardar la metadata cruda del `.md` en un campo JSON de la tabla `articles` como referencia.

## Decisiones de schema

`backend/prisma/schema.prisma`, modelo `Article`, dos campos `Json?` nuevos (migración `20260812135559_add_article_sources_metadata`):

- `sources Json?` — array `{ title, url, description? }[]`. Es el dato _estructurado_ que se renderiza en el artículo público y se edita a mano en el form. Vive aparte de `importMetadata` porque es el único subconjunto de la metadata importada que además es un dato de producto (no solo un registro de auditoría).
- `importMetadata Json?` — el resto de la metadata del `.md` tal cual (fecha, estado, temas, audiencia, palabras_clave, descripción, auditoría_externa, verificación_factual, y cualquier clave nueva que aparezca) sin transformar. Es de solo referencia — no se usa para renderizar nada ni se edita en el form; viaja de ida y vuelta al editar para no perderla.

No se agregó un campo de schema para `fecha` — se sigue usando `Article.publishedAt`, que ya existía. Lo que cambió es _cómo_ se setea (ver más abajo), no el campo.

## Backend (`backend/src/articles/`)

- `dto/create-article.dto.ts`: nueva clase `ArticleSourceDto` (`title`, `url` con `@IsUrl`, `description?`) y tres campos opcionales en `CreateArticleDto` (heredados por `UpdateArticleDto` vía `PartialType`):
  - `publishedAt?: string` (`@IsDateString`) — si viene, manda sobre la fecha automática.
  - `sources?: ArticleSourceDto[]` (`@ValidateNested` + `@Type`) — filas con título/url vacíos se descartan en el frontend antes de mandar, no en el DTO.
  - `importMetadata?: Record<string, unknown>` (`@IsObject`) — sin validación de forma, es un dump libre.
- `articles.service.ts`, `create`/`update`: `publishedAt` explícito del dto tiene prioridad sobre la lógica anterior (`now()` al publicar por primera vez); si no viene, el comportamiento previo queda igual (incluida la regla de no tocar `publishedAt` al archivar/despublicar). `sources`/`importMetadata` se persisten tal cual, con `Prisma.JsonNull` cuando se limpian explícitamente.
- `articles.mapper.ts`: `toPublicArticleFull` agrega `sources` (siempre array, `[]` si no hay) — mismo nivel que `content`, no está en el summary. `toAdminArticle` suma `publishedAt` (crudo, `null` si nunca se publicó — distinto de `date`, que ya cae a `createdAt`) e `importMetadata`.

## Frontend

- `types/index.ts`: `ArticleSource { title, url, description? }`, `ArticleFull.sources: ArticleSource[]`.
- `types/admin.ts`: `AdminArticle` suma `sources`, `importMetadata`, `publishedAt`. `ArticleFormPayload` suma `publishedAt?`, `sources?`, `importMetadata?`.
- `utils/articleMarkdownImport.ts`: el parser de metadata dejó de ser un switch plano de claves conocidas — ahora entiende indentación (clave de nivel 0, lista simple `  - item`, y lista de objetos `  - titulo: "..."` seguido de `    url: "..."` / `    descripcion: "..."` sangrados un nivel más, sin guion) para poder leer `fuentes`. `fecha` mapea a `data.publishedAt` tal cual (string `YYYY-MM-DD`, el input `type="date"` del form lo entiende directo). Todo lo demás (`estado`, `auditoria_externa`, `verificacion_factual`, más lo ya mapeado) se vuelca en `data.importMetadata`.
- `views/admin/AdminArticleFormView.vue`: campo "Fecha de publicación" (`type="date"`, bindeado a `form.publishedAt`) en la sidebar; sección "Fuentes" en el cuerpo principal con filas editables (título, url, descripción) y botón "+ Agregar fuente" — funciona igual al crear a mano que al llegar de un import. Al guardar se descartan filas con título o url vacíos. `importMetadata` no se muestra en el form, solo se carga/reenvía para no perderla en una edición.
- `views/ArticleView.vue`: sección "Fuentes" (lista numerada, solo si `article.sources.length`) entre el contenido y el pie del artículo — mismo patrón visual que el resto de la página (heading `eyebrow`, separador superior).

## Plan de verificación

1. `pnpm --filter @nexoat/frontend test` (parser: fecha → `publishedAt`, `fuentes` → `sources`, dump en `importMetadata`) y `pnpm --filter @nexoat/backend test` (service: `publishedAt` explícito, persistencia de `sources`/`importMetadata`) — ambos en verde.
2. `pnpm type-check` y `pnpm lint` limpios.
3. Manual: importar un `.md` con `fuentes` en el form admin → confirmar que aparecen las filas precargadas y que "Fecha de publicación" trae la `fecha` del archivo. Publicar → confirmar en la vista pública que la fecha mostrada es la del `.md`, no la de hoy, y que aparece la sección "Fuentes" con los links.
4. Manual: crear un artículo a mano (sin import) y cargar una fuente con el botón "+ Agregar fuente" → confirmar que se guarda y se ve en el público.
