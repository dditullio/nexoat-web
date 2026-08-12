import { InternalServerErrorException } from '@nestjs/common'

const destroyMock = jest.fn()
const uploadMock = jest.fn()

jest.mock('cloudinary', () => ({
  v2: {
    config: jest.fn(),
    uploader: {
      upload: (...args: unknown[]) => uploadMock(...args),
      destroy: (...args: unknown[]) => destroyMock(...args),
    },
  },
}))

// Import después del mock — MediaService hace `cloudinary.config()` en su
// constructor, necesita la versión mockeada ya instalada.
import { MediaService } from './media.service'

describe('MediaService', () => {
  let service: MediaService

  beforeEach(() => {
    destroyMock.mockReset()
    uploadMock.mockReset()
    service = new MediaService()
  })

  describe('delete', () => {
    it('rechaza un publicId fuera de la carpeta del proyecto sin llamar a Cloudinary', async () => {
      await expect(service.delete('otra-carpeta/foo')).rejects.toThrow(InternalServerErrorException)
      expect(destroyMock).not.toHaveBeenCalled()
    })

    it('borra un publicId dentro de la carpeta del proyecto', async () => {
      destroyMock.mockResolvedValue({ result: 'ok' })
      await service.delete('nexoat/articles/abc123')
      expect(destroyMock).toHaveBeenCalledWith('nexoat/articles/abc123', { resource_type: 'image' })
    })

    it('borra un publicId dentro de la carpeta de categorías', async () => {
      destroyMock.mockResolvedValue({ result: 'ok' })
      await service.delete('nexoat/categories/abc123')
      expect(destroyMock).toHaveBeenCalledWith('nexoat/categories/abc123', {
        resource_type: 'image',
      })
    })
  })

  describe('upload', () => {
    it('sube como data URI (no streaming) y resuelve con url/publicId', async () => {
      uploadMock.mockResolvedValue({
        secure_url: 'https://res.cloudinary.com/x/y.jpg',
        public_id: 'nexoat/articles/y',
      })

      const result = await service.upload(Buffer.from('fake-image'), 'image/png')

      expect(result).toEqual({
        url: 'https://res.cloudinary.com/x/y.jpg',
        publicId: 'nexoat/articles/y',
      })
      const [dataUri, options] = uploadMock.mock.calls[0]
      expect(dataUri).toMatch(/^data:image\/png;base64,/)
      expect(options).toEqual({ folder: 'nexoat/articles', resource_type: 'image' })
    })

    it('sube a la carpeta indicada cuando se pasa folder', async () => {
      uploadMock.mockResolvedValue({
        secure_url: 'https://res.cloudinary.com/x/y.jpg',
        public_id: 'nexoat/categories/y',
      })

      await service.upload(Buffer.from('fake-image'), 'image/png', 'categories')

      const [, options] = uploadMock.mock.calls[0]
      expect(options).toEqual({ folder: 'nexoat/categories', resource_type: 'image' })
    })

    it('envuelve un error de Cloudinary en InternalServerErrorException', async () => {
      uploadMock.mockRejectedValue({ message: 'cloudinary caído' })

      await expect(service.upload(Buffer.from('fake-image'), 'image/png')).rejects.toThrow(
        InternalServerErrorException
      )
    })
  })
})
