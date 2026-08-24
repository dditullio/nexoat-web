// Usado solo por el reenvío (AuthService.resendVerificationEmail) — el
// email de bienvenida (welcome.template.ts) ya incluye este mismo botón la
// primera vez, no hace falta repetir todo ese contenido acá.
export function verifyEmailHtml(verifyUrl: string): string {
  return `
<div style="background:#f4efe6;padding:32px 16px;font-family:Georgia,'Times New Roman',serif;">
  <div style="max-width:480px;margin:0 auto;background:#fffdfa;border-radius:16px;padding:32px 28px;border:1px solid #e6ddcc;">
    <p style="font-size:22px;font-weight:700;color:#3d3120;margin:0 0 24px;">
      Nexo<span style="color:#7a8a5c;">AT</span>
    </p>
    <h1 style="font-size:20px;color:#2b2318;margin:0 0 16px;">Confirmá tu email</h1>
    <p style="font-size:15px;line-height:1.6;color:#4a4030;margin:0 0 24px;font-family:Arial,sans-serif;">
      Hacé clic en el botón para confirmar tu email en NexoAT — el link vence en 24 horas.
    </p>
    <a href="${verifyUrl}" style="display:inline-block;background:#7a8a5c;color:#fffdfa;text-decoration:none;font-family:Arial,sans-serif;font-weight:700;font-size:14px;padding:12px 22px;border-radius:999px;">
      Confirmá tu email
    </a>
  </div>
</div>`.trim()
}
