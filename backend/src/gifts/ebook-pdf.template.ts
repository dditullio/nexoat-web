import * as QRCode from 'qrcode'
import { parseBookChapters } from './markdown-book'

export interface EbookPdfData {
  title: string
  subtitle: string | null
  coverImage: string | null
  /** Markdown del libro — mismo campo que WelcomeEbook.content. */
  content: string
  recipientName: string
  recipientEmail: string
  /** Si viene, se agrega una página final con QR hacia acá. */
  storeUrl: string | null
}

// A5 (148×210mm) — fácil de leer incluso en pantalla chica, ver
// docs/features/welcome-ebook-gift.md. Pulgadas: lo que espera el form
// field paperWidth/paperHeight de Gotenberg.
export const BOOK_PAPER_WIDTH_IN = 5.83
export const BOOK_PAPER_HEIGHT_IN = 8.27

/** Boilerplate legal — igual en todas las copias, a diferencia de la dedicatoria. */
const DISCLAIMER =
  'Este contenido es de carácter educativo e informativo. No sustituye el diagnóstico, ' +
  'consejo o tratamiento profesional de la salud. Ante cualquier situación específica, ' +
  'consulte con un profesional calificado.'

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string
  )
}

const SHARED_STYLE = `
  @page { margin: 0; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: Georgia, 'Times New Roman', serif; color: #2b2318; }
  .page {
    break-after: page;
    padding: 44px 40px;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }
  .page:last-child { break-after: auto; }
  .center { align-items: center; justify-content: center; text-align: center; }
  .page.blank { padding: 0; }
`

/**
 * El "frente" del libro (portada, ficha, dedicatoria, índice) — se renderiza como un PDF
 * separado del contenido (ver GiftsService.generatePdf()) precisamente porque necesita ir
 * **sin** encabezado/pie de página (el contenido sí los lleva, con numeración propia que
 * arranca en 1 — mecanismo nativo de Chromium/Gotenberg, no soporta lógica condicional por
 * página dentro de un mismo documento). Fuentes: Georgia y Arial (mismo criterio de
 * portabilidad que ya usan las plantillas de mail, en vez de embeber Fraunces/Karla como
 * @font-face en base64).
 *
 * `tocPageNumbers`: `null` en la primera pasada (números provisorios, "–" — todavía no se
 * generó el PDF de contenido para saber en qué página cae cada capítulo).
 * `insertBlankPage`: para que el capítulo 1 (ya en el PDF de contenido) arranque en página
 * impar del documento final — convención editorial, se decide contando las páginas de este
 * mismo PDF una vez renderizado.
 */
