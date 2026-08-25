import { PDFParse } from 'pdf-parse'

/** Espacios/saltos de línea variables entre palabras no deberían romper la búsqueda del título. */
function normalize(text: string): string {
  return text.replace(/\s+/g, ' ').trim().toLowerCase()
}

const LETTER = /[a-z0-9à-ÿ]/i

/**
 * Como `String.includes`, pero exige que el match no esté embebido dentro de una palabra más
 * larga — un capítulo corto como "Referencias" matcheaba como substring de "preferencias" en
 * el cuerpo de otro capítulo, dándole una página equivocada en el índice. `\b` de regex no
 * sirve acá porque es ASCII-only y no reconoce tildes/eñes como letras.
 */
function includesWholeWord(haystack: string, needle: string): boolean {
  let index = haystack.indexOf(needle)
  while (index !== -1) {
    const before = haystack[index - 1]
    const after = haystack[index + needle.length]
    if (!LETTER.test(before ?? ' ') && !LETTER.test(after ?? ' ')) return true
    index = haystack.indexOf(needle, index + 1)
  }
  return false
}

/**
 * Devuelve, para cada título de capítulo (en el mismo orden que se pasó), la primera página
 * (1-based, dentro de `pdfBuffer` — un PDF de solo contenido, sin el frente del libro) donde
 * aparece su texto completo — o `null` si no se lo encontró (nunca debería pasar si el título
 * viene tal cual del propio Markdown, pero un `null` no debe romper la generación, solo dejar
 * esa fila del índice sin número).
 *
 * Usado para la numeración real del índice — ver GiftsService.generatePdf() (el frente y el
 * contenido se renderizan como PDFs separados y se unen al final, docs/features/welcome-ebook-gift.md).
 */
export async function locateChapterPages(
  pdfBuffer: Buffer,
  chapterTitles: string[]
): Promise<Array<number | null>> {
  const parser = new PDFParse({ data: pdfBuffer })
  let pages: { num: number; text: string }[]
  try {
    const result = await parser.getText()
    pages = result.pages
  } finally {
    await parser.destroy()
  }

  const normalizedPages = pages.map((p) => ({ num: p.num, text: normalize(p.text) }))

  return chapterTitles.map((title) => {
    const needle = normalize(title)
    const page = normalizedPages.find((p) => includesWholeWord(p.text, needle))
    return page?.num ?? null
  })
}
