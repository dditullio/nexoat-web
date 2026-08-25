import { PDFParse } from 'pdf-parse'

/**
 * `pdf-parse` inserta un salto de línea (no un espacio) entre líneas de texto que quedaron
 * separadas verticalmente en la página — un título de capítulo largo que ocupa dos líneas
 * (envuelto por el ancho de la página) queda con un "\n" exactamente donde el título original
 * tiene un espacio, así que la búsqueda literal fallaba para cualquier título que no entrara en
 * una sola línea (bug real, encontrado comparando el índice generado contra un libro real de
 * varios capítulos: solo el primer capítulo —corto, una línea— y "Referencias" —una palabra—
 * ubicaron su página; el resto de los títulos, más largos, quedó en "–"). Se normaliza todo
 * espacio en blanco (saltos de línea incluidos) a un único espacio antes de comparar.
 */
function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, ' ').trim()
}

/** Evita que un capítulo corto como "Referencias" matchee dentro de "preferencias". */
function includesWholeWord(haystack: string, needle: string): boolean {
  const index = haystack.indexOf(needle)
  if (index === -1) return false
  const before = haystack[index - 1]
  const after = haystack[index + needle.length]
  const isLetter = (c: string | undefined) => !!c && /\p{L}/u.test(c)
  return !isLetter(before) && !isLetter(after)
}

/** Pie propio de la sección de capítulos (`nexoat.com · N`, ver `ebook-docx.builder.ts`) — solo
 * esas páginas pueden ser el inicio real de un capítulo. Sin este filtro, el título de cada
 * capítulo matchea primero en su propia entrada del índice (que también lo menciona) en vez de
 * en la página donde arranca de verdad. */
const CONTENT_FOOTER_PATTERN = /nexoat\.com\s*.\s*\d+/

/**
 * Ubica en qué página del PDF ya renderizado aparece cada capítulo, buscando su título de
 * palabra completa dentro de las páginas de la sección de capítulos (identificadas por su pie
 * propio). Reemplaza el mecanismo del campo `TableOfContents` nativo de `docx`, que LibreOffice
 * headless no recalcula al convertir (a diferencia de Word de escritorio abierto por una
 * persona) — ver docs/features/welcome-ebook-gift.md, Fase 3, "Índice: dos pasadas de render".
 *
 * A diferencia de `pdf-page-index.ts` de la Fase 2, acá el PDF ya es el libro completo (portada +
 * frente + capítulos en un solo documento con secciones de Word) — no hace falta un segundo
 * documento ni ninguna corrección de offset: el número de página que se ubica acá es directamente
 * el mismo que ya va a aparecer impreso en el pie de esa página.
 */
export async function locateChapterPages(
  pdfBuffer: Buffer,
  chapterTitles: string[]
): Promise<Array<number | null>> {
  const parser = new PDFParse({ data: new Uint8Array(pdfBuffer) })
  try {
    const result = await parser.getText()
    const pageTexts = result.pages.map((page) => normalizeWhitespace(page.text))
    const contentPageIndexes = pageTexts
      .map((text, i) => (CONTENT_FOOTER_PATTERN.test(text) ? i : -1))
      .filter((i) => i !== -1)

    let searchFrom = 0
    return chapterTitles.map((title) => {
      const normalizedTitle = normalizeWhitespace(title)
      for (let j = searchFrom; j < contentPageIndexes.length; j++) {
        const pageIndex = contentPageIndexes[j]
        if (includesWholeWord(pageTexts[pageIndex], normalizedTitle)) {
          searchFrom = j + 1
          return pageIndex + 1 // páginas 1-based
        }
      }
      return null
    })
  } finally {
    await parser.destroy()
  }
}
