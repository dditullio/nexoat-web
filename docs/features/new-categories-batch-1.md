# Categorías nuevas: batch de 5 (10 → 15)

**Estado:** implementado (solo alta de categoría — reclasificación de artículos existentes queda para un paso aparte).

## Contexto

Había artículos que no encajaban en ninguna de las 10 categorías originales (ver análisis previo: 9 artículos de maltrato/abuso, 8 de aspectos legales/derechos, 2 de relatos testimoniales). Se decidió agregar 3 categorías al set fijo para cubrir eso, en vez de forzar esos artículos en categorías que no les correspondían.

Sobre la marcha se sumaron 2 más, pensadas a futuro (no atadas a artículos puntuales ya escritos): el análisis apuntó a que "Neurodiversidad y Discapacidad" es una bolsa demasiado amplia (TDAH + TEA + discapacidad intelectual todo junto) para el volumen de contenido que suele generar un blog de AT, así que se separó autismo como eje propio y se agregó discapacidad intelectual/psicosocial con foco en capacidad jurídica e inclusión (distinto del eje clínico de "Salud Mental" y del trámite/normativa de "Aspectos Legales y Derechos").

Esto rompe la premisa "las 10 categorías son un set fijo" que estaba documentada en varios lugares (`admin-categories.controller.ts`, `types/admin.ts`, `AdminCategoriesView.vue`, `category-cover-images.md`) — se actualizó el número en esos comentarios, pero la premisa de fondo ("no hay alta/baja desde el admin, se agregan a mano en `seed.ts`") **sigue vigente**: esto no agrega una pantalla de alta de categorías, solo suma 5 filas más al set sembrado.

## Categorías agregadas

| Slug                                     | Nombre                                 | Ícono | Cubre                                                                                                   |
| ---------------------------------------- | -------------------------------------- | ----- | ------------------------------------------------------------------------------------------------------- |
| `maltrato-y-abuso`                       | Maltrato y Abuso                       | MA    | Detección, denuncia y abuso económico — eje propio, no clínico ni relacional (del análisis previo)      |
| `aspectos-legales-y-derechos`            | Aspectos Legales y Derechos            | AL    | Curatela, patrimonio, denuncias — no es "Herramientas Prácticas" (del análisis previo)                  |
| `historias-que-humanizan`                | Historias que Humanizan                | HH    | Relatos testimoniales/narrativa personal — no es guía práctica (del análisis previo)                    |
| `autismo-y-tea`                          | Autismo y TEA                          | TEA   | Abordaje/diagnóstico específico del espectro autista — separado de la bolsa genérica de neurodiversidad |
| `discapacidad-intelectual-y-psicosocial` | Discapacidad Intelectual y Psicosocial | DI    | Capacidad jurídica, apoyos e inclusión — distinto del eje clínico de Salud Mental                       |

El slug de "Maltrato y Abuso" se confirmó como `maltrato-y-abuso` (no `maltrato-invisible`, que era el slug de trabajo del análisis previo) — consistente con el resto del set, que deriva el slug del nombre a mostrar.

## Colores (`main.css`, `:root` y `.dark`)

Mismo patrón que las 10 existentes (`--cat-XX-bg` / `-ink` / `-grad`, ver skill de diseño): dentro de la familia tierra/vegetal, distinguibles entre sí y de las 10 originales.

- `--cat-ma-*` (Maltrato y Abuso): vino/oxblood apagado — serio sin ser alarmante, distinto de la terracota de `cuidar-al-cuidador` y del mauve de `neurodiversidad-y-discapacidad`.
- `--cat-al-*` (Aspectos Legales y Derechos): gris piedra/taupe — registra como "institucional/documental" sin salirse de la paleta, distinto de los azules-grisáceos ya usados por `salud-mental` y `sistema-de-salud-y-recursos`.
- `--cat-hh-*` (Historias que Humanizan): rosa polvoriento cálido — tono narrativo/personal, distinto del mauve de `neurodiversidad-y-discapacidad` y del ocre-naranja de `familia-y-vinculos`.
- `--cat-tea-*` (Autismo y TEA): lavanda-índigo apagado — única familia "fría/violeta" del set de categorías, distinta del mauve-rosado de `neurodiversidad-y-discapacidad`.
- `--cat-di-*` (Discapacidad Intelectual y Psicosocial): siena/marrón cálido — distinto de la terracota de `cuidar-al-cuidador` y del taupe de `aspectos-legales-y-derechos`.

## Archivos tocados

| Archivo                               | Cambio                                                                                                                                           |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `backend/prisma/seed.ts`              | 5 entradas nuevas en `CATEGORIES` (upsert, no requiere migración — `Category.slug` es `String` libre, no un enum).                               |
| `frontend/src/types/index.ts`         | `CategorySlug` suma los 5 slugs nuevos.                                                                                                          |
| `frontend/src/utils/theme.ts`         | `CATEGORY_THEMES` suma las 5 entradas.                                                                                                           |
| `frontend/src/assets/styles/main.css` | Tokens `--cat-ma-*` / `--cat-al-*` / `--cat-hh-*` / `--cat-tea-*` / `--cat-di-*` en `:root` y `.dark`.                                           |
| `frontend/src/stores/blog.ts`         | `CATEGORY_SEED` suma las 5 (mismo texto que `seed.ts`, ver comentario ya existente ahí).                                                         |
| `frontend/src/views/HomeView.vue`     | "Diez formas de entrar" → "Quince formas de entrar".                                                                                             |
| Comentarios "10 categorías"           | Actualizados a 15 en `admin-categories.controller.ts`, `types/admin.ts`, `AdminCategoriesView.vue`, `category-cover-images.md`, `theme.test.ts`. |

## Fuera de alcance

- Reclasificar los artículos existentes que motivaron el pedido — se hace en un paso aparte, artículo por artículo, cuando se confirme cuál va en cuál.
- Pantalla de alta/baja de categorías en el admin — sigue sin existir, esto fue un alta manual vía `seed.ts` como las 10 originales.

## Plan de verificación

1. `pnpm --filter @nexoat/backend db:seed` corre sin error y deja 15 categorías en la tabla (`upsert`, no duplica las 10 existentes). ✅ corrido contra la DB de desarrollo.
2. `pnpm type-check` / `pnpm test` en verde con `CategorySlug` ampliado. ✅
3. Home y `CategoryView` muestran las 5 tarjetas nuevas con su propio color, sin pisar las 10 existentes. ✅ verificado con colores computados por navegador (`getComputedStyle` sobre el glifo de cada tarjeta nueva) — los 5 tonos son distintos entre sí.
4. Filtro por categoría (`/categoria/:slug`) funciona para los 5 slugs nuevos igual que para los originales — no hay lógica especial por categoría, todo es data-driven.
