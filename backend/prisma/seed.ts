import { loadEnv } from '../src/common/load-env'
loadEnv(__dirname)

import { PrismaClient, Role } from '@prisma/client'
import * as bcrypt from 'bcryptjs'

const prisma = new PrismaClient()
const BCRYPT_ROUNDS = 10

// Mismos slug/name/description que frontend/src/stores/blog.ts (array
// CATEGORIES) — si se desalinean, el selector de categoría del admin y el
// blog público van a mostrar cosas distintas para la misma categoría.
const CATEGORIES = [
  {
    slug: 'acompanamiento-terapeutico',
    name: 'Acompañamiento Terapéutico',
    description: 'Qué es el AT, cómo funciona y el rol del acompañante en equipos de salud',
    icon: 'AT',
  },
  {
    slug: 'guia-cuidador',
    name: 'Guía del Cuidador',
    description: 'Técnicas prácticas: higiene, movilización, medicación y rutinas de cuidado',
    icon: 'GC',
  },
  {
    slug: 'cuidar-al-cuidador',
    name: 'Cuidar al Cuidador',
    description: 'Burnout, autocuidado y límites emocionales del cuidador familiar',
    icon: 'CC',
  },
  {
    slug: 'neurodiversidad-y-discapacidad',
    name: 'Neurodiversidad y Discapacidad',
    description: 'TDAH, TEA, discapacidad intelectual y abordaje de conductas disruptivas',
    icon: 'ND',
  },
  {
    slug: 'familia-y-vinculos',
    name: 'Familia y Vínculos',
    description: 'Duelo diagnóstico, dinámicas familiares, crianza y relaciones de cuidado',
    icon: 'FV',
  },
  {
    slug: 'salud-mental',
    name: 'Salud Mental',
    description: 'Psicosis, trastornos alimentarios, adicciones y conductas autolesivas',
    icon: 'SM',
  },
  {
    slug: 'patologias-en-la-vejez',
    name: 'Vejez y Salud',
    description: 'Parkinson, Alzheimer, centros de día y mitos del envejecimiento',
    icon: 'VS',
  },
  {
    slug: 'sistema-de-salud-y-recursos',
    name: 'Sistema de Salud',
    description: 'Cómo navegar el sistema sanitario, recursos disponibles y derivaciones',
    icon: 'SS',
  },
  {
    slug: 'herramientas-practicas',
    name: 'Herramientas Prácticas',
    description: 'Guías paso a paso, checklists y organizadores de cuidado',
    icon: 'HP',
  },
  {
    slug: 'evidencia-en-foco',
    name: 'Evidencia en Foco',
    description: 'Artículos basados en investigación, datos y estudios clínicos',
    icon: 'EF',
  },
]

async function seedAdmin() {
  const email = process.env.SEED_ADMIN_EMAIL
  const password = process.env.SEED_ADMIN_PASSWORD
  if (!email || !password) {
    console.warn(
      '⚠ SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD no están seteadas — se omite el alta del SUPER_ADMIN.'
    )
    return
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS)
  const admin = await prisma.user.upsert({
    where: { email },
    update: { role: Role.SUPER_ADMIN, isActive: true, passwordHash },
    create: { email, passwordHash, role: Role.SUPER_ADMIN, emailVerified: new Date() },
  })
  console.log(`✔ SUPER_ADMIN listo: ${admin.email}`)
}

async function seedCategories() {
  for (const category of CATEGORIES) {
    await prisma.category.upsert({
      where: { slug: category.slug },
      update: { name: category.name, description: category.description, icon: category.icon },
      create: category,
    })
  }
  console.log(`✔ ${CATEGORIES.length} categorías sembradas`)
}

async function main() {
  await seedAdmin()
  await seedCategories()
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
