// Mismo lenguaje visual que welcome.template.ts — ver ese archivo para el
// porqué de los estilos inline.
export function resetPasswordEmailHtml(resetUrl: string): string {
  return `
<div style="background:#f4efe6;padding:32px 16px;font-family:Georgia,'Times New Roman',serif;">
  <div style="max-width:480px;margin:0 auto;background:#fffdfa;border-radius:16px;padding:32px 28px;border:1px solid #e6ddcc;">
    <p style="font-size:22px;font-weight:700;color:#3d3120;margin:0 0 24px;">
      Nexo<span style="color:#7a8a5c;">AT</span>
    </p>
    <h1 style="font-size:20px;color:#2b2318;margin:0 0 16px;">Restablecé tu contraseña</h1>
    <p style="font-size:15px;line-height:1.6;color:#4a4030;margin:0 0 16px;font-family:Arial,sans-serif;">
      Pediste restablecer la contraseña de tu cuenta en NexoAT. Hacé clic en el botón para elegir
      una nueva — el link vence en 1 hora.
    </p>
    <a href="${resetUrl}" style="display:inline-block;background:#7a8a5c;color:#fffdfa;text-decoration:none;font-family:Arial,sans-serif;font-weight:700;font-size:14px;padding:12px 22px;border-radius:999px;">
      Elegir nueva contraseña
    </a>
    <p style="font-size:13px;line-height:1.6;color:#7a6f5c;margin:24px 0 0;font-family:Arial,sans-serif;">
      Si no pediste este cambio, ignorá este email — tu contraseña actual sigue funcionando igual.
    </p>
  </div>
</div>`.trim()
}
