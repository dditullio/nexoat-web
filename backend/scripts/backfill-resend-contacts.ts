// Migración única: sincroniza con la audiencia de Resend los
// NewsletterSubscriber que ya existían en la DB antes de la fase 3 de
// docs/features/email-provider-resend.md (sin resendContactId). No es
// parte de la app en runtime — se corre a mano una vez por entorno.
//
// Idempotente: solo toca suscriptores con `resendContactId: null` —
// correrlo de nuevo no vuelve a tocar los que ya se sincronizaron.
//
// Uso: pnpm --filter @nexoat/backend exec ts-node scripts/backfill-resend-contacts.ts
import { loadEnv } from '../src/common/load-env'
loadEnv(__dirname)

import { PrismaClient } from '@prisma/client'
import { ResendAudienceService } from '../src/newsletter/resend-audience.service'

const prisma = new PrismaClient()
const resendAudience = new ResendAudienceService()

async function main() {
  const subscribers = await prisma.newsletterSubscriber.findMany({
    where: { resendContactId: null },
    select: { id: true, email: true, isActive: true },
  })

  let synced = 0
  let skipped = 0

  for (const subscriber of subscribers) {
    // Solo activos: uno ya dado de baja antes de esta fase no tiene por qué
    // reaparecer suscripto en Resend — se sincronizará recién si vuelve a
    // suscribirse (NewsletterService.subscribe lo cubre normalmente).
    if (!subscriber.isActive) {
      skipped++
      continue
    }

    const contactId = await resendAudience.upsertSubscribed(subscriber.email, null)
    if (!contactId) {
      console.warn(`  ✗ ${subscriber.email} — no se pudo sincronizar, se reintenta en otra corrida`)
      continue
    }

    await prisma.newsletterSubscriber.update({
      where: { id: subscriber.id },
      data: { resendContactId: contactId },
    })
    console.log(`  ✔ ${subscriber.email} → ${contactId}`)
    synced++
  }

  console.log(
    `✔ ${synced} suscriptores sincronizados, ${skipped} de baja (sin tocar) de ${subscribers.length} candidatos.`
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
