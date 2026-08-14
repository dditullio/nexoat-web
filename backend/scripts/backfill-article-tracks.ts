// Migración única: asigna `tracks` (eje temático) a los artículos que
// todavía no tienen ninguno, derivándolo de sus categorías (ver
// docs/features/content-tracks.md, "Mapeo categoría → eje"). No es parte de
// la app en runtime — se corre a mano una vez por entorno, después de la
// migración de Prisma que agrega la columna.
//
// Idempotente: solo toca artículos con `tracks: []` — correrlo de nuevo no
// pisa ajustes manuales que un editor haya hecho después.
//
// Uso: pnpm --filter @nexoat/backend exec ts-node scripts/backfill-article-tracks.ts
import { loadEnv } from '../src/common/load-env'
loadEnv(__dirname)

import { PrismaClient } from '@prisma/client'
import { suggestTracksFromCategories } from '../src/articles/track.util'

const prisma = new PrismaClient()

async function main() {
  const articles = await prisma.article.findMany({
    where: { tracks: { equals: [] } },
    select: {
      id: true,
      slug: true,
      categories: { select: { category: { select: { slug: true } } } },
    },
  })

  let updated = 0
  let skipped = 0

  for (const article of articles) {
    const categorySlugs = article.categories.map((c) => c.category.slug)
    const tracks = suggestTracksFromCategories(categorySlugs)
    if (!tracks.length) {
      skipped++
      continue
    }
    await prisma.article.update({ where: { id: article.id }, data: { tracks } })
    console.log(`  ✔ ${article.slug} → ${tracks.join(', ')}`)
    updated++
  }

  console.log(
    `✔ ${updated} artículos actualizados, ${skipped} sin eje (todas sus categorías son "sin eje prioritario") de ${articles.length} candidatos.`
  )
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
