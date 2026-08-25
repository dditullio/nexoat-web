import { Injectable, Logger } from '@nestjs/common'

// Mismo motivo/patrón que MailService/MediaService: a veces se rechaza con
// un objeto plano, no con una instancia de Error.
function describeError(error: unknown): string {
  if (error instanceof Error) return error.message
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message: unknown }).message)
  }
  try {
    return JSON.stringify(error)
  } catch {
    return String(error)
  }
}

export interface RenderOptions {
  /** HTML de encabezado/pie repetido en cada página — mecanismo nativo de Chromium (clases
   * `pageNumber`/`totalPages`/etc.), no de Gotenberg. Si se pasa alguno, Gotenberg activa
   * `displayHeaderFooter` solo. */
  headerHtml?: string
  footerHtml?: string
  /** Pulgadas — default de Gotenberg (1in) si no se especifica. */
  marginTop?: number
  marginBottom?: number
  /** Pulgadas — default de Gotenberg (Letter) si no se especifica. */
  paperWidth?: number
  paperHeight?: number
}

/**
 * Cliente de Gotenberg (HTML → PDF vía Chromium headless, ver
 * docs/features/welcome-ebook-gift.md, Fase 2). Sin `GOTENBERG_URL`
 * configurada, o si Gotenberg no responde, `render()` devuelve `null` en
 * vez de lanzar — mismo criterio que MailService con RESEND_API_KEY: la
 * generación del PDF nunca debe tirar abajo el `claim()` del regalo.
 */
@Injectable()
export class PdfRenderService {
  private readonly logger = new Logger(PdfRenderService.name)
  private readonly url = process.env.GOTENBERG_URL

  async render(html: string, options: RenderOptions = {}): Promise<Buffer | null> {
    if (!this.url) {
      this.logger.warn('GOTENBERG_URL no configurada — no se puede generar el PDF')
      return null
    }

    try {
      const formData = new FormData()
      // Gotenberg exige que el archivo principal se llame literalmente
      // "index.html" dentro del multipart — "header.html"/"footer.html" son
      // los nombres que reconoce para las plantillas de encabezado/pie.
      formData.append('files', new Blob([html], { type: 'text/html' }), 'index.html')
      if (options.headerHtml) {
        formData.append(
          'files',
          new Blob([options.headerHtml], { type: 'text/html' }),
          'header.html'
        )
      }
      if (options.footerHtml) {
        formData.append(
          'files',
          new Blob([options.footerHtml], { type: 'text/html' }),
          'footer.html'
        )
      }
      if (options.marginTop !== undefined) {
        formData.append('marginTop', String(options.marginTop))
      }
      if (options.marginBottom !== undefined) {
        formData.append('marginBottom', String(options.marginBottom))
      }
      if (options.paperWidth !== undefined) {
        formData.append('paperWidth', String(options.paperWidth))
      }
      if (options.paperHeight !== undefined) {
        formData.append('paperHeight', String(options.paperHeight))
      }

      const res = await fetch(`${this.url}/forms/chromium/convert/html`, {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const body = await res.text().catch(() => '')
        this.logger.error(`Gotenberg respondió ${res.status}: ${body.slice(0, 300)}`)
        return null
      }

      return Buffer.from(await res.arrayBuffer())
    } catch (error) {
      this.logger.error(`No se pudo generar el PDF vía Gotenberg: ${describeError(error)}`)
      return null
    }
  }
}
