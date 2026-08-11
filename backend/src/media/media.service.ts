import { Injectable, InternalServerErrorException } from '@nestjs/common'
import { v2 as cloudinary, type UploadApiResponse } from 'cloudinary'

export interface UploadedMedia {
  url: string
  publicId: string
}

// Todas las imágenes del sitio conviven bajo esta carpeta en la cuenta de
// Cloudinary — evita que se mezclen con otros usos futuros de la misma
// cuenta (avatares, directorio de acompañantes, etc.).
const FOLDER = 'nexoat/articles'

export const ALLOWED_IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
])
// Usado tanto para el límite global de @fastify/multipart (main.ts) como
// para el mensaje de error del controller — mismo número, un solo lugar.
export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024

// El SDK de Cloudinary a veces rechaza con un objeto plano (ej.
// { message, http_code }), no con una instancia de Error — un template
// string sobre eso da "[object Object]" sin esto.
function describeError(error: unknown): string {
  if (error instanceof Error) return error.message
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message: unknown }).message)
  }
  try {
    return JSON.stringify(error)
  } catch {
    return String(error)
  }
}

@Injectable()
export class MediaService {
  constructor() {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    })
  }

  // Buffereado (data URI), no `upload_stream`: en este entorno la variante
  // por stream (POST chunked) se cuelga hasta hacer timeout aunque las
  // credenciales sean correctas — probado a mano contra la API de
  // Cloudinary. Como el archivo ya está entero en memoria (tope 5MB, ver
  // MAX_IMAGE_SIZE_BYTES) no hay ninguna ventaja real en streamearlo.
  async upload(buffer: Buffer, mimetype: string): Promise<UploadedMedia> {
    const dataUri = `data:${mimetype};base64,${buffer.toString('base64')}`

    let result: UploadApiResponse
    try {
      result = await cloudinary.uploader.upload(dataUri, { folder: FOLDER, resource_type: 'image' })
    } catch (error) {
      throw new InternalServerErrorException(
        `No se pudo subir la imagen a Cloudinary: ${describeError(error)}`
      )
    }

    return { url: result.secure_url, publicId: result.public_id }
  }

  async delete(publicId: string): Promise<void> {
    // Defensa en profundidad: nunca borrar nada fuera de la carpeta del
    // proyecto, aunque el guard de roles ya limita quién puede llamar esto.
    if (!publicId.startsWith(`${FOLDER}/`)) {
      throw new InternalServerErrorException('publicId fuera de la carpeta del proyecto')
    }
    await cloudinary.uploader.destroy(publicId, { resource_type: 'image' })
  }
}
