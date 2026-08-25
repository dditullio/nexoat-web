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
 * Cliente de Gotenberg (Fase 3, ver docs/features/welcome-ebook-gift.md): convierte un `.docx`
 * ya armado (`ebook-docx.builder.ts`) a PDF vía `forms/libreoffice/convert` — LibreOffice viene
 * instalado de fábrica en `gotenberg/gotenberg:8`, no hace falta ningún servicio nuevo.
 * Reemplaza al render HTML→PDF vía Chromium de la Fase 2 (`forms/chromium/convert/html`): ya no
 * hace falta un header/footer HTML aparte ni pasar tamaño de página — todo eso vive dentro del
 * propio `.docx` (secciones, header/footer nativos, tamaño A4).
 *
 * Sin `GOTENBERG_URL` configurada, o si Gotenberg no responde, `render()` devuelve `null` en vez
 * de lanzar — mismo criterio que MailService con RESEND_API_KEY: la generación del PDF nunca
 * debe tirar abajo el `claim()` del regalo.
 */
@Injectable()
export class PdfRenderService {
  private readonly logger = new Logger(PdfRenderService.name)
  private readonly url = process.env.GOTENBERG_URL

  async render(docxBuffer: Buffer): Promise<Buffer | null> {
    if (!this.url) {
      this.logger.warn('GOTENBERG_URL no configurada — no se puede generar el PDF')
      return null
    }

    try {
      const formData = new FormData()
      formData.append(
        'files',
        new Blob([docxBuffer], {
          type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        }),
        'ebook.docx'
      )

      const res = await fetch(`${this.url}/forms/libreoffice/convert`, {
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
