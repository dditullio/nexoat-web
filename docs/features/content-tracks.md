# Eje temático (`ContentTrack`): filtro suave AT / cuidado de mayores / profesional

**Estado:** implementado y verificado en desarrollo local (seed + migración + backfill corridos, type-check/tests en verde, flujo probado en navegador). **Pendiente de desplegar a producción** — a la espera de confirmación tras más pruebas en local.

## Contexto

El sitio tiene contenido para dos grandes públicos que se solapan pero no son el mismo: quien busca **acompañamiento terapéutico** (AT) y quien busca **cuidado de personas mayores**. Hoy todo se mezcla en un único listado — el visitante interesado solo en uno de los dos ve "ruido" del otro. A esto se suma un tercer grupo, ya confirmado con el alta de 5 categorías nuevas (ver [`new-categories-batch-2.md`](new-categories-batch-2.md)): contenido **laboral/profesional para el AT** (informes, honorarios, organización, recursos de trabajo) — no es sobre la relación con el paciente, es sobre el oficio.

Decisión tomada en la conversación previa:

- **No** un gate/interstitial obligatorio. Un selector persistente y descartable (guardado en `localStorage`) que reordena/atenúa contenido del otro eje sin ocultrarlo — reversible en cualquier momento.
- El backfill de los artículos existentes se deriva de sus categorías (mapeo categoría→eje, confirmado más abajo), con ajuste manual solo de las excepciones.

Esto ya existe como patrón en el código: `Audience` (`cuidadores_familiares` / `profesionales` / `mixto`) es un enum-array en `Article` con exactamente esta forma. `ContentTrack` es una dimensión nueva, **no reemplaza ni se confunde con `Audience`** — `Audience` es _a quién le hablás_ (rol del lector), `ContentTrack` es _de qué mundo temático es_ el artículo.

## Decisiones técnicas

### 1. Nombres

| Track                     | Valor Prisma (enum)          | Valor API/frontend (con guion) | Label UI                      |
| ------------------------- | ---------------------------- | ------------------------------ | ----------------------------- |
| AT                        | `acompanamiento_terapeutico` | `acompanamiento-terapeutico`   | "Acompañamiento terapéutico"  |
| Cuidado de mayores        | `cuidado_de_mayores`         | `cuidado-de-mayores`           | "Cuidado de personas mayores" |
| Recursos profesionales AT | `recursos_profesionales_at`  | `recursos-profesionales-at`    | "Recursos para AT"            |

Mismo patrón de traducción borde-de-módulo que `Audience` (ver `backend/src/articles/audience.util.ts`): un `track.util.ts` nuevo con `TRACK_API_VALUES`, `trackToApi`/`trackFromApi`.

### 2. Schema (Prisma)

```prisma
enum ContentTrack {
  acompanamiento_terapeutico
  cuidado_de_mayores
  recursos_profesionales_at
}

model Article {
  // ...
  tracks ContentTrack[] @default([])
}
```

Array, no enum singular — igual que `audience`, porque hay artículos que legítimamente solapan AT y cuidado de mayores (el propio pedido original lo señala). Las 5 categorías nuevas de recursos profesionales, en cambio, no solapan con las otras dos (son un mundo aparte), así que en la práctica esos artículos tendrán un solo valor.

Requiere migración (`db:migrate`) — a diferencia del batch de categorías, que no tocó schema.

### 3. Mapeo categoría → eje (confirmado)

Usado para (a) sugerir automáticamente los tracks de un artículo nuevo según las categorías elegidas en el form admin (editable, no forzado), y (b) el backfill único de artículos existentes.

| Eje                                             | Categorías                                                                                                                                                                     |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `acompanamiento_terapeutico`                    | `acompanamiento-terapeutico`, `neurodiversidad-y-discapacidad`, `salud-mental`, `autismo-y-tea`, `discapacidad-intelectual-y-psicosocial`                                      |
| `cuidado_de_mayores`                            | `guia-cuidador`, `patologias-en-la-vejez`, `maltrato-y-abuso`, `aspectos-legales-y-derechos`, `herramientas-practicas`                                                         |
| `recursos_profesionales_at`                     | `redaccion-clinica-y-objetivos`, `encuadre-honorarios-y-facturacion`, `organizacion-y-salud-ocupacional`, `recursos-y-materiales-de-trabajo`, `equipo-familias-y-capacitacion` |
| _(sin eje prioritario — no aporta al backfill)_ | `cuidar-al-cuidador`, `familia-y-vinculos`, `sistema-de-salud-y-recursos`, `evidencia-en-foco`, `historias-que-humanizan`                                                      |

Un artículo puede tener varias categorías de ejes distintos — su `tracks` backfill es la unión de los ejes de sus categorías (excluyendo las "sin eje prioritario", que no aportan track por sí solas). Si un artículo termina sin ningún track tras el backfill (todas sus categorías son "sin eje prioritario"), queda `tracks: []` — se trata igual que "ambos", visible siempre, sin desambiguar.

Esta tabla vive **una sola vez**, en `backend/src/articles/track.util.ts` (no se duplica en frontend — a diferencia de `CATEGORY_SEED`, que sí está duplicado porque el frontend lo necesita para el fallback estático, el mapeo de tracks solo lo usa el backend: backfill y auto-sugerencia son operaciones de servidor).

### 4. Backend

