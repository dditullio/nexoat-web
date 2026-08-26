import { Injectable } from '@nestjs/common'
import { ArticleStatus } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'

// Rutas estáticas públicas con valor de indexación — no todo lo que existe
// en el router del frontend (login, mi-cuenta, admin, etc. quedan afuera
// tanto acá como en robots.txt, ver docs/features/seo.md).
const STATIC_ROUTES = ['/', '/acerca-de', '/buscar', '/planes', '/terminos']

interface SitemapUrl {
  loc: string
  lastmod?: string
}

@Injectable()
export class SitemapService {
  constructor(private readonly prisma: PrismaService) {}

  async buildXml(siteUrl: string): Promise<string> {
    const base = siteUrl.replace(/\/$/, '')

    const [categories, articles] = await Promise.all([
      this.prisma.category.findMany({ select: { slug: true, updatedAt: true } }),
      // Sin filtrar por scope visible a propósito: un artículo restringido
      // igual conviene indexarlo (Google ve el contenido recortado que ve
      // cualquier visitante anónimo, no algo oculto). Ver docs/features/seo.md.
      this.prisma.article.findMany({
        where: { status: ArticleStatus.publicado },
        select: { slug: true, updatedAt: true },
      }),
    ])

    const urls: SitemapUrl[] = [
      ...STATIC_ROUTES.map((path) => ({ loc: `${base}${path}` })),
      ...categories.map((c) => ({
        loc: `${base}/categoria/${c.slug}`,
        lastmod: c.updatedAt.toISOString(),
      })),
      ...articles.map((a) => ({
        loc: `${base}/articulo/${a.slug}`,
        lastmod: a.updatedAt.toISOString(),
      })),
    ]

    const body = urls
      .map(
        (u) =>
          `  <url>\n    <loc>${escapeXml(u.loc)}</loc>${
            u.lastmod ? `\n    <lastmod>${u.lastmod}</lastmod>` : ''
          }\n  </url>`
      )
      .join('\n')

    return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`
  }
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}
