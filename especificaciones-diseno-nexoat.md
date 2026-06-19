# NexoAT — Especificaciones de Diseño Web

### Documento para maquetación y diseño preliminar · Etapa 1: Blog como Home

---

## 1. Visión General del Proyecto

**NexoAT** es un sitio web especializado en **Acompañamiento Terapéutico (AT)** y **cuidado de personas** a lo largo de todo el ciclo vital: niños, adolescentes, adultos, adultos mayores y personas con discapacidad motora o mental.

En esta primera etapa, el sitio funciona exclusivamente como un **blog de divulgación** que sirve simultáneamente como **home page**. No hay e-commerce, registro de usuarios ni servicios contratables en línea aún.

### Propósito central

El sitio busca ser la **referencia de habla hispana más confiable y accesible** sobre AT y cuidado de personas, con contenido que:

- Orienta a **familias y cuidadores** en situaciones complejas
- Profundiza el conocimiento de **profesionales del área**
- Desmitifica y dignifica el rol del acompañamiento terapéutico

### Nombre y concepto de marca

- **NexoAT**: "Nexo" evoca vínculo, puente, conexión — valores centrales de la disciplina.
- La marca debe transmitir: **calidez humana + rigor profesional + confianza**.

---

## 2. Audiencias del Sitio

### Audiencia primaria — Cuidadores familiares

Personas (generalmente familiares directos) que atraviesan la experiencia de cuidar a un ser querido con alguna condición de salud física o mental. Suelen llegar al sitio con:

- Urgencia emocional y práctica ("no sé por dónde empezar")
- Poco conocimiento técnico de la disciplina AT
- Necesidad de sentirse comprendidos y orientados, no abrumados
- Dispositivos: probablemente móvil en mayoría

### Audiencia secundaria — Profesionales de la salud y el AT

Psicólogos, psiquiatras, trabajadores sociales, docentes, y los propios Acompañantes Terapéuticos. Buscan:

- Profundización conceptual y clínica
- Artículos de nivel intermedio/avanzado con rigor técnico
- Validación y reflexión profesional

### Audiencia terciaria (futura) — Instituciones y derivadores

Hospitales, centros de día, escuelas que buscan información para derivar pacientes.

---

## 3. Inventario de Contenido (Etapa 1)

El blog cuenta con **41 artículos** listos para publicar, organizados por la siguiente taxonomía:

### 3.1 Categorías temáticas (Temas)

| Slug                             | Nombre visible sugerido        | Descripción breve                                                    |
| -------------------------------- | ------------------------------ | -------------------------------------------------------------------- |
| `acompanamiento-terapeutico`     | Acompañamiento Terapéutico     | Qué es, cómo funciona, el rol del AT, equipos interdisciplinarios    |
| `guia-cuidador`                  | Guía del Cuidador              | Técnicas prácticas: higiene, movilización, medicación, rutinas       |
| `cuidar-al-cuidador`             | Cuidar al Cuidador             | Burnout, autocuidado, límites emocionales del cuidador familiar      |
| `neurodiversidad-y-discapacidad` | Neurodiversidad y Discapacidad | TDAH, TEA, discapacidad intelectual, conductas disruptivas           |
| `familia-y-vinculos`             | Familia y Vínculos             | Duelo diagnóstico, dinámicas familiares, crianza, límites            |
| `salud-mental`                   | Salud Mental                   | Psicosis, trastornos alimentarios, adicciones, conductas autolesivas |
| `patologias-en-la-vejez`         | Vejez y Salud                  | Parkinson, Alzheimer, centros de día, mitos del envejecimiento       |
| `sistema-de-salud-y-recursos`    | Sistema de Salud               | Cómo navegar el sistema, recursos disponibles, derivaciones          |
| `herramientas-practicas`         | Herramientas Prácticas         | Guías paso a paso, checklists, organizadores de cuidado              |
| `evidencia-en-foco`              | Evidencia en Foco              | Artículos basados en investigación, datos, estudios                  |

### 3.2 Filtros adicionales

- **Por audiencia:** Para cuidadores familiares / Para profesionales
- **Por nivel:** Básico / Intermedio / Avanzado

### 3.3 Distribución actual de artículos

- ~60% orientados a cuidadores familiares
- ~25% orientados a profesionales
- ~15% mixtos (ambas audiencias)
- Nivel básico: ~8 artículos · Nivel intermedio: ~25 artículos · Nivel avanzado: ~8 artículos

---

## 4. Arquitectura del Sitio (Etapa 1)

