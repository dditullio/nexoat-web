import { Test, type TestingModule } from '@nestjs/testing'
import { AppService } from './app.service'

describe('AppService', () => {
  let service: AppService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AppService],
    }).compile()

    service = module.get<AppService>(AppService)
  })

  describe('healthCheck', () => {
    it('devuelve status ok', () => {
      const result = service.healthCheck()
      expect(result.status).toBe('ok')
    })

    it('incluye un timestamp ISO válido', () => {
      const result = service.healthCheck()
      expect(() => new Date(result.timestamp)).not.toThrow()
      expect(new Date(result.timestamp).toISOString()).toBe(result.timestamp)
    })
  })
})
