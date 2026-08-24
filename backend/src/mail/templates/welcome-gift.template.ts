// Se manda al elegir el ebook de regalo del onboarding (ver
// docs/features/welcome-ebook-gift.md) — no lleva el PDF adjunto, el botón
// lleva a /mi-cuenta/regalo (requiere sesión) y desde ahí se descarga vía
// GET /gifts/download. Mismo estilo inline que welcome.template.ts.
export function welcomeGiftEmailHtml(ebookTitle: string, giftUrl: string): string {
  return `
<div style="background:#f4efe6;padding:32px 16px;font-family:Georgia,'Times New Roman',serif;">
  <div style="max-width:480px;margin:0 auto;background:#fffdfa;border-radius:16px;padding:32px 28px;border:1px solid #e6ddcc;">
    <p style="font-size:22px;font-weight:700;color:#3d3120;margin:0 0 24px;">
      Nexo<span style="color:#7a8a5c;">AT</span>
    </p>
    <h1 style="font-size:20px;color:#2b2318;margin:0 0 16px;">Tu regalo de bienvenida está listo 🎁</h1>
    <p style="font-size:15px;line-height:1.6;color:#4a4030;margin:0 0 8px;font-family:Arial,sans-serif;">
      Elegiste <strong>${ebookTitle}</strong>. Podés descargarlo cuando quieras desde tu cuenta.
    </p>
    <p style="font-size:15px;line-height:1.6;color:#4a4030;margin:0 0 24px;font-family:Arial,sans-serif;">
      Gracias por sumarte al acompañamiento terapéutico y el cuidado de personas.
    </p>
    <a href="${giftUrl}" style="display:inline-block;background:#7a8a5c;color:#fffdfa;text-decoration:none;font-family:Arial,sans-serif;font-weight:700;font-size:14px;padding:12px 22px;border-radius:999px;">
      Descargar mi ebook
    </a>
  </div>
</div>`.trim()
}
