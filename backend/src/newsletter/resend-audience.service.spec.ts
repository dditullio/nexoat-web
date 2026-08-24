const createMock = jest.fn()
const updateMock = jest.fn()

jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({
    contacts: {
      create: (...args: unknown[]) => createMock(...args),
      update: (...args: unknown[]) => updateMock(...args),
    },
  })),
}))

// Import después del mock — mismo motivo que MediaService/MailService.
import { ResendAudienceService } from './resend-audience.service'

describe('ResendAudienceService', () => {
  const originalEnv = process.env

  beforeEach(() => {
    createMock.mockReset()
    updateMock.mockReset()
    process.env = { ...originalEnv, RESEND_API_KEY: 'key', RESEND_AUDIENCE_ID: 'aud-1' }
  })

  afterAll(() => {
    process.env = originalEnv
  })

  describe('sin configuración', () => {
    it('upsertSubscribed no llama al SDK y devuelve el id existente tal cual', async () => {
      delete process.env.RESEND_API_KEY
      const service = new ResendAudienceService()

      const result = await service.upsertSubscribed('x@x.com', 'contact-1')

      expect(result).toBe('contact-1')
      expect(createMock).not.toHaveBeenCalled()
    })

    it('markUnsubscribed no llama al SDK', async () => {
      delete process.env.RESEND_AUDIENCE_ID
      const service = new ResendAudienceService()

      await service.markUnsubscribed('x@x.com', 'contact-1')

      expect(updateMock).not.toHaveBeenCalled()
    })
  })

  describe('upsertSubscribed', () => {
    it('crea un contacto nuevo con el segmento de la audiencia si no había resendContactId', async () => {
      createMock.mockResolvedValue({ data: { id: 'contact-nuevo' }, error: null })
      const service = new ResendAudienceService()

      const result = await service.upsertSubscribed('x@x.com', null)

      expect(createMock).toHaveBeenCalledWith({
        email: 'x@x.com',
        segments: [{ id: 'aud-1' }],
      })
      expect(result).toBe('contact-nuevo')
    })

    it('reactiva (update) en vez de crear si ya había un resendContactId', async () => {
      updateMock.mockResolvedValue({ data: { id: 'contact-1' }, error: null })
      const service = new ResendAudienceService()

      const result = await service.upsertSubscribed('x@x.com', 'contact-1')

      expect(updateMock).toHaveBeenCalledWith({ id: 'contact-1', unsubscribed: false })
      expect(createMock).not.toHaveBeenCalled()
      expect(result).toBe('contact-1')
    })

    it('si el SDK falla, devuelve el id existente sin lanzar', async () => {
      updateMock.mockRejectedValue(new Error('timeout'))
      const service = new ResendAudienceService()

      const result = await service.upsertSubscribed('x@x.com', 'contact-1')

      expect(result).toBe('contact-1')
    })

    it('si el SDK falla al crear (sin id previo), devuelve undefined sin lanzar', async () => {
      createMock.mockRejectedValue(new Error('timeout'))
      const service = new ResendAudienceService()

      const result = await service.upsertSubscribed('x@x.com', null)

      expect(result).toBeUndefined()
    })
  })

  describe('markUnsubscribed', () => {
    it('actualiza por id si hay resendContactId', async () => {
      updateMock.mockResolvedValue({ data: {}, error: null })
      const service = new ResendAudienceService()

      await service.markUnsubscribed('x@x.com', 'contact-1')

      expect(updateMock).toHaveBeenCalledWith({ id: 'contact-1', unsubscribed: true })
    })

    it('actualiza por email si no hay resendContactId guardado', async () => {
      updateMock.mockResolvedValue({ data: {}, error: null })
      const service = new ResendAudienceService()

      await service.markUnsubscribed('x@x.com', null)

      expect(updateMock).toHaveBeenCalledWith({ email: 'x@x.com', unsubscribed: true })
    })

    it('nunca lanza si el SDK falla', async () => {
      updateMock.mockRejectedValue(new Error('timeout'))
      const service = new ResendAudienceService()

      await expect(service.markUnsubscribed('x@x.com', 'contact-1')).resolves.toBeUndefined()
    })
  })
})
