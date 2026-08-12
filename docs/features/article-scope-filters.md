# Alcance de artículos: clasificación y filtros (fase 1 de paywall)

**Estado:** fase 1 (clasificación + filtros) implementada y verificada. El recorte real de contenido y el sistema de suscripciones quedan para una etapa futura — ver "Fuera de alcance" más abajo.

## Contexto

Se agrega a la metadata del `.md` un campo nuevo, `alcance`, con cuatro valores posibles: `publico`, `suscriptores_nivel_1` (cuenta gratuita registrada), `suscriptores_nivel_2` y `suscriptores_nivel_3` (suscripciones pagas, de menor a mayor costo). La idea de producto a futuro: todos los artículos se listan siempre, pero quien no tenga el nivel de acceso requerido solo ve unos pocos párrafos + una invitación a suscribirse.

Antes de implementar nada se revisó el estado real del sistema de auth (`docs/features/auth-and-admin-dashboard.md`) y se encontró una brecha importante: **hoy no existe ninguna pantalla pública de registro/login para lectores** — el único login es `/nexoat-admin/login`, reservado a staff. El backend de auth (`register`/`login`/OAuth) sí crea cuentas `Role.USER`, pero nadie externo puede llegar a usarlo todavía. Además `Role` (SUPER_ADMIN/ADMIN/EDITOR/USER) es sobre permisos de administración, no sobre nivel de suscripción de un lector — son conceptos distintos que no hay que confundir. Y el endpoint público de artículos no lee el JWT de quien pregunta, así que cualquier recorte de contenido tendría que reforzarse en el backend (si no, el texto completo viaja igual en la respuesta HTTP aunque el frontend lo oculte).

Dado esto, se acordó con el usuario dividir el trabajo en fases y arrancar por la más chica:

- **Fase 1 (esta):** clasificación editorial + filtros. Ningún visitante ve el contenido recortado todavía — es orden interno y un filtro más en las listas públicas, igual que "Nivel" o "Para quién".
- **Fase 2 (futura, no implementada — plan en [`reader-accounts-and-paywall.md`](reader-accounts-and-paywall.md)):** pantalla pública de registro/login + recorte real de contenido en el backend para quien no tenga el nivel de acceso. Decisión tomada: el punto de corte del texto se define con un **marcador manual en el markdown, `<!--corte-->`** (comentario HTML, en su propia línea — invisible en cualquier render, no choca con la limpieza de `---` sueltos que ya hace el parser de import, y es la misma convención que `<!--more-->` de WordPress). Si un artículo restringido no lo tiene, fallback automático a los primeros 2-3 párrafos — se prefirió el marcador manual sobre el corte 100% automático para no cortar a mitad de una idea en textos sensibles.
- **Fuera de alcance de fase 1 y 2:** cobro real (Stripe/Mercado Pago/etc.) — `suscriptores_nivel_2`/`nivel_3` quedan clasificados y filtrables desde ya, pero no hay forma de que un usuario _tenga_ esos niveles hasta que se construya el sistema de pagos.

## Decisiones de schema

`backend/prisma/schema.prisma`:

```prisma
enum ArticleScope {
  publico
  suscriptores_nivel_1
  suscriptores_nivel_2
  suscriptores_nivel_3
}
```

`Article.scope ArticleScope @default(publico)` — migración `20260812210258_add_article_scope`. Nombre del campo en inglés (`scope`), valores en español, mismo patrón que `Level`/`Audience`/`ArticleStatus` ya existentes. No se tocó `Role` ni `User` — la clasificación de acceso vive únicamente en `Article` por ahora; el campo que asociará a cada `User` su nivel de suscripción real es trabajo de la fase 2.

## Backend (`backend/src/articles/`)

- `dto/create-article.dto.ts`: `scope?: ArticleScope` opcional (default `publico` vía el schema si se omite).
- `dto/query-public-articles.dto.ts` y `dto/query-admin-articles.dto.ts`: `scope?: ArticleScope` — filtra el _listado_, no restringe qué devuelve el detalle (`GET /articles/:slug` sigue devolviendo el contenido completo a cualquiera, fase 1 no lo toca).
- `articles.service.ts`: `scope` se suma al `where` de `findPublished`/`findAllAdmin`, y se persiste en `create`/`update` igual que el resto de los campos del formulario.
- `articles.mapper.ts`: `scope` se agrega a `toPublicArticleSummary` (no solo al full) — así el listado público y las tarjetas pueden mostrar el badge sin pedir el detalle de cada artículo.

## Frontend

- `types/index.ts`: `ArticleScope`, `Article.scope`, `FilterState.scope`.
- `types/admin.ts`: `AdminArticle.scope`, `ArticleFormPayload.scope?`.
- `utils/theme.ts`: `SCOPE_CHIPS` — solo tiene entradas para los tres niveles restringidos (`publico` no genera chip, un artículo sin restricción no necesita anunciarlo). Los tres reusan el mismo par de color (`--color-ochre-soft` / `--color-ink-secondary`, el mismo que ya usa el disclaimer editorial de `ArticleView.vue`) en vez de inventar un color por nivel — hoy es solo clasificación, no hay jerarquía visual que comunicar todavía.
- `components/ui/AppChip.vue`: variante `scope-restricted` nueva.
- `components/blog/ArticleCard.vue`: pill de alcance en la tarjeta, solo si `scope !== 'publico'`.
- `components/blog/FilterBar.vue` + `stores/blog.ts`: grupo de filtro "Alcance" (Todos/Público/Registrados/Nivel 2/Nivel 3), mismo patrón que "Nivel" — se comparte entre `CategoryView` y `SearchView` porque ambas ya usaban `FilterBar`+`store.filteredArticles`.
- `views/ArticleView.vue`: chip de alcance en la cabecera del artículo (mismo lugar que nivel/audiencia), solo si no es público.
- `utils/articleMarkdownImport.ts`: el parser mapea `alcance` → `data.scope`, valida contra los 4 valores conocidos (avisa y no pisa el formulario si no matchea, mismo patrón que `nivel`), y lo suma también a `importMetadata`.
- `views/admin/AdminArticleFormView.vue`: select "Alcance" en la sidebar, con nota aclarando que todavía no recorta contenido.
- `views/admin/AdminArticlesView.vue` + `services/admin/articles.api.ts`: filtro "Alcance" en el listado admin y columna con el pill (o "Público" en texto plano si no está restringido).

## Plan de verificación

1. `pnpm --filter @nexoat/backend test` (persistencia de `scope` en create) y `pnpm --filter @nexoat/frontend test` (parser: `alcance` → `data.scope`, valor no reconocido) — ambos en verde.
2. `pnpm type-check` y `pnpm lint` limpios.
3. Manual (verificado en esta sesión): en `/categoria/:slug`, aplicar el filtro "Registrados" sobre una categoría cuyo único artículo es `publico` → la lista pasa a "0 artículos" / estado vacío; volver a "Público" → el artículo reaparece. Confirma que el filtro llega end-to-end (store → `FilterBar` → `filteredArticles`).
4. Pendiente de probar a mano (requiere sesión admin): importar un `.md` con `alcance: suscriptores_nivel_1` → confirmar que el select "Alcance" del form queda en ese valor; publicar → confirmar que la tarjeta y la cabecera del artículo muestran el chip "Registrados".
