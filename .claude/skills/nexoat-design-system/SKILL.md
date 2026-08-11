---
name: nexoat-design-system
description: Sistema de diseño visual de NexoAT — «Humanista cálido». Úsalo siempre que se construya o modifique CUALQUIER interfaz del frontend de NexoAT (nuevas vistas, componentes, formularios, tarjetas, estados vacíos, dashboards) para que el resultado sea visualmente consistente con el blog ya existente. Cubre paleta de color (claro/oscuro), tipografía (Fraunces + Karla), el motivo del "arco", espaciado, sombras, movimiento y las clases utilitarias reutilizables ya definidas en main.css.
---

# Sistema de diseño NexoAT — «Humanista cálido»

Este skill documenta el sistema de diseño **ya implementado** en `frontend/src/assets/styles/main.css` y en los componentes del blog. No es una propuesta: es el contrato visual vigente. Toda funcionalidad nueva (bolsa de trabajo, directorio de acompañantes, cuentas de usuario, dashboards internos, etc.) debe construirse **sobre estos mismos tokens y patrones**, no reinventarlos.

Fuente de verdad: [`frontend/src/assets/styles/main.css`](../../frontend/src/assets/styles/main.css). Si algo de este documento y el CSS no coinciden, gana el CSS — releelo antes de asumir un valor.

## Principio rector

> Quien llega a NexoAT suele estar cuidando a alguien que quiere, muchas veces agotado y con miedo. La interfaz debe sentirse como una habitación bien iluminada, no como un consultorio.

Esto se traduce en reglas concretas, no en vibra abstracta:

1. **Papel, no pantalla** — fondo base color arena con grano sutil. **Nunca blanco puro (`#fff`) ni negro puro (`#000`)**, ni en texto ni en fondo.
2. **Nada tiene esquinas vivas** — el **arco** (una forma que remata en punta redonda arriba y esquina suave abajo) es el motivo estructural que reaparece en portadas de tarjeta, glifos de categoría, el hero y la página 404. Ver sección "El motivo del arco".
3. **El oscuro también es cálido** — modo oscuro = negro **amarronado** («anochecer»), nunca azulado. Si un componente nuevo necesita un color oscuro de fondo, se deriva de `--nx-ink`/`--nx-canvas`, no de un gris/azul neutro genérico.
4. **Tipografía con calidez deliberada** — Fraunces con los ejes variables `SOFT` y `WONK` activados en todos los títulos; nunca Fraunces "plana" (ejes en 0).
5. **Sombras de luz de tarde** — siempre teñidas de tierra (`rgba(61,50,41,…)` en claro), difusas y bajas. Nunca `rgba(0,0,0,…)` puro en modo claro.

Si una pantalla nueva rompe alguna de estas cinco reglas, no es "una variación de estilo": es inconsistente con el sistema.

## Arquitectura de tokens (3 capas)

```
@theme          →  tokens ESTÁTICOS (tipografía, espaciado, radios). Tailwind los
                    registra vía @property — nunca deben depender del tema.
:root           →  primitivas --nx-* del tema claro + tokens semánticos --color-*
                    que apuntan a ellas.
.dark           →  reescribe SOLO las primitivas --nx-*. Los --color-* se
                    actualizan solos por cascada CSS.
```

**Regla de oro al escribir CSS nuevo:** usá siempre los tokens semánticos `--color-*`, nunca `--nx-*` directamente y nunca un hex literal. `--nx-*` es implementación interna; `--color-*` es la API pública que ya cambia sola entre claro/oscuro.

**Por qué el color vive fuera de `@theme`:** Tailwind v4 registra los tokens de `@theme` con `@property`, que exige un `initial-value` concreto y no acepta `var()` — si moviste un color ahí, el tema oscuro se "congela". Si necesitás un token nuevo dinámico, definilo en `:root`/`.dark` como custom property normal, y opcionalmente expolo como utilidad Tailwind agregando también una entrada en `@theme` que apunte a él (así funcionó `--color-primary` etc.).

## Paleta

Tres familias de color, todas dentro del mismo rango tierra/vegetal — **nunca introduzcas un color fuera de esta familia** (nada de azules corporativos, morados, rojos saturados) sin discutirlo primero.

