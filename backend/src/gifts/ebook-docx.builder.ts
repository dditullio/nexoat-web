import * as QRCode from 'qrcode'
import type { ProfileRole } from '@prisma/client'
import {
  AlignmentType,
  Document,
  Footer,
  Header,
  HeadingLevel,
  ImageRun,
  LeaderType,
  LevelFormat,
  PageNumber,
  Packer,
  Paragraph,
  SectionType,
  TabStopType,
  TextRun,
  convertMillimetersToTwip,
} from 'docx'
import { parseBookChapters } from './markdown-book'
import { parseInlineMarkdown } from './markdown-inline'

export interface EbookDocxData {
  title: string
  subtitle: string | null
  /** URL de Cloudinary — se descarga para embeberla como imagen real en el .docx. */
  coverImage: string | null
  /** Markdown del libro — mismo campo que WelcomeEbook.content. */
  content: string
  recipientName: string
  recipientEmail: string
  /** `WelcomeEbook.profileRole` del usuario que reclama — agrega una línea de reconocimiento
   * en la dedicatoria para AT/cuidador/familiar (ver `RECOGNITION_BY_ROLE`). `null` (todavía no
   * completó el onboarding, o eligió "otro") no agrega ninguna línea — no hay una redacción
   * genérica razonable para ese caso. */
  recipientProfileRole: ProfileRole | null
  /** Si viene, se agrega una página final con QR hacia acá. */
  storeUrl: string | null
  /**
   * Números de página reales del índice, en el mismo orden que los capítulos de `content`.
   * `null` en la primera pasada (todavía no se generó el PDF para saber en qué página cae cada
   * uno — ver `GiftsService.generatePdf()` y "Índice: dos pasadas de render" en
   * docs/features/welcome-ebook-gift.md, Fase 3). Un valor individual `null` dentro del array
   * (capítulo no localizado) se muestra como "–".
   */
  tocPageNumbers: Array<number | null> | null
}

// ─── Página: A4 (no A5) ──────────────────────────────────────────────────────
// A5 quedaba incómodo de leer a página completa en desktop/tablet, y además un tamaño no
// estándar complica imprimir el PDF en una impresora hogareña (bandeja A4/Carta de fábrica,
// "ajustar a página" reescala y deja márgenes irregulares) — ver docs/features/welcome-ebook-gift.md,
// Fase 3.
const PAGE_WIDTH_TWIP = convertMillimetersToTwip(210)
const PAGE_HEIGHT_TWIP = convertMillimetersToTwip(297)
// Márgenes simétricos (sin margen extra de "lomo" — no aplica a un PDF digital) que, junto con
// FONT_SCALE_FACTOR, mantienen la línea de cuerpo cerca de los 80 caracteres — ver
// docs/features/welcome-ebook-gift.md, Fase 3.
const MARGIN_SIDE_TWIP = convertMillimetersToTwip(20)
const MARGIN_VERTICAL_TWIP = convertMillimetersToTwip(20)

// ─── Tipografía: tamaños base "de publicación" × un único factor de escala ──────────────────
// Multiplicar todo por FONT_SCALE_FACTOR es lo que permite agrandar/achicar el documento entero
// (para que se lea cómodo a página completa) tocando un solo número. Interlineado y tracking
// también escalan con el mismo factor para no dejar el texto apretado.
const FONT_SCALE_FACTOR = 1.13

const BASE_PT = {
  body: 11,
  chapterTitle: 24,
  sectionHeading: 14,
  pullquote: 13,
  colophonTitle: 18,
  colophonMeta: 10,
  dedicationName: 16,
  dedicationText: 12,
  tocTitle: 18,
  tocEntry: 11,
  footer: 9,
} as const

/**
 * `docx` pide "half-points" en `size`. `extraScale` es un multiplicador adicional por-elemento
 * (ej. el cuerpo del capítulo "Referencias" un 20% más chico que el resto — ver
 * `chapterBodyParagraphs`), no toca `FONT_SCALE_FACTOR` global.
 */