- `track.util.ts`: `TRACK_API_VALUES`, `trackToApi`/`trackFromApi` (igual forma que `audience.util.ts`), + `CATEGORY_TRACK_MAP` (la tabla de arriba) + `suggestTracksFromCategories(categorySlugs: string[]): ContentTrack[]`.
- `CreateArticleDto`/`UpdateArticleDto`: campo opcional `tracks?: TrackApiValue[]` (a diferencia de `audience`, que es obligatorio — `tracks` puede quedar vacío y no bloquea el guardado, ya que "sin eje" es un estado válido).
- `articles.service.ts`: si `tracks` no viene en el payload al crear, se autocompleta con `suggestTracksFromCategories(categorySlugs)` (mismo momento en que se resuelven las categorías). Si viene explícito (aunque sea `[]`), se respeta tal cual — así el editor puede vaciar el auto-sugerido a propósito.
- `QueryPublicArticlesDto`: nuevo `track?: TrackApiValue` + filtro `tracks: { has: track }` en el `where` de Prisma (mismo lugar que el filtro de `audience`/`scope` en `articles.service.ts`).
- `articles.mapper.ts`: expone `tracks` en la respuesta pública (igual que `audience`).
- **Script de backfill** (uno solo, no forma parte de `seed.ts` — correrlo dos veces no debe pisar ajustes manuales de un editor): `backend/scripts/backfill-article-tracks.ts`. Recorre artículos con `tracks: { equals: [] }` únicamente (así no vuelve a tocar los ya ajustados a mano) y les asigna `suggestTracksFromCategories()`. Se corre una vez, a mano, después de la migración.

### 5. Frontend

- `types/index.ts`: `export type ContentTrack = 'acompanamiento-terapeutico' | 'cuidado-de-mayores' | 'recursos-profesionales-at'`, `Article.tracks: ContentTrack[]`, `FilterState.track: ContentTrack | null`.
- `utils/theme.ts`: `TRACK_CHIPS` (label + color, mismo patrón que `AUDIENCE_CHIPS`) — colores: reusar `--nx-sage`/`--nx-clay`/tono neutro en vez de inventar tokens nuevos, ya que son 3 valores de alto nivel, no una paleta de 20 categorías.
- `stores/blog.ts`: `filteredArticles` suma `if (filters.value.track && !article.tracks.includes(filters.value.track)) return false`.
- **Store nuevo** `stores/track.ts` (Pinia, mismo patrón que `stores/theme.ts`): `activeTrack: ContentTrack | null`, persistido en `localStorage` bajo `nexoat-track`. Este es el eje "elegido por el visitante", separado del filtro explícito de `blog.ts` — lo consume:
  - **`TrackSwitch.vue`** (componente nuevo): segmented control de 3 opciones + "Ver todo", ubicado en el hero de `HomeView` cerca de "Explorá por tema". Al cambiar, escribe `useTrackStore().activeTrack`.
  - **`HomeView.vue`**: cuando `activeTrack` no es null, reordena "Lo último"/"Destacado" y la grilla de categorías priorizando las que matchean ese eje (categorías sin ningún artículo de ese eje bajan al final, no desaparecen).
  - **`FilterBar.vue`**: nuevo grupo de chips "Eje" que opera sobre `store.filters.track` (filtro duro, como los demás grupos) — al montar el componente, si `useTrackStore().activeTrack` no es null y `filters.track` todavía no fue tocado explícitamente en esa sesión de navegación, se prefiltra con ese valor (así el "quién sos" del Home se refleja en listados/categoría sin que el usuario tenga que volver a elegir) — pero un click en "Todos" dentro del `FilterBar` lo anula para esa vista sin tocar la preferencia global.
- `views/admin/AdminArticleFormView.vue`: checkboxes de `tracks` (mismo patrón que `AUDIENCE_OPTIONS`/`toggleAudience`), con un botón "Sugerir según categorías" que llama a la misma lógica de `suggestTracksFromCategories` (duplicada acá en frontend solo para esta sugerencia en UI — no crítica, el backend es la fuente de verdad si el campo llega vacío).

### 6. Fuera de alcance de este documento

- URL compartible (`?eje=...`) — útil para SEO/landings a futuro, no bloquea la v1 del filtro suave.
- Landings dedicadas por eje (`/acompanamiento-terapeutico`, `/cuidado-de-mayores`) — se evaluó y se descartó por ahora a favor del filtro suave (ver conversación previa).
- Igualar automáticamente `tracks` cuando se editan las categorías de un artículo ya publicado — el auto-sugerido solo aplica al crear o cuando `tracks` no viene en el payload; editar categorías después no re-sugiere solo.

## Plan de verificación

1. `pnpm --filter @nexoat/backend db:migrate` corre sin error, agrega la columna `tracks` (default `{}`) sin romper artículos existentes.
2. `backfill-article-tracks.ts` corrido contra la DB de desarrollo: artículos con categorías mapeadas quedan con `tracks` no vacío; los que solo tienen categorías "sin eje prioritario" quedan en `[]`; correrlo una segunda vez no cambia nada (idempotente, solo toca `tracks: []`).
3. `pnpm type-check` y `pnpm test` en verde con los tipos/DTOs nuevos.
4. Form admin: crear un artículo eligiendo categorías de `recursos-y-materiales-de-trabajo` sin tocar `tracks` a mano → al guardar, `tracks` queda `['recursos-profesionales-at']`.
5. `GET /articles?track=cuidado-de-mayores` devuelve solo artículos con ese track.
6. `TrackSwitch` en Home: elegir "Cuidado de personas mayores", recargar la página → la preferencia persiste (localStorage) y la grilla de categorías prioriza `patologias-en-la-vejez`/`guia-cuidador`/etc. por sobre `autismo-y-tea`/`salud-mental`. Click en "Ver todo" vuelve a mostrar todo sin prioridad.
7. `FilterBar` en `/categoria/:slug` o `/buscar`: el chip de "Eje" refleja la preferencia global al entrar, pero se puede cambiar/limpiar sin alterar esa preferencia.
