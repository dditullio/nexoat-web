// Se manda en vez del email de activación cuando alguien pide el alta con
// un email que ya tiene cuenta completa — la respuesta HTTP es idéntica en
// los dos casos (anti-enumeración, ver AuthService.requestSignup), la
// diferencia solo la ve quien de verdad es dueño de esa casilla.
export function alreadyRegisteredEmailHtml(loginUrl: string, forgotPasswordUrl: string): string {
  return `
<div style="background:#f4efe6;padding:32px 16px;font-family:Georgia,'Times New Roman',serif;">
  <div style="max-width:480px;margin:0 auto;background:#fffdfa;border-radius:16px;padding:32px 28px;border:1px solid #e6ddcc;">
    <p style="font-size:22px;font-weight:700;color:#3d3120;margin:0 0 24px;">
      Nexo<span style="color:#7a8a5c;">AT</span>
    </p>
    <h1 style="font-size:20px;color:#2b2318;margin:0 0 16px;">Ya tenés una cuenta</h1>
    <p style="font-size:15px;line-height:1.6;color:#4a4030;margin:0 0 24px;font-family:Arial,sans-serif;">
      Alguien intentó crear una cuenta en NexoAT con este email, pero ya existe una. Si fuiste vos,
      podés ingresar directo o recuperar tu contraseña si no la recordás.
    </p>
    <a href="${loginUrl}" style="display:inline-block;background:#7a8a5c;color:#fffdfa;text-decoration:none;font-family:Arial,sans-serif;font-weight:700;font-size:14px;padding:12px 22px;border-radius:999px;margin-right:10px;">
      Ingresar
    </a>
    <a href="${forgotPasswordUrl}" style="display:inline-block;color:#7a8a5c;text-decoration:underline;font-family:Arial,sans-serif;font-weight:700;font-size:14px;">
      Recuperar contraseña
    </a>
    <p style="font-size:13px;line-height:1.6;color:#7a6f5c;margin:24px 0 0;font-family:Arial,sans-serif;">
      Si no fuiste vos, podés ignorar este email — tu cuenta sigue igual de segura.
    </p>
  </div>
</div>`.trim()
}
