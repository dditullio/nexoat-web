// Plantilla del email de bienvenida — primer caso de uso real de
// MailService (ver docs/features/email-provider-resend.md, fase 1). HTML
// simple con estilos inline (necesario en email, la mayoría de los
// clientes ignora <style> en el <head>) — no reusa el sistema de diseño del
// sitio tal cual, solo su paleta base, para no arrastrar CSS que no
// funciona en clientes de correo.
//
// Se manda siempre a un usuario ya verificado (OAuth: lo verifica el
// proveedor; email: lo verifica completeSignup en el mismo paso, ver
// docs/features/email-first-signup-and-onboarding.md) — no lleva botón de
// "confirmá tu email" como llegó a tener cuando el registro por email era
// de un solo paso.
export function welcomeEmailHtml(name?: string): string {
  const greeting = name ? `Hola, ${name}` : 'Hola'

  return `
<div style="background:#f4efe6;padding:32px 16px;font-family:Georgia,'Times New Roman',serif;">
  <div style="max-width:480px;margin:0 auto;background:#fffdfa;border-radius:16px;padding:32px 28px;border:1px solid #e6ddcc;">
    <p style="font-size:22px;font-weight:700;color:#3d3120;margin:0 0 24px;">
      Nexo<span style="color:#7a8a5c;">AT</span>
    </p>
    <h1 style="font-size:20px;color:#2b2318;margin:0 0 16px;">${greeting}, ¡bienvenido/a a NexoAT!</h1>
    <p style="font-size:15px;line-height:1.6;color:#4a4030;margin:0 0 16px;font-family:Arial,sans-serif;">
      Tu cuenta ya está lista. Desde ahora vas a poder acceder a los artículos de nivel
      registrado sin costo, guardar los que quieras leer más tarde y llevar un historial de
      lectura.
    </p>
    <p style="font-size:15px;line-height:1.6;color:#4a4030;margin:0 0 24px;font-family:Arial,sans-serif;">
      Gracias por sumarte al acompañamiento terapéutico y el cuidado de personas.
    </p>
    <a href="https://nexoat.com" style="display:inline-block;background:#7a8a5c;color:#fffdfa;text-decoration:none;font-family:Arial,sans-serif;font-weight:700;font-size:14px;padding:12px 22px;border-radius:999px;">
      Ir a NexoAT
    </a>
  </div>
</div>`.trim()
}
