// Migración única: reoptimiza las portadas de artículos y categorías
// subidas ANTES de que MediaService.upload empezara a transformar en la
// subida (tope 1920px + quality/format automáticos). No es parte de la
// app en runtime — se corre a mano una vez por entorno.
//
// Uso: pnpm --filter @nexoat/backend exec ts-node scripts/reoptimize-images.ts
import { loadEnv } from '../src/common/load-env'
loadEnv(__dirname)

import { PrismaClient } from '@prisma/client'
import { MediaService, type MediaFolder } from '../src/media/media.service'

const prisma = new PrismaClient()
const media = new MediaService()

async function reoptimize(
  label: string,
  folder: MediaFolder,
  rows: { id: string; coverImage: string | null; coverImagePublicId: string | null }[],
  update: (id: string, data: { coverImage: string; coverImagePublicId: string }) => Promise<unknown>
) {
  for (const row of rows) {
    if (!row.coverImage || !row.coverImagePublicId) continue
    try {
      const optimized = await media.reoptimize(row.coverImage, folder)
      await update(row.id, { coverImage: optimized.url, coverImagePublicId: optimized.publicId })
      await media.delete(row.coverImagePublicId).catch((error) => {
        console.warn(`  ⚠ no se pudo borrar el asset viejo de ${label} ${row.id}:`, error)
      })
      console.log(`  ✔ ${label} ${row.id}`)
    } catch (error) {
      console.error(`  ✘ ${label} ${row.id} falló, se deja como estaba:`, error)
    }
  }
}

async function main() {
  const articles = await prisma.article.findMany({
    where: { coverImagePublicId: { not: null } },
    select: { id: true, coverImage: true, coverImagePublicId: true },
  })
  console.log(`Artículos con portada: ${articles.length}`)
  await reoptimize('artículo', 'articles', articles, (id, data) =>
    prisma.article.update({ where: { id }, data })
  )

  const categories = await prisma.category.findMany({
    where: { coverImagePublicId: { not: null } },
    select: { id: true, coverImage: true, coverImagePublicId: true },
  })
  console.log(`Categorías con portada: ${categories.length}`)
  await reoptimize('categoría', 'categories', categories, (id, data) =>
    prisma.category.update({ where: { id }, data })
  )

  console.log('Listo.')
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
