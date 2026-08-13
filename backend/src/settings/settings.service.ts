import { Injectable } from '@nestjs/common'
import { ArticleScope, type User } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import { AuditService } from '../audit/audit.service'

const SETTINGS_ID = 'singleton'

// "publico" nunca es togglable — se muestra siempre, sin importar la
// configuración guardada. Solo estos tres pueden prenderse/apagarse desde
// el admin.
export const TOGGLEABLE_SCOPES = [
  ArticleScope.suscriptores_nivel_1,
  ArticleScope.suscriptores_nivel_2,
  ArticleScope.suscriptores_nivel_3,
] as const

@Injectable()
export class SettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService
  ) {}

  /** Crea la fila singleton con los valores por defecto del schema si todavía no existe. */
  async getSiteSettings() {
    return this.prisma.siteSettings.upsert({
      where: { id: SETTINGS_ID },
      update: {},
      create: { id: SETTINGS_ID },
    })
  }

  async updateVisibleScopes(scopes: ArticleScope[], actor: User) {
    // Filtra "publico" si viniera en el body (no rompe nada dejarlo pasar,
    // pero tampoco tiene sentido guardarlo — nunca se lee esa entrada).
    const deduped = Array.from(new Set(scopes.filter((s) => s !== ArticleScope.publico)))

    const updated = await this.prisma.siteSettings.upsert({
      where: { id: SETTINGS_ID },
      update: { visibleArticleScopes: deduped },
      create: { id: SETTINGS_ID, visibleArticleScopes: deduped },
    })

    await this.audit.record({
      actorId: actor.id,
      action: 'settings.update',
      entityType: 'SiteSettings',
      entityId: SETTINGS_ID,
      metadata: { visibleArticleScopes: deduped },
    })

    return updated
  }

  /**
   * Scopes que el sitio público puede listar/servir ahora mismo — "publico"
   * incluido siempre. Lo consume ArticlesService para filtrar el listado y
   * el detalle público; el admin nunca pasa por acá (ve todo, sin filtrar).
   */
  async getVisiblePublicScopes(): Promise<ArticleScope[]> {
    const settings = await this.getSiteSettings()
    return [ArticleScope.publico, ...settings.visibleArticleScopes]
  }
}
