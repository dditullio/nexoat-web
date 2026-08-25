export interface BookChapter {
  /** Texto exacto del encabezado `## ...` — se usa tal cual como entrada del índice. */
  title: string
  /** Primer blockquote inmediatamente debajo del título, si existe (ver docs/features/welcome-ebook-gift.md). */
  pullquote: string | null
  /**
   * Resto del capítulo, en Markdown crudo (sin el pullquote, que se muestra aparte). Desde la
   * Fase 3 el consumidor es `ebook-docx.builder.ts`, que arma `Paragraph`/`TextRun` de `docx`
   * directamente — no hace falta pasar por HTML como en la Fase 2 (Chromium/Gotenberg).
   */
  bodyMarkdown: string
}

/**
 * Divide el Markdown de un WelcomeEbook en capítulos por encabezado `## ` (nivel 2 — los 3
 * títulos ya cargados en desarrollo siguen esta convención, la misma que usa el skill
 * `maquetacion-ebook-markdown-nexoat`: cada capítulo abre con `## Título` seguido de un
 * `> pullquote` opcional). No se soportan capítulos anidados (`###` queda como subtítulo
 * normal dentro del capítulo, no como una entrada nueva del índice).
 */
export function parseBookChapters(markdown: string): BookChapter[] {
  const sections = markdown.split(/^## +(.+)$/m)
  // split() con grupo de captura intercala: [preámbulo, título1, cuerpo1, título2, cuerpo2, ...]
  // El preámbulo (texto antes del primer "## ") no forma parte de ningún capítulo — se ignora,
  // mismo criterio que un libro sin "introducción" suelta antes del primer capítulo.
  const chapters: BookChapter[] = []

  for (let i = 1; i < sections.length; i += 2) {
    const title = sections[i].trim()
    const rawBody = (sections[i + 1] ?? '').trim()

    const pullquoteMatch = rawBody.match(/^>\s*(.+?)(?:\n\n|\n(?=[^>])|$)/s)
    let pullquote: string | null = null
    let bodyMarkdown = rawBody

    if (pullquoteMatch) {
      pullquote = pullquoteMatch[1]
        .split('\n')
        .map((line) => line.replace(/^>\s?/, '').trim())
        .join(' ')
        .trim()
      bodyMarkdown = rawBody.slice(pullquoteMatch[0].length).trim()
    }

    chapters.push({
      title,
      pullquote,
      bodyMarkdown,
    })
  }

  return chapters
}