```
NexoAT
├── / (Home = Blog principal)
│   ├── Hero con buscador
│   ├── Artículo destacado (featured)
│   ├── Grid de artículos recientes
│   ├── Sección por categorías
│   └── Módulo de suscripción al newsletter
│
├── /categoria/[slug] (Página de categoría)
│   └── Listado filtrado de artículos de esa categoría
│
├── /articulo/[slug] (Página de artículo individual)
│   └── Artículo completo + relacionados + compartir
│
├── /buscar (Resultados de búsqueda)
│
└── /acerca-de (Quiénes somos — versión mínima)
```

**Páginas previstas para etapas futuras** (no diseñar ahora, solo dejar espacio en la navegación):

- /servicios
- /contacto
- /recursos

---

## 5. Especificaciones por Página

### 5.1 Home Page / Blog Principal

Esta es la página más importante del sitio en esta etapa. Debe funcionar simultáneamente como:

1. **Presentación de la marca** NexoAT
2. **Catálogo completo** del blog
3. **Punto de entrada** hacia el contenido por categorías o búsqueda

#### Secciones (en orden vertical, escritorio):

**A. Header / Navegación global**

- Logo NexoAT (izquierda)
- Menú principal: Inicio · Categorías ▾ · Acerca de · [Buscar] [Suscribirme]
- El menú "Categorías" abre un mega-dropdown o un panel con las 10 categorías y una descripción de una línea de cada una
- Header sticky (se queda fijo al hacer scroll)
- En mobile: hamburger menu que despliega panel lateral (drawer)

**B. Hero Section**

- Tagline principal grande: algo del tipo "Tu nexo con el acompañamiento terapéutico y el cuidado que transforma"
- Subtítulo breve (2 líneas): "Artículos especializados para familias, cuidadores y profesionales que trabajan con el cuidado de personas."
- Buscador prominente (campo de búsqueda)
- Imagen de fondo: fotografía real, calurosa — personas en un contexto de cuidado auténtico (no hospital, sino hogar/parque/vida cotidiana)
- Chips de acceso rápido a categorías más visitadas debajo del buscador (ej: "Acompañamiento Terapéutico", "Guía del Cuidador", "Cuidar al Cuidador")
- Altura: entre 55vh y 65vh en desktop

**C. Artículo Destacado (Featured Post)**

- Tarjeta grande de ancho completo o 2/3 del contenedor
- Imagen grande del artículo
- Etiqueta de categoría (chip de color)
- Título del artículo (grande)
- Primer párrafo o descripción (excerpt)
- Metadatos: fecha · nivel (básico/intermedio/avanzado) · audiencia
- Botón "Leer artículo"
- Posiblemente rotativo (carrusel manual de 2-3 artículos destacados)

**D. Artículos Recientes**

- Grid de tarjetas: 3 columnas en desktop, 2 en tablet, 1 en mobile
- Cada tarjeta contiene:
  - Imagen de portada (ratio 16:9 o 3:2)
  - Chip de categoría (color codificado)
  - Título del artículo
  - Excerpt de 2-3 líneas
  - Fila inferior: fecha + chip de nivel + chip de audiencia
  - Toda la tarjeta es clickeable
- Mostrar 6 artículos en carga inicial
- Botón "Ver más artículos" (carga más o pagina)

**E. Explorar por Categorías**

- Título de sección: "Explorar por tema"
- Grid de tarjetas de categoría: 5 por fila en desktop, 2-3 en tablet, 2 en mobile
- Cada tarjeta de categoría:
  - Icono representativo (línea/outline)
  - Nombre de la categoría
  - Número de artículos ("12 artículos")
  - Color de fondo suave diferenciado por categoría
  - Hover: elevación y color más intenso
- Al hacer clic: lleva a `/categoria/[slug]`

**F. Banner "¿Sos profesional o familiar cuidador?"**

- Sección de 2 columnas para separar las audiencias
- Columna izquierda: "Para familias y cuidadores" — descripción + botón que filtra por esa audiencia
- Columna derecha: "Para profesionales del AT" — descripción + botón que filtra por esa audiencia
- Fondo con textura suave o degradado
- Diseño que no excluya sino que invite a explorar ambas perspectivas

**G. Módulo de Newsletter**

- Sección con fondo diferenciado (color de marca o imagen suave)
- Titular: "Artículos nuevos, cada semana en tu correo"
- Descripción: 1-2 líneas sobre qué recibirán
- Campo de email + botón de suscripción
- Nota de privacidad mínima (sin spam)