export function buildFrontMatterHtml(
  data: EbookPdfData,
  tocPageNumbers: Array<number | null> | null,
  insertBlankPage = false
): string {
  const chapters = parseBookChapters(data.content)
  const year = new Date().getFullYear()

  const tocEntries = chapters
    .map((chapter, i) => {
      const pageNumber = tocPageNumbers?.[i]
      const pageLabel = pageNumber != null ? String(pageNumber) : '–'
      return `<li class="toc-entry">
        <span class="toc-title">${escapeHtml(chapter.title)}</span>
        <span class="toc-dots" aria-hidden="true"></span>
        <span class="toc-page">${pageLabel}</span>
      </li>`
    })
    .join('\n')

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<style>
  ${SHARED_STYLE}

  /* Portada — imagen a página completa, sin texto encima (el arte ya lo trae). Sin tapa
     cargada todavía, cae a un fallback tipográfico simple para poder probar el resto del
     circuito igual. */
  .cover { padding: 0; height: 100vh; }
  .cover img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .cover-fallback { padding: 44px 40px; background: linear-gradient(180deg, #f4efe6 0%, #e9e0cf 100%); }
  .cover-fallback h1 { font-size: 30px; margin: 0 0 10px; line-height: 1.25; }
  .cover-fallback h2 { font-size: 16px; font-weight: 400; margin: 0; color: #6b5f4a; }

  /* Ficha */
  .colophon-title { font-size: 20px; margin: 0 0 6px; }
  .colophon-meta { font-family: Arial, sans-serif; font-size: 12px; color: #6b5f4a; margin: 2px 0; }
  .colophon-disclaimer-title { font-size: 14px; margin: 44px 0 8px; }
  .colophon-disclaimer { font-family: Arial, sans-serif; font-size: 11.5px; line-height: 1.7; color: #4a4030; max-width: 42ch; font-style: italic; }

  /* Dedicatoria */
  .dedication p { font-size: 15px; line-height: 1.8; max-width: 38ch; margin: 0 auto; }
  .dedication .name { font-size: 20px; font-weight: 700; margin-top: 24px; color: #5c6b45; }
  .dedication .email { font-size: 12px; color: #8a7f68; margin-top: 4px; font-family: Arial, sans-serif; }

  /* Índice */
  .toc-title-page { font-size: 20px; margin: 0 0 28px; }
  .toc-list { list-style: none; margin: 0; padding: 0; font-size: 12.5px; }
  .toc-entry { display: flex; align-items: baseline; gap: 6px; padding: 5px 0; }
  .toc-dots { flex: 1; border-bottom: 1px dotted #a89a7c; margin-bottom: 4px; }
  .toc-page { font-variant-numeric: tabular-nums; color: #6b5f4a; }
</style>
</head>
<body>
  <section class="page cover">
    ${
      data.coverImage
        ? `<img src="${escapeHtml(data.coverImage)}" alt="" />`
        : `<div class="cover-fallback center" style="flex:1;">
            <h1>${escapeHtml(data.title)}</h1>
            ${data.subtitle ? `<h2>${escapeHtml(data.subtitle)}</h2>` : ''}
          </div>`
    }
  </section>

  <section class="page colophon">
    <p class="colophon-title">${escapeHtml(data.title)}</p>
    <p class="colophon-meta">NexoAT — Textos para acompañar</p>
    <p class="colophon-meta">Primera edición digital — ${year}</p>
    <p class="colophon-meta">nexoat.com</p>
    <p class="colophon-disclaimer-title">Aviso</p>
    <p class="colophon-disclaimer">${DISCLAIMER}</p>
  </section>

  <section class="page dedication center">
    <p>Este ejemplar fue preparado especialmente como regalo de bienvenida a NexoAT para</p>
    <p class="name">${escapeHtml(data.recipientName)}</p>
    <p class="email">${escapeHtml(data.recipientEmail)}</p>
  </section>

  <section class="page toc">
    <h1 class="toc-title-page">Contenido</h1>
    <ul class="toc-list">${tocEntries}</ul>
  </section>

  ${insertBlankPage ? '<section class="page blank"></section>' : ''}
</body>
</html>`
}

/**
 * El contenido del libro (capítulos + QR final opcional) — PDF separado del frente
 * (buildFrontMatterHtml), con encabezado/pie propios cuya numeración arranca sola en 1
 * (mecanismo nativo de Chromium vía Gotenberg — ver buildContentFooterHtml). Se renderiza dos
 * veces: la primera para ubicar en qué página cae cada capítulo (índice del frente), la
 * segunda es la que se usa tal cual como páginas finales del libro — el contenido no cambia
 * entre pasadas, así que ambas producen el mismo PDF.
 */
export async function buildContentHtml(data: EbookPdfData): Promise<string> {
  const chapters = parseBookChapters(data.content)
  const qrDataUri = data.storeUrl
    ? await QRCode.toDataURL(data.storeUrl, { margin: 1, width: 240 })
    : null

  const chapterPages = chapters
    .map(
      (chapter) => `<section class="page chapter">
        <h1 class="chapter-title">${escapeHtml(chapter.title)}</h1>
        ${chapter.pullquote ? `<blockquote class="pullquote">${escapeHtml(chapter.pullquote)}</blockquote>` : ''}
        <div class="chapter-body">${chapter.bodyHtml}</div>
      </section>`
    )
    .join('\n')

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<style>
  ${SHARED_STYLE}

  .chapter-title { font-size: 21px; margin: 0 0 18px; color: #5c6b45; }
  .pullquote {
    font-style: italic;
    font-size: 13px;
    line-height: 1.6;
    text-align: center;
    color: #4a4030;
    max-width: 36ch;
    margin: 0 auto 24px;
    padding: 14px 18px;
    border: none;
    background: #eef1e6;
    border-radius: 10px;
  }
  .chapter-body { font-size: 12.5px; line-height: 1.75; }
  .chapter-body h2, .chapter-body h3 { font-family: Georgia, serif; margin-top: 1.4em; font-size: 14px; color: #5c6b45; }
  .chapter-body p { margin: 0 0 1em; }
  .chapter-body blockquote {
    margin: 1em 0;
    padding-left: 14px;
    border-left: 2px solid #cabf9e;
    color: #6b5f4a;
    font-style: italic;
  }
  /* El margen/padding final del último párrafo, lista o cita de un capítulo puede sobrar
     apenas unos píxeles y empujar una página casi vacía al final del libro — se colapsa. */
  .chapter-body > *:last-child { margin-bottom: 0; }

  .qr-page img { width: 160px; height: 160px; }
  .qr-page p { font-family: Arial, sans-serif; font-size: 11.5px; color: #6b5f4a; margin-top: 16px; max-width: 32ch; }
</style>
</head>
<body>
  ${chapterPages}

  ${
    qrDataUri
      ? `<section class="page qr-page center">
    <img src="${qrDataUri}" alt="" />
    <p>Escaneá el código para ver este y otros títulos en la tienda de NexoAT.</p>
  </section>`
      : ''
  }
</body>
</html>`
}

/** Encabezado del PDF de contenido — Gotenberg lo aplica a todas sus páginas por igual, no
 * hace falta ocultarlo en ninguna porque el frente (portada incluida) es un PDF aparte. */
export function buildContentHeaderHtml(bookTitle: string): string {
  return `<!doctype html>
<html><head><style>
  body { margin: 0; font-family: Georgia, 'Times New Roman', serif; font-size: 8px; color: #8a7f68; width: 100%; text-align: center; padding-top: 18px; }
</style></head>
<body>${escapeHtml(bookTitle)}</body></html>`
}

/**
 * Pie del PDF de contenido — `.pageNumber` es una clase que Chromium reemplaza por texto
 * plano antes de imprimir (mecanismo nativo de Puppeteer/Chromium, no de Gotenberg): como el
 * contenido es un PDF propio, esa numeración ya arranca en 1 sola, sin ningún cálculo de
 * nuestro lado. (Un intento anterior probó leerla con un <script> para "correrla" — Chromium
 * no ejecuta JS dentro de las plantillas de encabezado/pie, así que se descartó a favor de
 * este enfoque: dos PDFs separados en vez de uno con numeración condicional.)
 */
export function buildContentFooterHtml(): string {
  return `<!doctype html>
<html><head><style>
  body { margin: 0; font-family: Arial, sans-serif; font-size: 8px; color: #8a7f68; width: 100%; text-align: center; padding-bottom: 16px; }
</style></head>
<body>nexoat.com · <span class="pageNumber"></span></body></html>`
}
