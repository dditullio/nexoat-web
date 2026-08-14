# Categorías nuevas: batch de 5 (15 → 20)

**Estado:** implementado (solo alta de categoría — los 50 artículos que las motivaron todavía no están escritos).

## Contexto

El usuario compartió una lista de 50 artículos por venir, organizados en 5 grupos temáticos propios, todos dirigidos al acompañante terapéutico en su faceta **laboral/profesional** (redacción de informes, honorarios, organización del tiempo, recursos de trabajo, coordinación interdisciplinaria) — no a la relación con el paciente ni al cuidado familiar, que es lo que cubren las 15 categorías existentes.

Se revisaron las 15 categorías del set y ninguna encaja: la más cercana en apariencia, `herramientas-practicas` ("Guías paso a paso, checklists y organizadores de cuidado"), está pensada para el cuidador familiar, no para el trabajo técnico del AT.

Este batch también valida en concreto el tercer eje temático mencionado en la conversación sobre diferenciación AT / cuidado de mayores (ver más abajo, "Relación con el eje temático") — pero **ese diseño (ContentTrack) queda para una sesión aparte**, este documento cubre solo el alta de categorías.

## Categorías agregadas

| Slug                                | Nombre                             | Ícono | Cubre                                                                                           |
| ----------------------------------- | ---------------------------------- | ----- | ----------------------------------------------------------------------------------------------- |
| `redaccion-clinica-y-objetivos`     | Redacción Clínica y Objetivos      | RCO   | Informes técnicos, formulación de objetivos medibles y registro de campo                        |
| `encuadre-honorarios-y-facturacion` | Encuadre, Honorarios y Facturación | EHF   | Límites con la familia, tarifas, contratos y aspectos administrativos del ejercicio profesional |
| `organizacion-y-salud-ocupacional`  | Organización y Salud Ocupacional   | OSO   | Gestión del tiempo, burnout y autocuidado propio del acompañante terapéutico                    |
| `recursos-y-materiales-de-trabajo`  | Recursos y Materiales de Trabajo   | RMT   | Kit de herramientas, adaptación de espacios y materiales didácticos para la jornada             |
| `equipo-familias-y-capacitacion`    | Equipo, Familias y Capacitación    | EFC   | Trabajo interdisciplinario, comunicación con familias/escuela y formación continua              |

Nota sobre `organizacion-y-salud-ocupacional`: se diferencia a propósito de `cuidar-al-cuidador` (burnout y autocuidado del **cuidador familiar**) — esta es la misma temática pero del lado del **profesional**.

Los 50 títulos que motivaron el batch caen 1:1 en estas cinco (10 artículos cada una, según los grupos que ya trajo el usuario). Excepción: el artículo "Estimulación Neurocognitiva en Adultos Mayores... en el Domicilio" también podría taggearse con `patologias-en-la-vejez` al momento de publicarse — es un solape esperado, se resuelve con la relación M2M de categorías, no es un problema del set.

## Colores (`main.css`, `:root` y `.dark`)

Mismo patrón que los batches anteriores (`--cat-XX-bg` / `-ink` / `-grad`, ver skill de diseño): dentro de la familia tierra/vegetal, distinguibles entre sí y de las 15 existentes.

- `--cat-rco-*` (Redacción Clínica y Objetivos): azul índigo apagado — evoca la escritura formal, distinto del gris-azul de `salud-mental` y el violeta de `autismo-y-tea`.
- `--cat-ehf-*` (Encuadre, Honorarios y Facturación): verde bosque oscuro — asociación con lo administrativo, más saturado y oscuro que los verdes más claros de `acompanamiento-terapeutico`/`evidencia-en-foco`.
- `--cat-oso-*` (Organización y Salud Ocupacional): gris pizarra frío — distinto del taupe cálido de `aspectos-legales-y-derechos` y del azul-gris de `salud-mental`.
- `--cat-rmt-*` (Recursos y Materiales de Trabajo): cobre/bronce metálico — distinto de los marrones más apagados ya usados por `cuidar-al-cuidador`/`familia-y-vinculos`/`herramientas-practicas`/`discapacidad-intelectual-y-psicosocial`.
- `--cat-efc-*` (Equipo, Familias y Capacitación): ciruela apagado — distinto del vino de `maltrato-y-abuso` y del rosado de `historias-que-humanizan`.

## Archivos tocados

| Archivo                               | Cambio                                                                                                               |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `backend/prisma/seed.ts`              | 5 entradas nuevas en `CATEGORIES` (upsert, no requiere migración).                                                   |
| `frontend/src/types/index.ts`         | `CategorySlug` suma los 5 slugs nuevos.                                                                              |
| `frontend/src/utils/theme.ts`         | `CATEGORY_THEMES` suma las 5 entradas.                                                                               |
| `frontend/src/assets/styles/main.css` | Tokens `--cat-rco-*` / `--cat-ehf-*` / `--cat-oso-*` / `--cat-rmt-*` / `--cat-efc-*` en `:root` y `.dark`.           |
| `frontend/src/stores/blog.ts`         | `CATEGORY_SEED` suma las 5 (mismo texto que `seed.ts`).                                                              |
| `frontend/src/views/HomeView.vue`     | "Quince formas de entrar" → "Veinte formas de entrar".                                                               |
| Comentarios "15 categorías"           | Actualizados a 20 en `admin-categories.controller.ts`, `types/admin.ts`, `AdminCategoriesView.vue`, `theme.test.ts`. |

## Relación con el eje temático (ContentTrack) — fuera de alcance de este batch

En la conversación previa se discutió agregar una dimensión "eje temático" (`ContentTrack`: acompañamiento terapéutico / cuidado de mayores / recursos profesionales AT) para filtrar el sitio en dos grandes públicos sin ocultar contenido — decisión tomada: filtro suave persistente en localStorage, backfill derivado de categoría con ajuste manual de excepciones. Estas 5 categorías nuevas serían, casi con seguridad, 100% `recursos_profesionales_at` — pero el diseño e implementación de `ContentTrack` en sí (schema, mapeo completo de las 20 categorías, UI del selector) se documenta e implementa en un paso aparte.

## Fuera de alcance

- Escribir/publicar los 50 artículos que motivaron el batch.
- Reclasificar artículos existentes — no aplica, estas categorías no tenían contenido previo asignable.
- El diseño del `ContentTrack` (ver sección anterior).

## Plan de verificación

1. `pnpm --filter @nexoat/backend db:seed` corre sin error y deja 20 categorías en la tabla. ✅ corrido contra la DB de desarrollo.
2. `pnpm type-check` en verde con `CategorySlug` ampliado. ✅
3. `theme.test.ts` (cuenta de 20 categorías) en verde. ✅
4. Home muestra "Veinte formas de entrar" con las 20 tarjetas, las 5 nuevas en 0 artículos (esperado, sin contenido todavía) y con su propio color/sigla. ✅ verificado vía `read_page`/`get_page_text` en el preview local.
5. El nav (`AppHeader`) lista las 5 categorías nuevas correctamente enlazadas a `/categoria/:slug`. ✅ verificado vía `read_page`.