**H. Footer**

- Logo y tagline
- Links rápidos por columnas: Categorías / Páginas / Legal
- Redes sociales (iconos)
- Copyright y año
- Nota de propósito informativo (no reemplaza consulta profesional)

---

### 5.2 Página de Categoría

URL: `/categoria/guia-cuidador`, `/categoria/acompanamiento-terapeutico`, etc.

- **Header de categoría:**
  - Nombre de la categoría (H1 grande)
  - Descripción de la categoría (2-3 líneas)
  - Número de artículos
  - Icono o ilustración de la categoría
  - Breadcrumb: Inicio › Categorías › [Nombre]

- **Filtros secundarios (barra de filtros):**
  - Por audiencia: Todos · Cuidadores familiares · Profesionales
  - Por nivel: Todos · Básico · Intermedio · Avanzado
  - Los filtros se aplican sin recargar la página
  - Indicador visual del filtro activo

- **Grid de artículos:**
  - Mismo componente de tarjeta que en Home
  - 3 columnas desktop, 2 tablet, 1 mobile
  - Paginación o scroll infinito

- **Sidebar (solo desktop):**
  - "Otras categorías" (lista de las demás)
  - Módulo de búsqueda
  - Banner de newsletter (versión compacta)

---

### 5.3 Página de Artículo Individual

URL: `/articulo/que-es-el-acompanamiento-terapeutico`

Esta es la página donde el lector consume el contenido. Debe priorizarse la **legibilidad**, el **tiempo de lectura cómodo** y la **sensación de profundidad y cuidado editorial**.

#### Layout sugerido: contenido centrado + sidebar

**Columna principal (≈ 680-720px max-width):**

- **Header del artículo:**
  - Breadcrumb: Inicio › [Categoría] › [Título abreviado]
  - Chip(s) de categoría
  - Chips de audiencia y nivel
  - H1: Título del artículo
  - Subtítulo o bajada (italic)
  - Metadatos en línea: fecha de publicación · tiempo estimado de lectura (auto-calculado) · autor (si aplica)
  - Imagen de portada full-width (dentro de la columna)
  - Línea divisora

- **Cuerpo del artículo:**
  - Tipografía de lectura cuidada: tamaño generoso (18-19px body), interlineado 1.7
  - H2 y H3 bien jerarquizados
  - Párrafos con separación generosa
  - Listas con bullets personalizados (no genéricos del browser)
  - Bloques de cita/destacado: frases clave del artículo en formato pullquote con color de acento
  - Recuadros informativos: "Para tener en cuenta", "Señales de alerta", "Cuándo consultar a un profesional" — con icono y fondo suave
  - Tablas con diseño limpio y responsive

- **Footer del artículo:**
  - Disclaimer: "Este artículo tiene fines informativos y no reemplaza la consulta con un profesional de salud."
  - Fila de compartir: botones para WhatsApp, Facebook, Twitter/X, copiar link
  - Tags/etiquetas del artículo
  - Línea divisora

- **Artículos relacionados:**
  - 3 tarjetas de artículos de la misma categoría o audiencia
  - Título de sección: "También puede interesarte"

**Sidebar (≈ 280px, solo desktop):**

- Tabla de contenidos generada automáticamente del artículo (sticky, sigue al scroll)
- Categorías del sitio (lista compacta)
- Banner newsletter (versión mini)

---

### 5.4 Página Acerca de (versión mínima)

- Párrafo de misión del sitio
- A quiénes va dirigido
- Quiénes están detrás (placeholder de autor/equipo)
- Invitación a suscribirse o a explorar el blog

---

### 5.5 Página de Resultados de Búsqueda

- Campo de búsqueda con término actual visible
- Número de resultados encontrados
- Grid de tarjetas de artículos que coinciden
- Estado vacío (0 resultados): sugerencias de categorías populares

---

## 6. Componentes de Diseño Reutilizables

### 6.1 Tarjeta de Artículo (Article Card)

El componente más usado del sitio. Variantes:

- **Tarjeta estándar** (usada en grids)
- **Tarjeta grande / Featured** (artículo destacado)
- **Tarjeta horizontal** (listas compactas en sidebar)
- **Tarjeta mini** (artículos relacionados)

### 6.2 Sistema de Chips / Badges

- **Chip de categoría:** Fondo de color de la categoría, texto contrastado, bordes redondeados
- **Chip de nivel:** Básico (verde suave) · Intermedio (azul suave) · Avanzado (morado suave)
- **Chip de audiencia:** Cuidadores (ámbar) · Profesionales (índigo) · Mixto (gris)

