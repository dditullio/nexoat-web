import { Injectable, Logger } from '@nestjs/common'
import { Resend } from 'resend'

// El SDK de Resend a veces rechaza con un objeto plano, no con una
// instancia de Error — mismo patrón que MediaService/MailService.
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
 * Sincroniza `NewsletterSubscriber` con la audiencia de Resend (fase 3 de
 * docs/features/email-provider-resend.md). Se usa el campo `segments` del
 * SDK (no el `audienceId` legacy) — Resend está migrando de "Audiences" a
 * "Segments" y ambos apuntan al mismo recurso hoy, pero `segments` es la
 * forma no deprecada; confirmado en vivo contra la API real antes de
 * escribir esto.
 *
 * Igual criterio que MailService: sin `RESEND_API_KEY`/`RESEND_AUDIENCE_ID`
 * configuradas, todos los métodos son no-ops silenciosos — no rompe el dev
 * local sin cuenta propia. Ningún método lanza nunca: un fallo se loguea y
 * el caller (NewsletterService) sigue con el alta/baja local igual, la
 * sincronización con Resend nunca debe bloquear nada.
 */
@Injectable()
export class ResendAudienceService {
  private readonly logger = new Logger(ResendAudienceService.name)
  private readonly resend: Resend | null
  private readonly audienceId?: string

  constructor() {
    const apiKey = process.env.RESEND_API_KEY
    this.resend = apiKey ? new Resend(apiKey) : null
    this.audienceId = process.env.RESEND_AUDIENCE_ID

    if (!this.resend || !this.audienceId) {
      this.logger.warn(
        'RESEND_API_KEY o RESEND_AUDIENCE_ID no configuradas — el newsletter no se sincroniza con Resend'
      )
    }
  }

  private get enabled(): boolean {
    return !!(this.resend && this.audienceId)
  }

  /**
   * Da de alta o reactiva un contacto. Devuelve el `resendContactId` a
   * persistir — si ya había uno y la sincronización está apagada o falla,
   * devuelve el mismo id sin tocar (no lo pierde).
   */
  async upsertSubscribed(
    email: string,
    existingContactId: string | null
  ): Promise<string | undefined> {
    if (!this.enabled) return existingContactId ?? undefined

    try {
      if (existingContactId) {
        const { error } = await this.resend!.contacts.update({
          id: existingContactId,
          unsubscribed: false,
        })
        if (error) throw error
        return existingContactId
      }

      const { data, error } = await this.resend!.contacts.create({
        email,
        segments: [{ id: this.audienceId! }],
      })
      if (error) throw error
      return data?.id
    } catch (error) {
      this.logger.warn(
        `No se pudo sincronizar el alta de ${email} con Resend: ${describeError(error)}`
      )
      return existingContactId ?? undefined
    }
  }

  async markUnsubscribed(email: string, contactId: string | null): Promise<void> {
    if (!this.enabled) return

    try {
      const { error } = contactId
        ? await this.resend!.contacts.update({ id: contactId, unsubscribed: true })
        : await this.resend!.contacts.update({ email, unsubscribed: true })
      if (error) throw error
    } catch (error) {
      this.logger.warn(
        `No se pudo sincronizar la baja de ${email} con Resend: ${describeError(error)}`
      )
    }
  }
}
