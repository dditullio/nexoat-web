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

  async render(html: string): Promise<Buffer | null> {
    if (!this.url) {
      this.logger.warn('GOTENBERG_URL no configurada — no se puede generar el PDF')
      return null
    }

    try {
      const formData = new FormData()
      // Gotenberg exige que el archivo principal se llame literalmente
      // "index.html" dentro del multipart.
      formData.append('files', new Blob([html], { type: 'text/html' }), 'index.html')

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