### 6.3 Barra de Filtros

Usada en páginas de categoría y resultados de búsqueda. Horizontal en desktop, scrollable horizontal en mobile.

### 6.4 Tabla de Contenidos (TOC)

Sidebar sticky en artículos largos. Resalta el H2/H3 actual en viewport.

### 6.5 Bloque de Newsletter

Versión completa (en home), versión compacta (en sidebar y al final de artículos).

### 6.6 Recuadros de Énfasis en Artículos

- **Info:** fondo azul muy suave, icono ℹ️
- **Alerta:** fondo ámbar muy suave, icono ⚠️
- **Cita/Pullquote:** línea vertical de color de acento, texto en italic grande
- **Consejo práctico:** fondo verde muy suave, icono ✓

---

## 7. Identidad Visual — Directrices para el Diseñador

### 7.1 Personalidad de Marca

NexoAT debe comunicar:

| Atributo                   | Expresión visual                                                                            |
| -------------------------- | ------------------------------------------------------------------------------------------- |
| **Calidez humana**         | Fotografías de personas reales, tonos terrosos, tipografía humanista                        |
| **Rigor profesional**      | Layout ordenado, jerarquía tipográfica clara, terminología precisa                          |
| **Confianza**              | Espacio en blanco generoso, paleta neutra con acentos cálidos, sin sobrecarga visual        |
| **Accesibilidad**          | Tipografía legible, alto contraste, no depender solo del color para comunicar               |
| **Modernidad con calidez** | Sin aspecto clínico/hospitalario; más cerca de una revista de salud que de un portal médico |

### 7.2 Paleta de Color (Propuesta — sujeta a decisión del diseñador)

**Opción A — "Bosque y Tierra"** (Recomendada)

- Primary: Verde bosque profundo `#2D5016` o variante (teal oscuro-verdoso)
- Secondary: Ocre/Arena cálido `#C4933F` o terroso suave
- Accent/CTA: Verde salvia brillante o verde esmeralda claro
- Neutral oscuro: Carbón cálido `#2C2C2C`
- Neutral claro: Crema/off-white `#FAF8F5`
- Fondo de secciones: Beige muy suave `#F5F0E8`

**Opción B — "Calma y Claridad"** (Alternativa)

- Primary: Azul pizarra medio (serenidad, salud mental)
- Secondary: Coral suave / rosado cálido (calidez humana)
- Neutral: Gris perla y blanco roto
- Accent: Dorado/ámbar cálido

_El diseñador puede proponer la paleta definitiva siempre que respete los atributos de marca descritos._

### 7.3 Tipografía (Propuesta)

**Titulares:**

- Serif humanista con personalidad: **Lora**, **Playfair Display**, **Libre Baskerville** o equivalente de Google Fonts
- Transmite: autoridad, calidez, profundidad editorial

**Cuerpo de texto:**

- Sans-serif humanista y legible: **Inter**, **Source Sans Pro**, **Nunito Sans** o equivalente
- Tamaño base en artículos: 18-19px · Line height: 1.7

**UI (labels, botones, navegación):**

- Misma sans-serif del cuerpo, weight medio (500-600)

### 7.4 Iconografía

- Estilo línea/outline, grosor uniforme
- NO usar iconos rellenos o demasiado "tech"
- Opciones: Feather Icons, Phosphor, Heroicons (outline)
- Para categorías: iconos temáticos pero accesibles (no literales/literalistas)

### 7.5 Fotografía / Imágenes

- Fotografías de personas reales en contextos de cuidado cotidiano
- Ambiente: hogar, parque, espacios íntimos — NO hospital, NO blanco clínico
- Diversidad representada: todas las edades, distintos contextos socioeconómicos
- Tono: cálido, luminoso, cercano
- NO usar imágenes de stock genérico estéril o artificial
- Para artículos sin foto propia: se puede usar una ilustración editorial suave o un patrón de color de la categoría
- Opciones de banco de imágenes recomendadas para el diseñador: Unsplash (sección "care", "elderly", "family"), Pexels, Stocksy

### 7.6 Espaciado y Layout

- Grid de 12 columnas (sistema estándar)
- Máximo ancho de contenedor: 1200-1280px
- Máximo ancho de lectura en artículo: 720px
- Espaciado vertical generoso entre secciones: 80-120px en desktop
- Bordes: suaves, con border-radius moderado (8-12px en tarjetas)
- Sombras: suaves y cálidas (no grises fríos), usar con moderación