| Rol                      | Token semántico                                  | Claro             | Oscuro                               | Uso                                                  |
| ------------------------ | ------------------------------------------------ | ----------------- | ------------------------------------ | ---------------------------------------------------- |
| Marca / acento principal | `--color-primary` / `-dark` / `-light` / `-soft` | `#7a9471` salvia  | `#9dba92` (más claro para contraste) | CTAs primarios, links activos, foco                  |
| Contrapunto cálido       | `--color-accent` / `-dark` / `-soft`             | `#c07553` arcilla | `#dd9670`                            | CTA secundario (ej. "para familias"), alertas suaves |
| Destaque puntual         | `--color-ochre` / `-soft`                        | `#c99a3f`         | `#dfb968`                            | Badges, disclaimers editoriales, subrayados          |

**Superficies** (`--color-canvas`, `-alt`, `--color-surface`, `-raised`, `-sunken`): nunca blanco puro. En claro van de `#faf6f0` (canvas) a `#fffdfa`/`#ffffff` (surface/raised) a `#f1e9dd` (sunken, para bloques "hundidos" como notas o vacíos). En oscuro van de `#191512` a `#2c271f`.

**Texto** (`--color-ink`, `-secondary`, `-muted`, `-faint`): jerarquía de 4 niveles, nunca gris puro — todos tienen un matiz cálido (`#3d3229` → `#b0a291` en claro).

**Líneas** (`--color-line`, `-light`, `-faint`): bordes sutiles, jamás grises neutros — derivados de la misma familia arena.

**Secciones profundas** (`--color-deep`, `--color-audience-bg`, `--color-footer-bg`): el único lugar donde se usa un fondo oscuro _dentro del tema claro_ (footer, banda de audiencias) — es un verde muy oscuro (`#2f3a2b`/`#151210`), no negro ni azul marino.

**Alias heredados:** `--color-bg`, `--color-text`, `--color-white`, `--color-border` siguen funcionando (apuntan a los tokens de arriba) por compatibilidad con CSS viejo, pero en código nuevo usá siempre los nombres semánticos (`--color-canvas`, `--color-ink`, `--color-surface`, `--color-line`).

### Chips de metadata (nivel / audiencia)

Ya existen tokens listos para estados categóricos — **reusalos como modelo** para cualquier badge nuevo (ej. estado de una publicación de trabajo: abierta/cerrada/borrador):

```
--color-level-basico-bg / -text        (verde salvia)
--color-level-intermedio-bg / -text    (ocre)
--color-level-avanzado-bg / -text      (arcilla)
--color-aud-cuidadores-bg / -text      (arcilla)
--color-aud-profesionales-bg / -text   (azul-verdoso apagado, único "azul" del sistema, muy desaturado)
--color-aud-mixto-bg / -text           (neutro arena)
```

Si una función nueva necesita un set de badges (ej. "Publicado / En revisión / Cerrado" en la bolsa de trabajo), **agregá tokens nuevos con el mismo patrón** (`--color-job-open-bg`/`-text`, etc.) en `:root` y `.dark` de `main.css`, con valores derivados de la misma paleta salvia/arcilla/ocre — no inventes colores nuevos.

### Colores por categoría (patrón para "por tipo de entidad")

Cada una de las 10 categorías del blog tiene su propia mini-paleta de 3 tokens: `--cat-XX-bg` (fondo suave), `--cat-XX-ink` (texto/acento) y `--cat-XX-grad` (gradiente diagonal 145deg para portadas). Todas caen dentro del rango tierra/vegetal pero son distinguibles entre sí.

**Este es el patrón a seguir si una función nueva necesita "un color por tipo"** (ej. rubros de trabajo en la bolsa de empleo, especialidades en el directorio de acompañantes): un trío `bg` / `ink` / `grad` por variante, definido en ambos temas, dentro de la misma familia tonal.

## Tipografía

- **Display / títulos:** `--font-display` = Fraunces. **Siempre** con `font-variation-settings: 'SOFT' 60, 'WONK' 1` (o `'SOFT' 70/90` en títulos hero muy grandes o texto enfático en `<em>`). Esto es lo que redondea las terminales de las letras y le da su calidez — Fraunces sin estos ejes se ve como una serif editorial fría, rompe el sistema.
- **Cuerpo / UI:** `--font-sans` = Karla, para todo lo demás (párrafos, botones, formularios, nav).
- Los `h1`–`h4` ya tienen estas reglas aplicadas globalmente en `main.css`; no las repitas a mano salvo que necesites un tamaño distinto.
- Clases ya listas: `.eyebrow` (etiqueta de sección en versalitas con guioncito), `.section-title` (título de sección clamp responsivo), `.section-lead` (párrafo de apoyo, max 52ch).
- `letter-spacing` negativo (`-0.02em` a `-0.035em`) en títulos grandes; nunca tracking positivo en títulos.

## Espaciado y radios