function pt(base: number, extraScale = 1): number {
  return Math.round(base * FONT_SCALE_FACTOR * extraScale * 2)
}

// Fuentes de sistema (Georgia/Arial), no Fraunces/Karla del sitio: embeber las fuentes reales
// del proyecto requiere sus archivos .ttf/.otf en el repo (no disponibles hoy) — queda anotado
// como mejora futura en docs/features/welcome-ebook-gift.md. Georgia/Arial además evitan
// depender de qué tenga instalado el contenedor de LibreOffice.
const FONT_SERIF = 'Georgia'
const FONT_SANS = 'Arial'

const COLOR_TEXT = '2B2318'
const COLOR_ACCENT = '5C6B45' // salvia
const COLOR_MUTED = '6B5F4A'
const COLOR_FAINT = '8A7F68'
const COLOR_PULLQUOTE_BG = 'EEF1E6'

const DISCLAIMER =
  'Este contenido es de carácter educativo e informativo. No sustituye el diagnóstico, ' +
  'consejo o tratamiento profesional de la salud. Ante cualquier situación específica, ' +
  'consulte con un profesional calificado.'

/**
 * Línea de reconocimiento en la dedicatoria, según el `profileRole` elegido en el onboarding —
 * ver docs/features/welcome-ebook-gift.md, Fase 3, "Reconocimiento en la dedicatoria". `familiar`
 * queda con una redacción deliberadamente genérica (no sabemos a quién cuida ni en qué
 * circunstancia); `otro` no tiene entrada — no hay forma genérica razonable de reconocerlo sin
 * más contexto, se omite la línea entera antes que forzar un texto vacío de sentido.
 */
const RECOGNITION_BY_ROLE: Partial<Record<ProfileRole, string>> = {
  acompanante_terapeutico:
    'en reconocimiento a su dedicación en el ámbito del Acompañamiento Terapéutico',
  cuidador: 'en reconocimiento a su dedicación en el cuidado de personas',
  familiar: 'en reconocimiento al amor y la presencia con que acompaña a quien cuida',
}

/** Página de cierre del libro — mismo texto institucional que usa el sitio. */
const CLOSING_DESCRIPTION =
  'Un espacio de divulgación para quienes cuidan de otra persona: familiares de adultos ' +
  'mayores, personas con discapacidad, personas con condiciones de salud mental, y ' +
  'profesionales del Acompañamiento Terapéutico.'

/** Interlineado en "líneas" (240 = simple) — escala con la fuente para no quedar apretado. */
function lineSpacing(multiplier: number) {
  return { line: Math.round(240 * multiplier), lineRule: 'auto' as const }
}

async function fetchImageBuffer(url: string): Promise<Buffer | null> {
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    return Buffer.from(await res.arrayBuffer())
  } catch {
    return null
  }
}

/**
 * Convierte el cuerpo Markdown de un capítulo (sin el pullquote) en párrafos de `docx`.
 * `extraScale` reduce (o aumenta) el tamaño de fuente de todo el bloque respecto al resto del
 * libro sin tocar `FONT_SCALE_FACTOR` global — se usa para el capítulo "Referencias" (ver
 * `buildEbookDocx`), un 20% más chico que el texto libre.
 */