---

## 8. Comportamientos y UX

### 8.1 Comportamiento responsive

- Mobile first
- Breakpoints: mobile (<640px) · tablet (640-1024px) · desktop (>1024px)
- Sidebar del artículo colapsa en mobile (TOC se convierte en acordeón al inicio del artículo)
- Chips de filtro: scroll horizontal en mobile

### 8.2 Estados de UI

Diseñar todos los estados relevantes:

- Hover en tarjetas: elevación sutil + sombra
- Estado activo de filtros: fondo sólido con texto blanco
- Loading/skeleton de tarjetas
- Estado vacío de búsqueda o categoría sin resultados

### 8.3 Microinteracciones clave

- Al hacer scroll en el artículo: barra de progreso de lectura (línea delgada del color de acento en el top del viewport)
- Compartir artículo: feedback visual al copiar link ("¡Copiado!")
- Newsletter: animación suave al enviar el formulario

### 8.4 Accesibilidad

- Contraste mínimo WCAG AA en todo el texto
- Tamaño mínimo de área táctil: 44x44px
- Foco visible en todos los elementos interactivos
- Textos alternativos en imágenes
- Jerarquía de headings correcta (H1 único por página)

---

## 9. Páginas a Maquetar (Prioritarias)

Para el trabajo inicial de diseño, se solicitan las siguientes pantallas:

### Desktop (1280-1440px):

1. **Home / Blog** — vista completa (hero + featured + grid + categorías + banner audiencia + newsletter + footer)
2. **Página de artículo individual** — artículo con sidebar TOC
3. **Página de categoría** — con barra de filtros activa
4. **Estado mobile del artículo** — flujo de lectura
5. **Menú mobile** — drawer abierto

### Mobile (390px — iPhone 14):

1. **Home mobile** — hero + grid (1 col) + sección categorías
2. **Artículo mobile** — header, cuerpo con TOC colapsado

### Componentes aislados (Design System):

1. Tarjeta de artículo (4 variantes)
2. Sistema de chips/badges completo
3. Recuadros de énfasis (info, alerta, consejo, pullquote)
4. Barra de filtros
5. Mega menú de categorías (desktop)
6. Módulo newsletter (2 variantes: completo y mini)

---

## 10. Lo que NO incluye esta etapa

Para mantener el alcance claro, esta primera versión **no incluye**:

- Registro de usuarios o perfiles
- Comentarios en artículos
- Sistema de búsqueda con IA o semántica avanzada
- Contenido de pago o suscripción premium
- Tienda o e-commerce
- Sistema de reservas o turnos
- Foro o comunidad
- Versión en otros idiomas
- Panel de administración (CMS se definirá por separado)

---

## 11. Tono del Copywriting (Para guiar textos de UI)

- Cercano y cálido, nunca clínico ni distante
- Primera persona del plural o segunda persona directa: "te acompañamos", "encontrás acá", "para vos"
- Lenguaje inclusivo sin sacrificar fluidez
- Evitar tecnicismos sin explicación en la sección para cuidadores familiares
- Los textos de la UI (botones, títulos de sección) deben ser directos y humanos:
  - ✓ "Leé el artículo completo" (no "Ver más")
  - ✓ "Artículos para familias" (no "Filtrar por audiencia: cuidadores-familiares")
  - ✓ "¿Sos profesional del AT?" (no "Sección profesionales")

---

## 12. Referencias de Estilo (Inspiración)

El diseñador puede tomar referencia de los siguientes sitios, considerando los atributos específicos de cada uno — sin copiar, sino abstraer el principio:

- **Headspace.com** — por la calidez y el uso del color en una temática de salud mental
- **The Guardian (sección Health)** — por la tipografía editorial, jerarquía de cards y legibilidad
- **Medscape / Univadis (Professional sections)** — por la separación clara de contenido por audiencia
- **Brainpickings / The Marginalian** — por el respeto al texto largo y la tipografía generosa en artículos
- **Notion.so** — por la limpieza y el espacio en blanco inteligente
- **Tiempo Actual / Infobae Salud** — como referencia regional de formato blog salud hispanohablante

**Diferenciadores clave respecto a las referencias:**

- Más calidez y menos tecnología que Headspace
- Más humano y menos frío que los sitios médicos profesionales
- Más accesible y menos literario que Brainpickings
- Más especializado y menos genérico que portales de salud regionales

---

_Documento preparado para NexoAT · Etapa 1 · Junio 2026_
_Versión 1.0 — sujeto a iteración con el equipo de diseño_