Escala de espaciado: `--spacing-{xs,sm,md,lg,xl,2xl,3xl,4xl}` = `0.25rem` → `8rem`. Usala en vez de valores arbitrarios cuando el CSS scoped del componente lo permita.

Radios — **generosos siempre**, nunca esquinas de 2-4px tipo "producto SaaS genérico":

```
--radius-sm   8px   (chips pequeños, focus ring)
--radius-md   14px  (inputs, tags)
--radius-lg   20px  (tarjetas de categoría, bloques de nota)
--radius-xl   28px  (tarjetas grandes, sidebar blocks)
--radius-2xl  40px  (secciones destacadas: newsletter, CTA, empty states)
--radius-full 9999px (botones, píldoras, avatares)
```

## El motivo del arco

Es la firma visual más reconocible del sitio: una forma que arranca casi circular arriba y se suaviza a un radio normal abajo, lograda con `border-radius` de 8 valores (horizontal/vertical distintos por esquina). Aparece en:

- Portada de `ArticleCard` (`999px 999px var(--radius-md) var(--radius-md) / 96px 96px var(--radius-md) var(--radius-md)`)
- Glifo de `CategoryCard` (versión pequeña, círculo casi completo)
- El bloque decorativo del hero de Home
- El icono de la página 404
- El ícono del bloque de newsletter

**Patrón para reusar en una tarjeta nueva** (ej. `JobCard`, tarjeta de perfil de acompañante):

```css
.mi-tarjeta__cover {
  border-radius: 999px 999px var(--radius-lg) var(--radius-lg) / 34% 34% var(--radius-lg)
    var(--radius-lg);
  /* Ajustá el % vertical según la altura del bloque: cuanto más alto, menor % */
}
```

No hace falta que **todo** tenga el arco (inputs, botones y chips son simplemente `--radius-full` o `--radius-md`), pero cualquier **bloque de imagen/portada/avatar destacado** de una tarjeta nueva debería usarlo para que se sienta parte de la misma familia visual, en vez de un `border-radius` uniforme genérico.

## Sombras

Todas viven en `--shadow-sm` / `-md` / `-lg` / `-bloom`, y cambian automáticamente de intensidad entre temas (más difusas y coloreadas en claro, más opacas y neutras en oscuro). `--shadow-bloom` es la sombra "florecida" con un halo salvia — se usa en `:hover` de tarjetas destacadas para dar sensación de que el elemento se eleva con luz alrededor, no solo una sombra gris. Usala para el hover de cualquier tarjeta nueva importante en vez de inventar un `box-shadow` ad-hoc.

## Movimiento

- **Curvas:** `--ease-out-soft` (`cubic-bezier(0.22,1,0.36,1)`) para casi todo — entradas, hovers. `--ease-in-out-soft` para transiciones de color/tema.
- **Entrada de página:** clase `.rise` + `animation-delay` escalonado inline (`style="animation-delay: 0.15s"`) para los primeros elementos above-the-fold. Ver el hero de `HomeView.vue` como referencia de cómo escalonar 3-4 elementos.
- **Entrada al hacer scroll:** clase `.reveal`, activada por el composable [`useReveal()`](../../frontend/src/composables/useReveal.ts) — agrupa por contenedor padre y escalona automáticamente. Para una vista nueva con listas/grillas, replicá el patrón: `useReveal()` en `<script setup>` + clase `reveal` en cada card/bloque.
- Respeta siempre `prefers-reduced-motion` — ya está resuelto globalmente en `main.css`, no lo dupliques por componente.
- Fondos con orbes difusos (`filter: blur(70-90px)` + `animation: nx-breathe`) se usan en secciones hero/CTA para dar atmósfera. No abusar: 2-3 orbes por sección como máximo.

## Clases utilitarias ya disponibles (no las reinventes)

| Clase                                                     | Para qué                                                                                                                                         |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `.container`                                              | Ancho máximo `1240px` + padding lateral responsivo                                                                                               |
| `.section`                                                | Padding vertical responsivo estándar entre secciones                                                                                             |
| `.btn` + `.btn--primary` / `.btn--accent` / `.btn--ghost` | Botón redondeado con hover `translateY` — usalo para **todo** botón de acción, incluidos formularios de las funciones nuevas                     |
| `.link-arrow`                                             | Link con flecha SVG que se desplaza en hover ("Ver todo →")                                                                                      |
| `.pill`                                                   | Badge chico redondeado (usalo con los tokens de chip de arriba)                                                                                  |
| `.surface-card`                                           | Base de tarjeta (fondo, borde, radio, transición) — extendela con estilos scoped propios                                                         |
| `.prose`                                                  | Tipografía larga de artículo/contenido — reusala para cualquier bloque de texto largo (ej. descripción de puesto de trabajo, bio de acompañante) |
| `.eyebrow` / `.eyebrow--plain`                            | Etiqueta de sección                                                                                                                              |
| `.grid-3` / `.grid-5` (definidas por vista, no globales)  | Ver `HomeView.vue`/`CategoryView.vue` como referencia de breakpoints ya resueltos                                                                |

