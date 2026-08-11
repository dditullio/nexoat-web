import { Injectable, Logger } from '@nestjs/common'

/**
 * Única implementación por ahora: no-op que loguea en vez de enviar de
 * verdad. Punto de extensión para cuando haya proveedor de email (SES,
 * Resend, etc.) — verificación de cuenta y reset de contraseña por correo
 * quedan explícitamente fuera de alcance hasta entonces (ver
 * docs/features/auth-and-admin-dashboard.md).
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name)

  async send(to: string, subject: string, body: string): Promise<void> {
    this.logger.log(`[mail no-op] para=${to} asunto="${subject}"\n${body}`)
  }
}
