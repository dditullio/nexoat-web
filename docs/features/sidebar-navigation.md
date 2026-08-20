# Navegación agrupada por Eje + sidebar de facetas

**Estado:** implementado en esta misma sesión.

## Contexto

Con 170+ artículos publicados, el blog dejó de sentirse navegable: el mega-menú "Temas" del header era una lista plana de 20 categorías sin ninguna pista de "por dónde empezar según quién sos", y `/buscar` + `/categoria/:slug` usaban `FilterBar.vue`, una barra horizontal de píldoras (Eje/Para quién/Nivel/Alcance) que no comunicaba cuántos artículos había detrás de cada opción.

Se evaluó un sidebar lateral fijo aprovechando el margen de la pantalla (propuesta original del usuario) y se descartó: el `.container` tiene 1240px de ancho máximo, así que en laptops de 1366–1440px casi no queda margen real para un sidebar — solo se vería en monitores ultra-anchos, y aplicado a todas las páginas (incluida `ArticleView.vue`, que ya tiene su propio layout de 2 columnas con sidebar de fuentes) rompería la regla del sistema de diseño de que la lectura de un artículo debe sentirse "una habitación bien iluminada, no un consultorio". Confirmado con el usuario: en vez de eso, dos cambios acotados.

## Decisión 1: mega-menú del header agrupado por Eje

`AppHeader.vue` ya tenía el mega-menú "Temas" (desktop) y la sección "Temas" del drawer (mobile) — se extendieron esos mismos componentes en vez de crear navegación paralela, tal como pide el sistema de diseño.

El agrupamiento (`trackGroups`, computado en `AppHeader.vue`) usa `CATEGORY_TRACK_MAP` de `frontend/src/utils/theme.ts` — un espejo frontend-only del mapeo ya confirmado en `content-tracks.md`.

**Corrección sobre el diseño original de esta sesión:** la primera versión derivaba el eje de cada categoría a partir de los `tracks` reales de los artículos ya cargados (mismo patrón que `sortedCategories` de `HomeView.vue`), para no duplicar el mapeo del backend. En la práctica esto rompió el menú de dos formas, reportadas por el usuario contra datos reales de producción:

1. **Agrupó mal:** los `tracks` por artículo se solapan mucho entre categorías (casi cualquier categoría tiene al menos un artículo con `acompanamiento-terapeutico`), y como el código tomaba "el primer eje con el que matchee algún artículo" en orden `[AT, Cuidado, Recursos]`, casi todo terminaba cayendo en la columna de AT — incluidas categorías claramente de "Cuidado de mayores" como "Guía del Cuidador" o "Cuidar al Cuidador".
2. **Desbordó la pantalla sin scroll:** una sola columna con 14+ categorías no entraba en el viewport y `.mega` no tenía `overflow`/`max-height`.

El fix cambió de estrategia: en vez de derivar en vivo, se usa el mapeo curado (`CATEGORY_TRACK_MAP` duplicado en `theme.ts`, mismo criterio que `CATEGORY_SEED`) — es una decisión **editorial estable** para armar un menú de navegación, no debería variar según qué artículos puntuales estén tageados de tal o cual forma. El filtrado real de artículos (`FilterSidebar.vue`, `/buscar`) sigue usando `article.tracks` tal cual, sin cambios — ahí sí importa reflejar el dato real.

**Segunda ronda de correcciones (CSS, reportadas contra el layout real ya con 4 columnas):**

1. **Scrollbar horizontal fea por columna:** `.mega__col` declaraba `overflow-y: auto` sin `overflow-x` — la spec de CSS fuerza el eje no declarado al mismo valor no-`visible` que el declarado, así que cada columna terminaba con `overflow-x: auto` implícito. Fix: declarar `overflow-x: hidden` explícito junto a `overflow-y: auto`.
2. **`flex-wrap: wrap` colapsó el menú a una columna por fila** (probado y descartado): en un contenedor `position: absolute` de ancho automático, `flex-wrap: wrap` hace que el navegador calcule el ancho por "fit-content" tomando el ítem más angosto en vez de intentar que entren todos — el menú entero terminó midiendo 200px en vez de ~750px. Se sacó `flex-wrap` del todo: la matemática (4×180px + separadores ≈ 800px) ya entra sobrada bajo los ~836px disponibles en el viewport más angosto donde este menú es alcanzable (900px, por debajo pasa al drawer), así que ni wrap ni scroll horizontal hacen falta.
3. **Nombres largos de categoría desbordaban su columna** ("Acompañamiento Terapéutico", "Neurodiversidad y Discapacidad"): `.mega__name` es un flex item con `flex: 1` pero sin `min-width: 0` — por default un flex item no se encoge por debajo del ancho de su contenido en una sola línea, así que el texto no hacía wrap y se salía. Fix: `min-width: 0` en `.mega__name`.
4. **El menú se salía por la derecha en ventanas de ~900-1100px:** `.mega` posicionaba `left: 0` relativo a `.hdr__drop` (el wrapper del botón "Temas"), que no está pegado al borde izquierdo del header — a esos anchos el menú (752px) se salía por la derecha de la ventana. Fix: el ancla de posicionamiento pasó de `.hdr__drop` a `.hdr__inner` (`position: relative` movido ahí), y `.mega` usa `left: 32px` (el `padding-inline` de `.container`) en vez de `left: 0` — así el borde izquierdo del menú siempre alinea con el logo, sin importar dónde caiga `.hdr__drop` dentro del header.

