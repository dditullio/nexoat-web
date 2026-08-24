import { marked } from 'marked'
import * as QRCode from 'qrcode'

marked.setOptions({ breaks: true, gfm: true })

export interface EbookPdfData {
  title: string
  subtitle: string | null
  coverImage: string | null
  /** Markdown del libro — mismo campo que WelcomeEbook.content. */
  content: string
  recipientName: string
  recipientEmail: string
  /** Si viene, se agrega una página final con QR hacia acá. */
  storeUrl: string | null
}

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string
  )
}

/**
 * HTML standalone (con <style> embebido) para convertir vía Gotenberg —
 * no reusa las plantillas de mail/templates/, que son para clientes de
 * correo, no para un motor de PDF con Chromium detrás. Fuentes: Georgia y
 * Arial (mismo criterio de portabilidad que ya usan las plantillas de
 * mail, en vez de embeber Fraunces/Karla como @font-face en base64 —
 * Gotenberg no tiene por qué salir a Google Fonts en el momento de
 * generar). El contenido Markdown viene de un ADMIN/SUPER_ADMIN (mismo
 * nivel de confianza que Article.content, que tampoco se sanitiza en el
 * backend) — no se pasa por DOMPurify acá.
 */
export async function buildEbookPdfHtml(data: EbookPdfData): Promise<string> {
  const contentHtml = marked.parse(data.content, { async: false }) as string
  const qrDataUri = data.storeUrl
    ? await QRCode.toDataURL(data.storeUrl, { margin: 1, width: 240 })
    : null

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<style>
  @page { margin: 0; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: Georgia, 'Times New Roman', serif; color: #2b2318; }
  .page {
    page-break-after: always;
    padding: 64px 60px;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }
  .page:last-child { page-break-after: auto; }
  .cover {
    background: linear-gradient(180deg, #f4efe6 0%, #e9e0cf 100%);
    align-items: center;
    justify-content: center;
    text-align: center;
  }
  .cover img {
    max-width: 65%;
    max-height: 55vh;
    border-radius: 8px;
    box-shadow: 0 24px 48px rgba(20, 16, 12, 0.25);
    margin-bottom: 36px;
    object-fit: cover;
  }
  .cover h1 { font-size: 32px; margin: 0 0 10px; line-height: 1.25; }
  .cover h2 { font-size: 18px; font-weight: 400; color: #6b5f4a; margin: 0; }
  .dedication { align-items: center; justify-content: center; text-align: center; }
  .dedication p { font-size: 17px; line-height: 1.8; max-width: 460px; margin: 0 auto; }
  .dedication .name { font-size: 23px; font-weight: 700; margin-top: 28px; }
  .dedication .email {
    font-size: 13px;
    color: #8a7f68;
    margin-top: 4px;
    font-family: Arial, sans-serif;
  }
  .content { font-size: 15px; line-height: 1.75; }
  .content h1, .content h2, .content h3 { font-family: Georgia, serif; margin-top: 1.4em; }
  .content p { margin: 0 0 1em; }
  .qr-page { align-items: center; justify-content: center; text-align: center; }
  .qr-page img { width: 200px; height: 200px; }
  .qr-page p {
    font-family: Arial, sans-serif;
    font-size: 13px;
    color: #6b5f4a;
    margin-top: 18px;
    max-width: 320px;
  }
</style>
</head>
<body>
  <section class="page cover">
    ${data.coverImage ? `<img src="${escapeHtml(data.coverImage)}" alt="" />` : ''}
    <h1>${escapeHtml(data.title)}</h1>
    ${data.subtitle ? `<h2>${escapeHtml(data.subtitle)}</h2>` : ''}
  </section>

  <section class="page dedication">
    <p>Este ejemplar fue preparado especialmente como regalo de bienvenida a NexoAT para</p>
    <p class="name">${escapeHtml(data.recipientName)}</p>
    <p class="email">${escapeHtml(data.recipientEmail)}</p>
  </section>

  <section class="page content">${contentHtml}</section>

  ${
    qrDataUri
      ? `<section class="page qr-page">
    <img src="${qrDataUri}" alt="" />
    <p>Escaneá el código para ver este y otros títulos en la tienda de NexoAT.</p>
  </section>`
      : ''
  }
</body>
</html>`
}
