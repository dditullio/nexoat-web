import { PDFDocument } from 'pdf-lib'
import { PDFParse } from 'pdf-parse'

/** Cantidad de páginas de un PDF ya generado — usado para decidir si hace falta una hoja en
 * blanco antes del contenido (ver GiftsService.generatePdf()). */
export async function countPdfPages(buffer: Buffer): Promise<number> {
  const doc = await PDFDocument.load(buffer)
  return doc.getPageCount()
}

/**
 * Chromium a veces agrega una página casi vacía al final de un documento cuando el último
 * elemento desborda por unos pocos píxeles el alto de la hoja (el margen/padding final de un
 * párrafo, lista o cita) — no depende de qué tan largo sea el contenido, así que perseguir el
 * desborde exacto en CSS es frágil. Se la recorta acá, de forma genérica: si la última página
 * no tiene texto, se descarta.
 */
export async function trimTrailingBlankPage(buffer: Buffer): Promise<Buffer> {
  const parser = new PDFParse({ data: buffer })
  let pages: { text: string }[]
  try {
    pages = (await parser.getText()).pages
  } finally {
    await parser.destroy()
  }
  if (pages.length <= 1) return buffer

  const lastPageHasText = pages[pages.length - 1].text.trim().length > 0
  if (lastPageHasText) return buffer

  const doc = await PDFDocument.load(buffer)
  doc.removePage(doc.getPageCount() - 1)
  return Buffer.from(await doc.save())
}

/** Concatena varios PDFs en uno solo, en el orden dado. */
export async function mergePdfs(buffers: Buffer[]): Promise<Buffer> {
  const merged = await PDFDocument.create()
  for (const buffer of buffers) {
    const doc = await PDFDocument.load(buffer)
    const pages = await merged.copyPages(doc, doc.getPageIndices())
    for (const page of pages) merged.addPage(page)
  }
  return Buffer.from(await merged.save())
}