Verificado en vivo contra el servidor real: a 901px (el viewport más angosto donde el menú es alcanzable) el menú alinea exacto con el logo (`left` del menú == `left` del logo, ambos 32px) y no desborda la ventana (`right: 784` < `901`), y ninguna columna recorta contenido (`scrollWidth` ≈ `width` en los 5 ítems de la columna más ancha).

**Tercera corrección (scroll del sidebar de facetas, reportada por el usuario contra el uso real):** ver "Corrección: scroll propio del sidebar" en la sección de `FilterSidebar.vue` más abajo.

## Decisión 2: `FilterBar.vue` → `FilterSidebar.vue`

`FilterBar.vue` (píldoras horizontales) se reemplazó por `FilterSidebar.vue`, un panel vertical usado en `/buscar` y `/categoria/:slug` (layout de grilla 2 columnas, sidebar `sticky`, colapsa a un acordeón con botón "Filtros" en mobile ≤900px). No se usa en `HomeView.vue` ni `ArticleView.vue`.

### Contadores por faceta (faceted count)

Cada opción muestra cuántos artículos quedarían si se eligiera, calculado contra los **otros** filtros ya activos (no contra sí misma) — así "Profesionales: 15" en el grupo "Para quién" siempre refleja el total real de esa audiencia dentro del resto de filtros elegidos, en vez de congelarse en el momento en que se activó ese mismo filtro. Implementado en `FilterSidebar.vue` (`matchesFacets` + `countFor`), reutilizando la misma lógica que `filteredArticles` de `stores/blog.ts` pero excluyendo una faceta a la vez.

La base sobre la que se cuenta (`baseList`) es configurable vía prop `articles`: por defecto es el listado completo del store (o `searchResults` si hay texto de búsqueda activo), pero `CategoryView.vue` pasa el subconjunto ya acotado a esa categoría, para que los contadores no incluyan artículos de otras categorías.

### Atajos por persona

Arriba de los 4 grupos de filtros, 3 botones que preseleccionan una combinación sensata en vez de obligar a tocar 2-3 píldoras sueltas:

- **Familias y cuidadores** → `audience: cuidadores-familiares`
- **Profesionales AT** → `audience: profesionales`
- **Recién llego** → `level: basico`

Cada uno limpia las otras facetas que no le corresponden (ej. "Recién llego" no fija audiencia ni eje) para que sea un punto de partida limpio, no una combinación acumulativa confusa. No tocan `query` ni `category`: conviven con lo que el visitante ya haya escrito o con la categoría en la que esté parado.

### Corrección: scroll propio del sidebar

Reportado por el usuario tras usar `/buscar` con la rueda del mouse: el sidebar (`.srch__sidebar`/`.cat-sidebar`, `position: sticky`) es más alto que el viewport en la mayoría de las pantallas (~1240px de contenido contra ~670-700px visibles). Sin `max-height`/`overflow-y` propio, un elemento `sticky` no se auto-scrollea: al llegar a su `top: 96px` queda anclado y solo muestra la porción que entra en pantalla en ese instante — el resto de los grupos de filtros (Nivel, Alcance) quedaba inalcanzable hasta que la columna de resultados (más larga) terminaba de scrollear y el sidebar se desanclaba al llegar al final de su grid track.

Fix: `.srch__sidebar`/`.cat-sidebar` suman `max-height: calc(100vh - 96px - 32px)` + `overflow-y: auto` + `overflow-x: hidden` (explícito, mismo motivo que el bug del mega-menú de arriba) + `overscroll-behavior: contain` (para que al llegar al final del scroll interno del sidebar, la rueda del mouse no siga "arrastrando" el scroll de la página por debajo sin que el usuario lo note). En el breakpoint mobile (`≤900px`, donde el sidebar ya pasa a `position: static` como acordeón colapsable) se resetean `max-height: none`/`overflow-y: visible`, porque ahí no aplica el problema de sticky.

Verificado en vivo: a 1280×800, el sidebar mide 672px visibles (`max-height` calculado) contra 1239px de contenido real, con `overflow-y: auto` activo y `scrollTop` respondiendo — todos los grupos de filtros son alcanzables con scroll propio, sin depender de la longitud de la lista de resultados.

### Corrección: el Eje deja de filtrar y pasa a ordenar

