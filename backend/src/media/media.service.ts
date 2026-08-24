import { Injectable, InternalServerErrorException } from '@nestjs/common'
import { v2 as cloudinary, type UploadApiResponse } from 'cloudinary'

export interface UploadedMedia {
  url: string
  publicId: string
}

// Raíz común de Cloudinary para todo el sitio, con una subcarpeta por tipo
// de imagen — evita que se mezclen con otros usos futuros de la misma
// cuenta (avatares, directorio de acompañantes, etc.) y permite borrar con
// confianza sabiendo de qué feature viene cada publicId.
const ROOT_FOLDER = 'nexoat'
export const MEDIA_FOLDERS = ['articles', 'categories', 'avatars', 'ebook-covers'] as const
export type MediaFolder = (typeof MEDIA_FOLDERS)[number]

export const ALLOWED_IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
])
// Usado tanto para el límite global de @fastify/multipart (main.ts) como
// para el mensaje de error del controller — mismo número, un solo lugar.
export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024

// Ancho tope por carpeta — un avatar nunca se muestra más grande que un
// círculo chico en la UI, así que no tiene sentido guardar la misma versión
// de 1920px que una portada de artículo/categoría (ver
// docs/features/reader-profile.md). `quality`/`fetch_format` sí se
// comparten: es la misma heurística de Cloudinary para cualquier tamaño.
const WIDTH_LIMIT_BY_FOLDER: Record<MediaFolder, number> = {
  articles: 1920,
  categories: 1920,
  avatars: 512,
  // Tapa de ebook: se muestra como mucho del tamaño de una tarjeta en el
  // onboarding/perfil, nunca a pantalla completa — mismo criterio que avatars.
  'ebook-covers': 640,
}

function optimizedTransformation(folder: MediaFolder) {
  return [
    { width: WIDTH_LIMIT_BY_FOLDER[folder], crop: 'limit' },
    { quality: 'auto:good', fetch_format: 'auto' },
  ]
}

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
  async upload(
    buffer: Buffer,
    mimetype: string,
    folder: MediaFolder = 'articles'
  ): Promise<UploadedMedia> {
    const dataUri = `data:${mimetype};base64,${buffer.toString('base64')}`

    let result: UploadApiResponse
    try {
      result = await cloudinary.uploader.upload(dataUri, {
        folder: `${ROOT_FOLDER}/${folder}`,
        resource_type: 'image',
        // Se optimiza en la subida (no solo al servir): el archivo que
        // queda guardado ya es el liviano, así que cada <img> del sitio
        // que usa esta URL tal cual se beneficia sin tocar nada más.
        // - width/crop "limit": nunca agranda, solo achica lo que exceda
        //   1920px (portadas de artículo y el banner de categoría son las
        //   piezas más grandes del sitio; de sobra para el resto).
        // - quality "auto:good" + fetch_format "auto": Cloudinary elige
        //   la compresión y el formato (WebP/AVIF si conviene) que mejor
        //   balancea peso y calidad para esa imagen en particular.
        transformation: optimizedTransformation(folder),
      })
    } catch (error) {
      throw new InternalServerErrorException(
        `No se pudo subir la imagen a Cloudinary: ${describeError(error)}`
      )
    }

    return { url: result.secure_url, publicId: result.public_id }
  }

  // Reprocesa un asset ya alojado en Cloudinary (subido antes de que
  // `upload` optimizara en la subida): se lo pasa como URL de origen — lo
  // baja y resube Cloudinary mismo, no nuestro backend — con la misma
  // transformación, y queda como un asset nuevo (publicId nuevo). Usado
  // por scripts/reoptimize-images.ts; el caller es responsable de
  // actualizar la referencia guardada y borrar el asset viejo.
  async reoptimize(sourceUrl: string, folder: MediaFolder): Promise<UploadedMedia> {
    let result: UploadApiResponse
    try {
      result = await cloudinary.uploader.upload(sourceUrl, {
        folder: `${ROOT_FOLDER}/${folder}`,
        resource_type: 'image',
        transformation: optimizedTransformation(folder),
      })
    } catch (error) {
      throw new InternalServerErrorException(
        `No se pudo reoptimizar la imagen en Cloudinary: ${describeError(error)}`
      )
    }

    return { url: result.secure_url, publicId: result.public_id }
  }

  async delete(publicId: string): Promise<void> {
    // Defensa en profundidad: nunca borrar nada fuera de las carpetas del
    // proyecto, aunque el guard de roles ya limita quién puede llamar esto.
    const isInProjectFolder = MEDIA_FOLDERS.some((folder) =>
      publicId.startsWith(`${ROOT_FOLDER}/${folder}/`)
    )
    if (!isInProjectFolder) {
      throw new InternalServerErrorException('publicId fuera de las carpetas del proyecto')
    }
    await cloudinary.uploader.destroy(publicId, { resource_type: 'image' })
  }
}
