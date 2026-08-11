# Importar artículo desde .md (drag & drop en el formulario admin)

**Estado:** documentado e implementado en esta misma sesión.

## Contexto

Los textos del blog se escriben primero como archivos `.md` sueltos (`Blog/Textos v2/revisados/*.md`, fuera del repo) con un encabezado de metadata al principio del archivo — título, subtítulo, fecha, temas, nivel, audiencia, palabras clave, descripción. Hasta ahora, cargar un artículo nuevo significaba copiar esos datos a mano campo por campo en `AdminArticleFormView.vue` (visto en la sesión anterior: se hizo vía `curl` directo al API, no desde el form). Se pidió automatizar esto: soltar el `.md` en el formulario y que rellene título, subtítulo, extracto, categorías, nivel, audiencia, tags y contenido — quitando la metadata y las líneas redundantes del cuerpo antes de dejarlo en el campo Contenido.

## El formato de origen (no es YAML frontmatter estándar)

Ejemplo real (`crisis-aula-at-intervencion-escolaridad.md`):

```
---
titulo: "Crisis en el aula: cuándo y cómo el AT debe intervenir..."
subtitulo: "Cuando un niño se desborda en la escuela..."
fecha: "2026-06-22"
estado: revisado
temas:
  - acompanamiento-terapeutico
  - neurodiversidad-y-discapacidad
nivel: intermedio
audiencia: cuidadores-familiares, profesionales
palabras_clave:
  - acompañamiento terapéutico escolar
  - crisis emocional en el aula
descripcion: "Una guía para entender cuándo y cómo..."
auditoria_externa: completada
# Crisis en el aula: cuándo y cómo el AT debe intervenir...

*Son las diez de la mañana. En un salón de tercer grado...*

---

## Por qué ocurren las crisis en el aula...
...
---

> ⚠️ **Aviso:** Este contenido es de carácter educativo e informativo...
```

Se comprobó (a mano, comparando dos archivos reales) que **no es YAML delimitado correctamente**: abre con `---` pero nunca lo cierra antes de los campos — el cierre real es implícito, marcado por la primera línea `# Título` (que repite `titulo`). Después del `# Título` sigue siempre un párrafo en cursiva de una sola línea (`*...*`, eco del subtítulo/descripción) que tampoco es parte del cuerpo real. El resto del cuerpo puede o no usar `---` como separador visual entre secciones `##` (un archivo lo usaba, otro no) y siempre termina con un blockquote `> ⚠️ **Aviso:** ...` que **ya se renderiza aparte** como bloque fijo en `ArticleView.vue` (`.art__disclaimer`) — dejarlo en el contenido lo duplicaría.

Por ser un formato casero y no-YAML-válido, **no se usa un parser YAML genérico** (`js-yaml`, `gray-matter`, etc. hubieran fallado o requerido parchear el archivo de origen primero). Se escribió un parser a mano, tolerante a este formato específico, en `frontend/src/utils/articleMarkdownImport.ts`.

## Reglas de extracción

1. El archivo debe empezar con una línea `---`; si no, se aborta con una advertencia y no se toca el formulario.
2. Se leen pares `clave: valor` (con o sin comillas) y listas (`  - item`) hasta encontrar la primera línea que empieza con `# ` (el H1) — esa zona es la metadata.
3. Se descarta la línea `# H1` y, si la línea no-vacía siguiente es un párrafo envuelto enteramente en `*...*`, también se descarta (eco del subtítulo).
4. Del resto del cuerpo se eliminan todas las líneas que son exactamente `---` (separadores visuales, no contenido).
5. Se recorta un bloque final tipo blockquote que contenga "aviso" (case-insensitive) — el disclaimer ya fijo en `ArticleView.vue`.
6. Se colapsan 3+ líneas en blanco seguidas a 2, y se hace `trim()`.

## Mapeo de campos

| Campo del `.md`                        | Campo del formulario                                                                                                                                                                                                             |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `titulo`                               | `title`                                                                                                                                                                                                                          |
| `subtitulo`                            | `subtitle`                                                                                                                                                                                                                       |
| `descripcion`                          | `excerpt`                                                                                                                                                                                                                        |
| `temas` (lista)                        | `categorySlugs` — solo se marcan los slugs que existen en `categoryOptions`; los que no matchean se listan en una advertencia, no se inventan categorías nuevas                                                                  |
| `nivel`                                | `level` — validado contra `basico\|intermedio\|avanzado`, si no matchea se ignora y se avisa                                                                                                                                     |
| `audiencia`                            | `audience` — se separa por coma, se valida contra `cuidadores-familiares\|profesionales\|mixto`                                                                                                                                  |
| `palabras_clave` (lista)               | `tags` (vía `tagsInput`, mismo input de texto separado por comas que ya existe)                                                                                                                                                  |
| — (nombre de archivo)                  | `slug` — se propone el nombre de archivo sin `.md` como slug (así se subió el artículo anterior a mano); el campo sigue editable                                                                                                 |
| `fecha`, `estado`, `auditoria_externa` | **no se mapean** — `fecha` no es editable en el form (la fecha real es `createdAt`, gestionada por el backend); `estado`/`auditoria_externa` son metadata del flujo editorial externo (Google Docs → texto revisado), no del CMS |
| resto del cuerpo (limpio)              | `content`                                                                                                                                                                                                                        |

`status` (borrador/publicado/archivado) y la imagen de portada **no** se tocan — quedan en lo que ya tuviera el formulario (por defecto "borrador"), porque no vienen en el `.md` y la portada se sigue cargando aparte con el flujo de Cloudinary ya existente.

## Dónde vive (frontend, único lado tocado — no hay cambios de backend)

| Archivo                                       | Qué hace                                                                                                                                                                                                                                                                                                                                                            |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `utils/articleMarkdownImport.ts` (nuevo)      | `parseArticleMarkdown(raw, fileName)` → `{ data: Partial<ArticleFormPayload> & { tagsInput?: string }, warnings: string[] }`. Sin dependencias nuevas.                                                                                                                                                                                                              |
| `utils/articleMarkdownImport.spec.ts` (nuevo) | Tests con los dos `.md` reales usados como fixture (casos: con/sin `---` intermedios, tema no reconocido, nivel inválido, archivo sin frontmatter).                                                                                                                                                                                                                 |
| `views/admin/AdminArticleFormView.vue`        | Nueva zona de drag & drop arriba del campo Título, **visible solo al crear** (`!isEditing`) para no pisar por accidente un artículo ya cargado. Acepta drop o click-para-elegir-archivo (`accept=".md"`). Tras parsear, aplica los campos al `form` reactivo y muestra las advertencias (si las hay) en una lista, sin bloquear el guardado manual de lo que falte. |

## Plan de verificación

1. Soltar `crisis-aula-at-intervencion-escolaridad.md` (ya subido a mano en la sesión anterior, sirve de referencia exacta) en el form de "Nuevo artículo" → confirmar que título, subtítulo, extracto, categorías (3), nivel, audiencia (2) y tags quedan igual que lo cargado manualmente, y que el contenido no incluye frontmatter, `# H1`, párrafo en cursiva inicial, `---` sueltos ni el blockquote de aviso final.
2. Probar con un `.md` que tenga un tema en `temas` que no exista como categoría → confirmar que aparece la advertencia y que esa categoría simplemente no se marca (no rompe el resto del import).
3. Probar con un archivo que no tenga `---` inicial (texto cualquiera) → confirmar que no pisa el formulario y muestra advertencia.
4. `pnpm --filter @nexoat/frontend test` → tests del parser en verde.
5. `pnpm type-check` y `pnpm lint:check` limpios.
