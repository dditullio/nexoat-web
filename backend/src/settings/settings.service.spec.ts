import { Test } from '@nestjs/testing'
import { ArticleScope, type User } from '@prisma/client'
import { SettingsService } from './settings.service'
import { PrismaService } from '../prisma/prisma.service'
import { AuditService } from '../audit/audit.service'

describe('SettingsService', () => {
  let service: SettingsService
  let prisma: { siteSettings: { upsert: jest.Mock } }
  let audit: { record: jest.Mock }

  const actor = { id: 'admin-1' } as User

  beforeEach(async () => {
    prisma = { siteSettings: { upsert: jest.fn() } }
    audit = { record: jest.fn() }

    const module = await Test.createTestingModule({
      providers: [
        SettingsService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: audit },
      ],
    }).compile()

    service = module.get(SettingsService)
  })

  describe('getSiteSettings', () => {
    it('crea la fila singleton con los valores por defecto si no existe', async () => {
      prisma.siteSettings.upsert.mockResolvedValue({
        id: 'singleton',
        visibleArticleScopes: [ArticleScope.suscriptores_nivel_1],
      })

      await service.getSiteSettings()

      expect(prisma.siteSettings.upsert).toHaveBeenCalledWith({
        where: { id: 'singleton' },
        update: {},
        create: { id: 'singleton' },
      })
    })
  })

  describe('updateVisibleScopes', () => {
    it('guarda los scopes, descarta "publico" y audita "settings.update"', async () => {
      prisma.siteSettings.upsert.mockResolvedValue({
        id: 'singleton',
        visibleArticleScopes: [
          ArticleScope.suscriptores_nivel_1,
          ArticleScope.suscriptores_nivel_2,
        ],
      })

      await service.updateVisibleScopes(
        [
          ArticleScope.publico,
          ArticleScope.suscriptores_nivel_1,
          ArticleScope.suscriptores_nivel_2,
        ],
        actor
      )

      expect(prisma.siteSettings.upsert).toHaveBeenCalledWith({
        where: { id: 'singleton' },
        update: {
          visibleArticleScopes: [
            ArticleScope.suscriptores_nivel_1,
            ArticleScope.suscriptores_nivel_2,
          ],
        },
        create: {
          id: 'singleton',
          visibleArticleScopes: [
            ArticleScope.suscriptores_nivel_1,
            ArticleScope.suscriptores_nivel_2,
          ],
        },
      })
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ actorId: 'admin-1', action: 'settings.update' })
      )
    })

    it('deduplica scopes repetidos', async () => {
      prisma.siteSettings.upsert.mockResolvedValue({
        id: 'singleton',
        visibleArticleScopes: [ArticleScope.suscriptores_nivel_1],
      })

      await service.updateVisibleScopes(
        [ArticleScope.suscriptores_nivel_1, ArticleScope.suscriptores_nivel_1],
        actor
      )

      const call = prisma.siteSettings.upsert.mock.calls[0][0]
      expect(call.update.visibleArticleScopes).toEqual([ArticleScope.suscriptores_nivel_1])
    })
  })

  describe('getVisiblePublicScopes', () => {
    it('siempre incluye "publico" además de lo guardado', async () => {
      prisma.siteSettings.upsert.mockResolvedValue({
        id: 'singleton',
        visibleArticleScopes: [ArticleScope.suscriptores_nivel_1],
      })

      const result = await service.getVisiblePublicScopes()

      expect(result).toEqual([ArticleScope.publico, ArticleScope.suscriptores_nivel_1])
    })
  })
})
