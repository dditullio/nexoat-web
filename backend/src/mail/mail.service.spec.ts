const sendMock = jest.fn()

jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: { send: (...args: unknown[]) => sendMock(...args) },
  })),
}))

// Import después del mock — MailService instancia `new Resend()` en su
// constructor, necesita la versión mockeada ya instalada.
import { MailService } from './mail.service'

describe('MailService', () => {
  const originalEnv = process.env

  beforeEach(() => {
    sendMock.mockReset()
    process.env = { ...originalEnv }
  })

  afterAll(() => {
    process.env = originalEnv
  })

  it('sin RESEND_API_KEY, no llama al SDK (no-op, solo loguea)', async () => {
    delete process.env.RESEND_API_KEY
    const service = new MailService()

    await service.send('lector@ejemplo.com', 'Asunto', '<p>Hola</p>')

    expect(sendMock).not.toHaveBeenCalled()
  })

  it('con RESEND_API_KEY, manda el email con el remitente configurado', async () => {
    process.env.RESEND_API_KEY = 'test-key'
    process.env.RESEND_FROM_EMAIL = 'NexoAT <notificaciones@nexoat.com>'
    sendMock.mockResolvedValue({ data: { id: 'abc' }, error: null })
    const service = new MailService()

    await service.send('lector@ejemplo.com', 'Asunto', '<p>Hola</p>')

    expect(sendMock).toHaveBeenCalledWith({
      from: 'NexoAT <notificaciones@nexoat.com>',
      to: 'lector@ejemplo.com',
      subject: 'Asunto',
      html: '<p>Hola</p>',
    })
  })

  it('nunca lanza, ni si el SDK devuelve un error en el body', async () => {
    process.env.RESEND_API_KEY = 'test-key'
    sendMock.mockResolvedValue({ data: null, error: { message: 'dominio no verificado' } })
    const service = new MailService()

    await expect(
      service.send('lector@ejemplo.com', 'Asunto', '<p>Hola</p>')
    ).resolves.toBeUndefined()
  })

  it('nunca lanza, ni si el SDK rechaza la promesa', async () => {
    process.env.RESEND_API_KEY = 'test-key'
    sendMock.mockRejectedValue(new Error('timeout'))
    const service = new MailService()

    await expect(
      service.send('lector@ejemplo.com', 'Asunto', '<p>Hola</p>')
    ).resolves.toBeUndefined()
  })
})