function chapterBodyParagraphs(markdown: string, extraScale = 1): Paragraph[] {
  const blocks = markdown.split(/\n{2,}/)
  const paragraphs: Paragraph[] = []

  for (const block of blocks) {
    const trimmed = block.trim()
    if (!trimmed) continue

    const headingMatch = trimmed.match(/^(#{3,4})\s+(.+)$/)
    if (headingMatch) {
      paragraphs.push(
        new Paragraph({
          heading: headingMatch[1].length === 3 ? HeadingLevel.HEADING_3 : HeadingLevel.HEADING_4,
          spacing: { before: 260, after: 120 },
          widowControl: true,
          children: [
            new TextRun({
              text: headingMatch[2].trim(),
              bold: true,
              color: COLOR_ACCENT,
              font: FONT_SERIF,
              size: pt(BASE_PT.sectionHeading, extraScale),
            }),
          ],
        })
      )
      continue
    }

    const isBlockquote = trimmed.split('\n').every((line) => line.trim().startsWith('>'))
    if (isBlockquote) {
      const text = trimmed
        .split('\n')
        .map((line) => line.replace(/^>\s?/, ''))
        .join(' ')
        .trim()
      paragraphs.push(
        new Paragraph({
          spacing: { before: 160, after: 160, ...lineSpacing(1.5) },
          indent: { left: 360 },
          widowControl: true,
          border: { left: { style: 'single', size: 12, color: 'CABF9E', space: 8 } },
          children: parseInlineMarkdown(text, {
            italics: true,
            color: COLOR_MUTED,
            font: FONT_SERIF,
            size: pt(BASE_PT.body, extraScale),
          }),
        })
      )
      continue
    }

    const isList = /^[-*]\s+/.test(trimmed) || /^\d+\.\s+/.test(trimmed)
    if (isList) {
      const ordered = /^\d+\.\s+/.test(trimmed)
      const items = trimmed.split('\n').filter((l) => l.trim())
      for (const item of items) {
        const text = item.replace(/^[-*]\s+/, '').replace(/^\d+\.\s+/, '')
        paragraphs.push(
          new Paragraph({
            bullet: ordered ? undefined : { level: 0 },
            numbering: ordered ? { reference: 'chapter-numbered-list', level: 0 } : undefined,
            spacing: { after: 80, ...lineSpacing(1.6) },
            widowControl: true,
            children: parseInlineMarkdown(text, {
              font: FONT_SERIF,
              size: pt(BASE_PT.body, extraScale),
              color: COLOR_TEXT,
            }),
          })
        )
      }
      continue
    }

    paragraphs.push(
      new Paragraph({
        alignment: AlignmentType.JUSTIFIED,
        spacing: { after: 200, ...lineSpacing(1.6) },
        widowControl: true,
        children: parseInlineMarkdown(trimmed, {
          font: FONT_SERIF,
          size: pt(BASE_PT.body, extraScale),
          color: COLOR_TEXT,
        }),
      })
    )
  }

  return paragraphs
}

/**
 * Arma el `.docx` completo del libro — reemplaza a `ebook-pdf.template.ts` (Fase 2, HTML +
 * Chromium) y a la unión de dos PDFs vía `pdf-lib`. Word/LibreOffice resuelven nativamente lo que
 * antes había que calcular a mano: el arranque de la sección de capítulos en página impar
 * (`SectionType.ODD_PAGE`) y la numeración de página propia de esa sección (`pageNumbers.start`).
 * El índice **no** usa el campo `TableOfContents` nativo (no se recalcula con LibreOffice
 * headless) — se resuelve con dos llamadas a esta función desde `GiftsService.generatePdf()`, ver
 * `tocPageNumbers` y docs/features/welcome-ebook-gift.md, Fase 3, "Índice: dos pasadas de render".
 */
export async function buildEbookDocx(data: EbookDocxData): Promise<Buffer> {
  const chapters = parseBookChapters(data.content)
  const year = new Date().getFullYear()

  const coverImageBuffer = data.coverImage ? await fetchImageBuffer(data.coverImage) : null
  const qrBuffer = data.storeUrl
    ? await QRCode.toBuffer(data.storeUrl, { margin: 1, width: 480 })
    : null

  // ─── Sección 1: portada — imagen a página completa, sin header/footer ───
  const coverChildren: Paragraph[] = coverImageBuffer
    ? [
        new Paragraph({
          spacing: { before: 0, after: 0 },
          children: [
            new ImageRun({
              type: 'png',
              data: coverImageBuffer,
              altText: {
                name: 'Portada',
                title: 'Portada',
                description: `Portada de "${data.title}"`,
              },
              transformation: {
                width: Math.round((PAGE_WIDTH_TWIP / 1440) * 96),
                height: Math.round((PAGE_HEIGHT_TWIP / 1440) * 96),
              },
            }),
          ],
        }),
      ]
    : [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 3600, after: 200 },
          children: [
            new TextRun({
              text: data.title,
              bold: true,
              font: FONT_SERIF,
              size: pt(BASE_PT.chapterTitle + 6),
              color: COLOR_TEXT,
            }),
          ],
        }),
        ...(data.subtitle
          ? [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: data.subtitle,
                    font: FONT_SANS,
                    size: pt(BASE_PT.sectionHeading),
                    color: COLOR_MUTED,
                  }),
                ],
              }),
            ]
          : []),
      ]

  // ─── Sección 2: ficha + dedicatoria + índice — sin header/footer ───
  const frontMatterChildren: Paragraph[] = [
    new Paragraph({
      spacing: { after: 60 },
      widowControl: true,
      children: [
        new TextRun({
          text: data.title,
          bold: true,
          font: FONT_SERIF,
          size: pt(BASE_PT.colophonTitle),
        }),
      ],
    }),
    ...['NexoAT — Textos para acompañar', `Primera edición digital — ${year}`, 'nexoat.com'].map(
      (line) =>
        new Paragraph({
          spacing: { after: 20 },
          children: [
            new TextRun({
              text: line,
              font: FONT_SANS,
              size: pt(BASE_PT.colophonMeta),
              color: COLOR_MUTED,
            }),
          ],
        })
    ),
    new Paragraph({
      spacing: { before: 500, after: 60 },
      children: [
        new TextRun({
          text: 'Aviso',
          bold: true,
          font: FONT_SERIF,
          size: pt(BASE_PT.sectionHeading),
        }),
      ],
    }),
    new Paragraph({
      spacing: { after: 400, ...lineSpacing(1.5) },
      widowControl: true,
      children: [
        new TextRun({
          text: DISCLAIMER,
          italics: true,
          font: FONT_SANS,
          size: pt(BASE_PT.colophonMeta),
          color: COLOR_MUTED,
        }),
      ],
    }),
    // Dedicatoria — página propia (salto explícito), lo único genuinamente personal de la copia.
    new Paragraph({ pageBreakBefore: true, spacing: { before: 2400, after: 300 } }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200, ...lineSpacing(1.6) },
      children: [
        new TextRun({
          text: 'Este ejemplar fue preparado especialmente como regalo de bienvenida a NexoAT para',
          font: FONT_SERIF,
          size: pt(BASE_PT.dedicationText),
          color: COLOR_TEXT,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 60 },
      children: [
        new TextRun({
          text: data.recipientName,
          bold: true,
          font: FONT_SERIF,
          size: pt(BASE_PT.dedicationName),
          color: COLOR_ACCENT,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [
        new TextRun({
          text: data.recipientEmail,
          font: FONT_SANS,
          size: pt(BASE_PT.colophonMeta),
          color: COLOR_FAINT,
        }),
      ],
    }),
    ...(data.recipientProfileRole && RECOGNITION_BY_ROLE[data.recipientProfileRole]
      ? [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            indent: { left: 700, right: 700 },
            spacing: { after: 0, ...lineSpacing(1.5) },
            widowControl: true,
            children: [
              new TextRun({
                text: RECOGNITION_BY_ROLE[data.recipientProfileRole],
                italics: true,
                font: FONT_SERIF,
                size: pt(BASE_PT.colophonMeta + 1),
                color: COLOR_MUTED,
              }),
            ],
          }),
        ]
      : []),
    // Índice — párrafos con tab de puntos hasta el número de página, no el campo
    // `TableOfContents` nativo de `docx`: se probó contra Gotenberg real y LibreOffice headless
    // no recalcula ese campo al convertir (a diferencia de Word de escritorio, que lo actualiza
    // al abrirse) — quedaba con el título y sin entradas. En su lugar, `GiftsService.generatePdf()`
    // renderiza el documento dos veces: la primera con `tocPageNumbers: null` para ubicar en qué
    // página cae cada capítulo (`locateChapterPages()`), la segunda ya con esos números baked-in.
    // Ver docs/features/welcome-ebook-gift.md, Fase 3.
    new Paragraph({ pageBreakBefore: true, spacing: { after: 260 } }),
    new Paragraph({
      spacing: { after: 260 },
      children: [
        new TextRun({
          text: 'Contenido',
          bold: true,
          font: FONT_SERIF,
          size: pt(BASE_PT.tocTitle),
        }),
      ],
    }),
    ...chapters.map(
      (chapter, i) =>
        new Paragraph({
          tabStops: [
            {
              type: TabStopType.RIGHT,
              position: PAGE_WIDTH_TWIP - 2 * MARGIN_SIDE_TWIP,
              leader: LeaderType.DOT,
            },
          ],
          spacing: { after: 120 },
          widowControl: true,
          children: [
            new TextRun({
              text: chapter.title,
              font: FONT_SERIF,
              size: pt(BASE_PT.tocEntry),
              color: COLOR_TEXT,
            }),
            new TextRun({ text: '\t', font: FONT_SERIF, size: pt(BASE_PT.tocEntry) }),
            new TextRun({
              text: data.tocPageNumbers?.[i] != null ? String(data.tocPageNumbers[i]) : '–',
              font: FONT_SANS,
              size: pt(BASE_PT.tocEntry),
              color: COLOR_MUTED,
            }),
          ],
        })
    ),
  ]

  // ─── Sección 3: capítulos + QR — header/footer propios, numeración desde 1, arranca en
  // página impar (SectionType.ODD_PAGE resuelve la convención editorial sin contar páginas). ───
  const chapterChildren: Paragraph[] = []
  for (const chapter of chapters) {
    chapterChildren.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        pageBreakBefore: chapterChildren.length > 0,
        spacing: { after: 240 },
        widowControl: true,
        children: [
          new TextRun({
            text: chapter.title,
            bold: true,
            font: FONT_SERIF,
            size: pt(BASE_PT.chapterTitle),
            color: COLOR_ACCENT,
          }),
        ],
      })
    )

    if (chapter.pullquote) {
      chapterChildren.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 300, ...lineSpacing(1.5) },
          shading: { fill: COLOR_PULLQUOTE_BG },
          indent: { left: 500, right: 500 },
          widowControl: true,
          children: parseInlineMarkdown(chapter.pullquote, {
            italics: true,
            font: FONT_SERIF,
            size: pt(BASE_PT.pullquote),
            color: COLOR_MUTED,
          }),
        })
      )
    }

    // El capítulo "Referencias" va con el cuerpo un 20% más chico que el resto — es texto de
    // consulta (citas, enlaces), no de lectura corrida, y así se distingue visualmente.
    const isReferences = chapter.title.trim().toLowerCase() === 'referencias'
    chapterChildren.push(...chapterBodyParagraphs(chapter.bodyMarkdown, isReferences ? 0.8 : 1))
  }

  if (qrBuffer) {
    chapterChildren.push(
      new Paragraph({
        pageBreakBefore: true,
        alignment: AlignmentType.CENTER,
        spacing: { before: 2400 },
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
        children: [
          new ImageRun({
            type: 'png',
            data: qrBuffer,
            altText: {
              name: 'Código QR',
              title: 'Código QR',
              description: 'Código QR a la tienda de NexoAT',
            },
            transformation: { width: 160, height: 160 },
          }),
        ],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { ...lineSpacing(1.5) },
        children: [
          new TextRun({
            text: 'Escaneá el código para ver este y otros títulos en la tienda de NexoAT.',
            font: FONT_SANS,
            size: pt(BASE_PT.colophonMeta),
            color: COLOR_MUTED,
          }),
        ],
      })
    )
  }

  // ─── Sección 4: cierre institucional — sin header/footer, misma estética limpia que la ficha. ───
  const closingChildren: Paragraph[] = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 3200, after: 240 },
      children: [
        new TextRun({
          text: 'NexoAT',
          bold: true,
          font: FONT_SERIF,
          size: pt(BASE_PT.colophonTitle + 4),
          color: COLOR_ACCENT,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      indent: { left: 900, right: 900 },
      spacing: { after: 320, ...lineSpacing(1.6) },
      widowControl: true,
      children: [
        new TextRun({
          text: CLOSING_DESCRIPTION,
          italics: true,
          font: FONT_SERIF,
          size: pt(BASE_PT.dedicationText),
          color: COLOR_MUTED,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 320 },
      children: [
        new TextRun({
          text: '—',
          font: FONT_SANS,
          size: pt(BASE_PT.sectionHeading),
          color: 'CABF9E',
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: 'nexoat.com',
          bold: true,
          font: FONT_SANS,
          size: pt(BASE_PT.colophonMeta),
          color: COLOR_ACCENT,
        }),
      ],
    }),
  ]

  const contentHeader = new Header({
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            text: data.title,
            font: FONT_SERIF,
            size: pt(BASE_PT.footer - 1),
            color: COLOR_FAINT,
          }),
        ],
      }),
    ],
  })

  const contentFooter = new Footer({
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            text: 'nexoat.com · ',
            font: FONT_SANS,
            size: pt(BASE_PT.footer),
            color: COLOR_FAINT,
          }),
          new TextRun({
            children: [PageNumber.CURRENT],
            font: FONT_SANS,
            size: pt(BASE_PT.footer),
            color: COLOR_FAINT,
          }),
        ],
      }),
    ],
  })

  const doc = new Document({
    numbering: {
      config: [
        {
          reference: 'chapter-numbered-list',
          levels: [
            { level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.START },
          ],
        },
      ],
    },
    styles: {
      default: {
        document: {
          run: { font: FONT_SERIF, size: pt(BASE_PT.body), color: COLOR_TEXT },
        },
      },
    },
    sections: [
      {
        properties: {
          type: SectionType.NEXT_PAGE,
          page: {
            size: { width: PAGE_WIDTH_TWIP, height: PAGE_HEIGHT_TWIP },
            margin: { top: 0, bottom: 0, left: 0, right: 0 },
          },
        },
        children: coverChildren,
      },
      {
        properties: {
          type: SectionType.NEXT_PAGE,
          page: {
            size: { width: PAGE_WIDTH_TWIP, height: PAGE_HEIGHT_TWIP },
            margin: {
              top: MARGIN_VERTICAL_TWIP,
              bottom: MARGIN_VERTICAL_TWIP,
              left: MARGIN_SIDE_TWIP,
              right: MARGIN_SIDE_TWIP,
            },
          },
        },
        children: frontMatterChildren,
      },
      {
        properties: {
          // Arranca en la siguiente página impar — reemplaza la hoja en blanco condicional +
          // recuento de páginas manual de la Fase 2.
          type: SectionType.ODD_PAGE,
          page: {
            size: { width: PAGE_WIDTH_TWIP, height: PAGE_HEIGHT_TWIP },
            margin: {
              top: MARGIN_VERTICAL_TWIP,
              bottom: MARGIN_VERTICAL_TWIP,
              left: MARGIN_SIDE_TWIP,
              right: MARGIN_SIDE_TWIP,
            },
            pageNumbers: { start: 1 },
          },
        },
        headers: { default: contentHeader },
        footers: { default: contentFooter },
        children: chapterChildren,
      },
      {
        properties: {
          type: SectionType.NEXT_PAGE,
          page: {
            size: { width: PAGE_WIDTH_TWIP, height: PAGE_HEIGHT_TWIP },
            margin: {
              top: MARGIN_VERTICAL_TWIP,
              bottom: MARGIN_VERTICAL_TWIP,
              left: MARGIN_SIDE_TWIP,
              right: MARGIN_SIDE_TWIP,
            },
          },
        },
        // Una sección sin `headers`/`footers` propios **hereda** los de la sección anterior
        // (comportamiento real de OOXML, no un bug de LibreOffice) — sin este override explícito
        // y vacío, la página de cierre salía con el header/footer de los capítulos.
        headers: { default: new Header({ children: [] }) },
        footers: { default: new Footer({ children: [] }) },
        children: closingChildren,
      },
    ],
  })

  return Packer.toBuffer(doc)
}
