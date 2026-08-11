import { describe, it, expect } from 'vitest'
import { parseArticleMarkdown } from './articleMarkdownImport'

const KNOWN_CATEGORIES = [
  'acompanamiento-terapeutico',
  'neurodiversidad-y-discapacidad',
  'familia-y-vinculos',
]

// Reproduce el formato real de Blog/Textos v2 — separadores "---" entre
// secciones (algunos archivos los usan, otros no, ver docs/features/article-md-import.md).
const MD_WITH_SECTION_DIVIDERS = `---
titulo: "Crisis en el aula: cuándo y cómo el AT debe intervenir"
subtitulo: "Sostener la escolaridad."
fecha: "2026-06-22"
estado: revisado
temas:
  - acompanamiento-terapeutico
  - neurodiversidad-y-discapacidad
  - familia-y-vinculos
nivel: intermedio
audiencia: cuidadores-familiares, profesionales
palabras_clave:
  - crisis emocional en el aula
  - intervención del AT en la escuela
descripcion: "Una guía para entender cuándo y cómo interviene el AT."
auditoria_externa: completada
# Crisis en el aula: cuándo y cómo el AT debe intervenir

*Son las diez de la mañana en un salón de tercer grado.*

---

## Primera sección

Contenido real de la primera sección.

---

## Segunda sección

Contenido real de la segunda sección.

---

> ⚠️ **Aviso:** Este contenido es de carácter educativo e informativo. No sustituye el diagnóstico profesional.
`

// Sin separadores "---" intermedios, como at-ninos-juego-clinico.md.
const MD_WITHOUT_SECTION_DIVIDERS = `---
titulo: "AT con niños pequeños"
subtitulo: "El juego como herramienta clínica."
fecha: "2026-06-11"
estado: revisado
temas:
  - acompanamiento-terapeutico
nivel: avanzado
audiencia: profesionales
palabras_clave:
  - juego clínico
  - subjetivación
descripcion: "Exploramos cómo el juego se convierte en herramienta técnica."
auditoria_externa: completada
# AT con niños pequeños

*El juego como herramienta clínica.*

Primer párrafo real del artículo.

## Encabezado

Más contenido real.

---

> ⚠️ **Aviso:** Este contenido es educativo.
`

describe('parseArticleMarkdown', () => {
  it('extrae título, subtítulo, extracto, nivel y slug propuesto', () => {
    const { data, warnings } = parseArticleMarkdown(
      MD_WITH_SECTION_DIVIDERS,
      KNOWN_CATEGORIES,
      'crisis-aula-at-intervencion-escolaridad.md'
    )

    expect(data.title).toBe('Crisis en el aula: cuándo y cómo el AT debe intervenir')
    expect(data.subtitle).toBe('Sostener la escolaridad.')
    expect(data.excerpt).toBe('Una guía para entender cuándo y cómo interviene el AT.')
    expect(data.level).toBe('intermedio')
    expect(data.slug).toBe('crisis-aula-at-intervencion-escolaridad')
    expect(warnings).toHaveLength(0)
  })

  it('mapea temas conocidos a categorySlugs y audiencia separada por coma', () => {
    const { data } = parseArticleMarkdown(MD_WITH_SECTION_DIVIDERS, KNOWN_CATEGORIES, 'x.md')

    expect(data.categorySlugs).toEqual([
      'acompanamiento-terapeutico',
      'neurodiversidad-y-discapacidad',
      'familia-y-vinculos',
    ])
    expect(data.audience).toEqual(['cuidadores-familiares', 'profesionales'])
  })

  it('mapea palabras_clave a tagsInput separado por comas', () => {
    const { data } = parseArticleMarkdown(MD_WITH_SECTION_DIVIDERS, KNOWN_CATEGORIES, 'x.md')

    expect(data.tagsInput).toBe('crisis emocional en el aula, intervención del AT en la escuela')
  })

  it('limpia el contenido: sin frontmatter, sin H1, sin cursiva inicial, sin --- ni disclaimer final', () => {
    const { data } = parseArticleMarkdown(MD_WITH_SECTION_DIVIDERS, KNOWN_CATEGORIES, 'x.md')

    expect(data.content).not.toContain('titulo:')
    expect(data.content).not.toContain('# Crisis en el aula')
    expect(data.content).not.toContain('Son las diez de la mañana')
    expect(data.content).not.toContain('---')
    expect(data.content).not.toContain('Aviso')
    expect(data.content).toContain('## Primera sección')
    expect(data.content).toContain('## Segunda sección')
    expect(data.content?.trim().endsWith('Contenido real de la segunda sección.')).toBe(true)
  })

  it('funciona igual sin separadores --- entre secciones', () => {
    const { data, warnings } = parseArticleMarkdown(
      MD_WITHOUT_SECTION_DIVIDERS,
      KNOWN_CATEGORIES,
      'at-ninos-juego-clinico.md'
    )

    expect(data.title).toBe('AT con niños pequeños')
    expect(data.content).not.toContain('El juego como herramienta clínica.')
    expect(data.content).not.toContain('Aviso')
    expect(data.content).toContain('Primer párrafo real del artículo.')
    expect(data.content).toContain('## Encabezado')
    expect(warnings).toHaveLength(0)
  })

  it('avisa de temas sin categoría equivalente sin bloquear el resto del import', () => {
    const md = MD_WITH_SECTION_DIVIDERS.replace('  - familia-y-vinculos', '  - un-tema-inexistente')
    const { data, warnings, unknownCategorySlugs } = parseArticleMarkdown(
      md,
      KNOWN_CATEGORIES,
      'x.md'
    )

    expect(data.categorySlugs).toEqual([
      'acompanamiento-terapeutico',
      'neurodiversidad-y-discapacidad',
    ])
    expect(unknownCategorySlugs).toEqual(['un-tema-inexistente'])
    expect(warnings.some((w) => w.includes('un-tema-inexistente'))).toBe(true)
  })

  it('avisa de un nivel no reconocido sin fijar data.level', () => {
    const md = MD_WITH_SECTION_DIVIDERS.replace('nivel: intermedio', 'nivel: experto')
    const { data, warnings } = parseArticleMarkdown(md, KNOWN_CATEGORIES, 'x.md')

    expect(data.level).toBeUndefined()
    expect(warnings.some((w) => w.includes('experto'))).toBe(true)
  })

  it('no toca el formulario si el archivo no empieza con ---', () => {
    const { data, warnings } = parseArticleMarkdown(
      '# Solo un título\n\nTexto suelto.',
      KNOWN_CATEGORIES
    )

    expect(data).toEqual({})
    expect(warnings).toHaveLength(1)
  })
})