`AppChip.vue` (`frontend/src/components/ui/AppChip.vue`) es el componente Vue de referencia para cualquier badge nuevo: recibe `variant` + `size`, cada variante mapea 1:1 a un par de tokens `bg`/`text`. Para un dominio nuevo (ej. estados de una postulación laboral), creá un componente análogo o extendé `AppChip` con nuevas variantes, no un `<span>` con estilos inline.

## Componentes de referencia

Antes de construir una pantalla nueva, mirá el componente equivalente más cercano ya construido:

- **Tarjeta de listado** → [`ArticleCard.vue`](../../frontend/src/components/blog/ArticleCard.vue) (portada con arco + monograma + chips de metadata en el borde inferior)
- **Tarjeta de categoría/tipo** → [`CategoryCard.vue`](../../frontend/src/components/blog/CategoryCard.vue) (glifo redondo + nombre + contador)
- **Filtros de listado** → [`FilterBar.vue`](../../frontend/src/components/blog/FilterBar.vue) (grupo de botones píldora con estado activo = `--color-primary` sólido)
- **Buscador/input de texto** → el `.hero__search`/`.srch__form` de `HomeView.vue`/`SearchView.vue` (input dentro de cápsula redondeada con ícono + botón integrado — este es el patrón para **cualquier input de texto destacado**, no solo búsqueda)
- **Detalle de un ítem** → [`ArticleView.vue`](../../frontend/src/views/ArticleView.vue) (header con "lavado" de color de categoría muy tenue detrás + layout de 2 columnas con sidebar sticky) — patrón directo para "detalle de puesto de trabajo" o "perfil de acompañante"
- **Listado con hero + banda oscura + CTA** → [`HomeView.vue`](../../frontend/src/views/HomeView.vue)
- **Header/nav** → [`AppHeader.vue`](../../frontend/src/components/layout/AppHeader.vue) (glassmorphism translúcido con `--nx-header-bg`, mega-menú, drawer mobile) — si una función nueva agrega ítems de nav, extendé este componente, no crees un header paralelo
- **Toggle de tema** → [`ThemeToggle.vue`](../../frontend/src/components/ui/ThemeToggle.vue) y el store [`stores/theme.ts`](../../frontend/src/stores/theme.ts) — cualquier pantalla nueva hereda el tema automáticamente vía `AppHeader`/`App.vue`, no dupliques esta lógica
- **Estado vacío** → patrón `.empty` en `CategoryView.vue`/`SearchView.vue` (fondo `--color-surface-sunken`, radio `2xl`, texto centrado + CTA)
- **Página 404 / error** → [`NotFoundView.vue`](../../frontend/src/views/NotFoundView.vue) (arco grande decorativo + mensaje breve + 2 CTAs)

## Checklist al construir una función nueva (bolsa de trabajo, directorio, cuentas)

1. **¿Los colores que necesito ya existen?** Si es un estado categórico nuevo, agregá tokens `--color-{dominio}-{variante}-bg/-text` en `:root` **y** `.dark` de `main.css`, siguiendo la paleta salvia/arcilla/ocre — nunca hex sueltos en el componente.
2. **¿La tarjeta principal de este dominio tiene portada/avatar?** Aplicale el motivo del arco.
3. **¿Hay formularios?** Reusá `.hero__search`/`.srch__form` como referencia de input, `.btn--primary`/`.btn--accent` para submit, `--radius-md` para inputs normales.
4. **¿Hay listado + filtros?** Reusá `FilterBar.vue` como plantilla de estructura (grupo de píldoras, botón "limpiar" a la derecha).
5. **¿Título de página/sección?** `.eyebrow` + `.section-title`, nunca un `<h1>` desnudo sin la variación tipográfica de Fraunces.
6. **¿Se ve bien en oscuro?** Todo token `--color-*` ya resuelve solo — si escribís un hex a mano, agregalo también a `.dark` en `main.css` o usá un token existente.
7. **Verificá con el checklist de las 5 reglas del principio rector** antes de dar por terminada la pantalla.
