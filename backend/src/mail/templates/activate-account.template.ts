// Plantilla del email de activación — el paso más crítico de todo
// MailService: si este cae en spam, la persona ni siquiera puede terminar
// de crear la cuenta. Por eso: aviso explícito de revisar spam/promociones
// en el propio cuerpo del email (no solo en la UI), y una versión en texto
// plano (ver activateAccountEmailText) además del HTML — un email
// multipart real mejora cómo lo tratan varios filtros. Mismo lenguaje
// visual que welcome.template.ts.
export function activateAccountEmailHtml(activateUrl: string): string {
  return `
<div style="background:#f4efe6;padding:32px 16px;font-family:Georgia,'Times New Roman',serif;">
  <div style="max-width:480px;margin:0 auto;background:#fffdfa;border-radius:16px;padding:32px 28px;border:1px solid #e6ddcc;">
    <p style="font-size:22px;font-weight:700;color:#3d3120;margin:0 0 24px;">
      Nexo<span style="color:#7a8a5c;">AT</span>
    </p>
    <h1 style="font-size:20px;color:#2b2318;margin:0 0 16px;">Confirmá tu cuenta</h1>
    <p style="font-size:15px;line-height:1.6;color:#4a4030;margin:0 0 24px;font-family:Arial,sans-serif;">
      Pediste crear una cuenta en NexoAT. Hacé clic en el botón para confirmar tu email y elegir tu
      contraseña — el link vence en 24 horas.
    </p>
    <a href="${activateUrl}" style="display:inline-block;background:#7a8a5c;color:#fffdfa;text-decoration:none;font-family:Arial,sans-serif;font-weight:700;font-size:14px;padding:12px 22px;border-radius:999px;">
      Confirmar mi cuenta
    </a>
    <p style="font-size:13px;line-height:1.6;color:#7a6f5c;margin:24px 0 0;font-family:Arial,sans-serif;">
      ¿No ves este email en tu bandeja principal? Revisá también la carpeta de spam o promociones
      — a veces el primer correo de un remitente nuevo cae ahí.
    </p>
    <p style="font-size:13px;line-height:1.6;color:#7a6f5c;margin:12px 0 0;font-family:Arial,sans-serif;">
      Si no pediste esto, ignorá este email — no se crea ninguna cuenta sin confirmar.
    </p>
  </div>
</div>`.trim()
}

export function activateAccountEmailText(activateUrl: string): string {
  return `Confirmá tu cuenta en NexoAT

Pediste crear una cuenta en NexoAT. Entrá al siguiente link para confirmar tu email y elegir tu contraseña (vence en 24 horas):

${activateUrl}

¿No ves este email en tu bandeja principal? Revisá también la carpeta de spam o promociones.

Si no pediste esto, ignorá este email — no se crea ninguna cuenta sin confirmar.`
}
