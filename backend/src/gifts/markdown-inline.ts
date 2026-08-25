import { TextRun } from 'docx'

interface InlineRunProps {
  font?: string
  size?: number
  color?: string
  italics?: boolean
  bold?: boolean
}

/**
 * Convierte Markdown inline (**negrita**, *cursiva*, `código`) de una sola línea/párrafo en
 * `TextRun[]` de `docx`. No soporta anidamiento (`**_ambos_**`) ni enlaces — el contenido de los
 * ebooks (ver docs/features/welcome-ebook-gift.md) no los usa; si hiciera falta más adelante,
 * conviene un parser real en vez de extender esta regex a mano.
 */
export function parseInlineMarkdown(text: string, baseProps: InlineRunProps = {}): TextRun[] {
  const runs: TextRun[] = []
  const pattern = /\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`/g
  let lastIndex = 0
  let match: RegExpExecArray | null

  const pushPlain = (value: string) => {
    if (!value) return
    runs.push(new TextRun({ text: value, ...baseProps }))
  }

  while ((match = pattern.exec(text)) !== null) {
    pushPlain(text.slice(lastIndex, match.index))
    if (match[1] !== undefined) {
      runs.push(new TextRun({ text: match[1], bold: true, ...baseProps }))
    } else if (match[2] !== undefined) {
      runs.push(new TextRun({ text: match[2], italics: true, ...baseProps }))
    } else if (match[3] !== undefined) {
      runs.push(new TextRun({ text: match[3], font: 'Consolas', ...baseProps }))
    }
    lastIndex = pattern.lastIndex
  }
  pushPlain(text.slice(lastIndex))

  return runs.length > 0 ? runs : [new TextRun({ text: '', ...baseProps })]
}