Reportado por el propio usuario (le pasó a él mismo probando el sitio): el Eje elegido en el Home (`TrackSwitch`, persistido en `localStorage` vía `stores/track.ts`) se sincronizaba como filtro duro en `FilterSidebar.vue` al entrar a `/buscar` o `/categoria/:slug` — igual que audiencia/nivel/alcance. Si alguien con "Cuidado de personas mayores" elegido en el Home buscaba un tema que solo existe en el eje de AT, veía "sin resultados" (o una grilla más chica) sin ninguna pista visible de que el Eje elegido meses atrás seguía activo y estaba recortando la búsqueda.

Se evaluó primero solo agregar un aviso visible (`ActiveTrackNotice.vue`, chip arriba de los resultados con el eje activo y un botón para sacarlo) — necesario en cualquier caso para que el estado no sea invisible, pero no resuelve el problema de fondo: seguía ocultando contenido real. La solución completa, decidida por el usuario: **el Eje deja de ser un filtro duro y pasa a ser un criterio de orden** — los artículos del eje elegido aparecen primero, el resto se muestra igual, a continuación, nunca se ocultan. Esto además alinea `filters.track` con el principio ya declarado para `TrackSwitch` en `docs/features/content-tracks.md` ("filtro suave... nunca oculta contenido, solo lo prioriza/atenúa"), que la implementación original de `FilterSidebar.vue` no respetaba.

Implementación (`stores/blog.ts`):

- `sortByTrackPriority(list, track)`: si no hay track activo devuelve la lista tal cual; si hay, hace `[...list].sort(...)` poniendo primero los artículos con `article.tracks.includes(track)` — `Array.prototype.sort` es estable (spec ES2019+), así que dentro de cada grupo el orden original (por fecha) no se altera.
- `filteredArticles` (listado client-side): ya no descarta artículos por track, solo aplica `sortByTrackPriority` al final.
- `runSearch()` (búsqueda server-side): **ya no manda `track` como query param al backend** — mandarlo lo convertiría otra vez en un `where` que descarta resultados del lado del servidor. Se sigue pidiendo con el resto de filtros (audiencia/nivel/alcance/query, esos sí duros) y el reordenamiento por track se aplica en el cliente sobre la respuesta completa.
- El componente `ActiveTrackNotice.vue` se mantiene (ahora dice "Priorizando X — el resto de los temas también aparece, más abajo" en vez de "Mostrando solo X"), porque sigue siendo útil explicar por qué el orden no es estrictamente cronológico.

Verificado en vivo: con "Cuidado de personas mayores" como eje activo, buscar "autismo" (tema casi exclusivo de AT) devuelve **73 resultados** (antes, con filtro duro, devolvía 31 — los mismos 31 que hoy aparecen primero). El artículo #31 de la grilla es el último con track "cuidado-de-mayores" y el #32 ya es de "Acompañamiento Terapéutico" — el corte de prioridad cae exactamente donde debe, sin que se pierda ningún resultado.

## Dónde vive

| Archivo                                                      | Qué hace                                                                                                                                                     |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `frontend/src/components/blog/FilterSidebar.vue` (nuevo)     | Panel vertical: atajos por persona + 4 grupos de facetas con contador, acordeón en mobile. Reemplaza a `FilterBar.vue` (borrado).                            |
| `frontend/src/components/blog/ActiveTrackNotice.vue` (nuevo) | Aviso visible en `/buscar` y `/categoria/:slug` cuando hay un Eje activo (Home o sidebar) — explica que está reordenando resultados, con botón para sacarlo. |
| `frontend/src/components/layout/AppHeader.vue`               | Mega-menú desktop y drawer mobile agrupados por Eje (`trackGroups`).                                                                                         |
| `frontend/src/views/SearchView.vue`                          | Layout de 2 columnas: `FilterSidebar` + resultados.                                                                                                          |
| `frontend/src/views/CategoryView.vue`                        | Layout de 2 columnas: `FilterSidebar` (acotado a la categoría) + grilla.                                                                                     |

No hay cambios de schema ni de endpoints — es 100% frontend, sobre datos que la API ya devolvía.

## Plan de verificación

1. En `/buscar`, tocar solo "Acompañamiento terapéutico" en el grupo Eje → confirmar que el conteo mostrado coincide con `GET /articles?track=acompanamiento-terapeutico` y que la grilla de resultados muestra esa misma cantidad.
2. Tocar el atajo "Profesionales AT" → confirmar que fija `audience=profesionales`, limpia Eje/Nivel, y que los contadores de los otros 3 grupos se recalculan contra ese filtro (faceted, no contra el total sin filtrar).
3. En `/categoria/acompanamiento-terapeutico`, confirmar que los contadores del sidebar están acotados a los artículos de esa categoría (no al total del sitio).
4. Redimensionar a ≤900px: confirmar que el sidebar colapsa a un botón "Filtros" con badge de cantidad activa, y que el mega-menú del header pasa al drawer con las mismas 3 (o 4, si hay categorías "sin eje") secciones agrupadas.
5. Abrir el mega-menú "Temas" en desktop (>900px) y confirmar que las categorías aparecen agrupadas por Eje, no en lista plana.
