import { Injectable, Logger } from '@nestjs/common'
import { Resend } from 'resend'

// El SDK de Resend a veces rechaza con un objeto plano, no con una
// instancia de Error — mismo motivo/patrón que MediaService.
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
 * Envío de email vía Resend — ver docs/features/email-provider-resend.md.
 * Sin `RESEND_API_KEY` configurada, cae de vuelta al no-op original
 * (loguea en vez de enviar): no rompe el desarrollo local de quien no tiene
 * cuenta de Resend propia, y evita que un típo o un .env incompleto tire
 * abajo el arranque del backend.
 *
 * `send` nunca lanza — un email que falla se loguea como error y sigue
 * (ningún flujo del sitio, ni siquiera uno futuro de verificación/reset,
 * debería quedar bloqueado porque el proveedor de email tuvo un hipo).
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name)
  private readonly resend: Resend | null
  private readonly from: string

  constructor() {
    const apiKey = process.env.RESEND_API_KEY
    this.resend = apiKey ? new Resend(apiKey) : null
    this.from = process.env.RESEND_FROM_EMAIL || 'NexoAT <onboarding@resend.dev>'

    if (!this.resend) {
      this.logger.warn(
        'RESEND_API_KEY no configurada — los emails se van a loguear en vez de enviarse de verdad'
      )
    }
  }

  /**
   * `html` — los callers arman el contenido con las plantillas de
   * mail/templates/. `text` es opcional: una alternativa en texto plano
   * mejora cómo tratan el email varios filtros de spam (multipart real, no
   * solo HTML) — se usa en los envíos donde más importa la entrega (ej.
   * activación de cuenta). Sin `text`, Resend arma el email solo con HTML,
   * como hacía antes.
   */
  async send(to: string, subject: string, html: string, text?: string): Promise<void> {
    if (!this.resend) {
      this.logger.log(`[mail no-op] para=${to} asunto="${subject}"\n${html}`)
      return
    }

    try {
      const { error } = await this.resend.emails.send({
        from: this.from,
        to,
        subject,
        html,
        ...(text ? { text } : {}),
      })
      if (error) {
        this.logger.error(`No se pudo enviar el email a ${to}: ${error.message}`)
      }
    } catch (error) {
      this.logger.error(`No se pudo enviar el email a ${to}: ${describeError(error)}`)
    }
  }
}
