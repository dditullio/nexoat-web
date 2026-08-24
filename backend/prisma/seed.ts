import { loadEnv } from '../src/common/load-env'
loadEnv(__dirname)

import { mkdir, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { PrismaClient, Role } from '@prisma/client'
import * as bcrypt from 'bcryptjs'

const prisma = new PrismaClient()
const BCRYPT_ROUNDS = 10

// Mismo criterio de carpeta que GiftsService — ver docs/features/welcome-ebook-gift.md.
const EBOOKS_DIR = process.env.EBOOKS_DIR
  ? resolve(process.env.EBOOKS_DIR)
  : resolve(__dirname, '..', 'storage', 'ebooks')

// Datos ficticios pero realistas — alcanza para probar que la tarjeta se
// lee bien en el onboarding, no solo que el campo existe. `topic` es una
// etiqueta libre corta (ver WelcomeEbook.topic en el schema).
const WELCOME_EBOOKS = [
  {
    slug: 'primeros-pasos-en-el-at',
    title: 'Primeros pasos en el Acompañamiento Terapéutico',
    subtitle: 'Guía práctica para tu primer año de trabajo',
    topic: 'Primeros pasos en AT',
    summary:
      'Una introducción concreta al rol del AT: encuadre, vínculo con el paciente y con el ' +
      'equipo tratante, y los errores más comunes al arrancar.',
  },
  {
    slug: 'cuidar-sin-agotarse',
    title: 'Cuidar sin agotarse',
    subtitle: 'Herramientas concretas para cuidadores familiares',
    topic: 'Cuidado de mayores',
    summary:
      'Técnicas de organización, autocuidado y límites emocionales para sostener el cuidado ' +
      'de un familiar mayor sin que el cuidador termine agotado.',
  },
  {
    slug: 'neurodiversidad-en-el-dia-a-dia',
    title: 'Neurodiversidad en el día a día',
    subtitle: 'Cómo acompañar sin patologizar',
    topic: 'Neurodiversidad',
    summary:
      'Ideas prácticas para acompañar a personas con TEA o TDAH en la vida cotidiana, desde ' +
      'una mirada que respeta la diversidad en vez de "corregirla".',
  },
]

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
  {
    slug: 'maltrato-y-abuso',
    name: 'Maltrato y Abuso',
    description: 'Detección, denuncia y abuso económico — cómo reconocerlo y actuar a tiempo',
    icon: 'MA',
  },
  {
    slug: 'aspectos-legales-y-derechos',
    name: 'Aspectos Legales y Derechos',
    description: 'Curatela, patrimonio y denuncias — el marco legal del cuidado y la vejez',
    icon: 'AL',
  },
  {
    slug: 'historias-que-humanizan',
    name: 'Historias que Humanizan',
    description: 'Relatos testimoniales que ponen rostro y voz a la experiencia del cuidado',
    icon: 'HH',
  },
  {
    slug: 'autismo-y-tea',
    name: 'Autismo y TEA',
    description: 'Abordaje, diagnóstico y acompañamiento específico del espectro autista',
    icon: 'TEA',
  },
  {
    slug: 'discapacidad-intelectual-y-psicosocial',
    name: 'Discapacidad Intelectual y Psicosocial',
    description: 'Capacidad jurídica, apoyos e inclusión más allá del diagnóstico clínico',
    icon: 'DI',
  },
  {
    slug: 'redaccion-clinica-y-objetivos',
    name: 'Redacción Clínica y Objetivos',
    description: 'Informes técnicos, formulación de objetivos medibles y registro de campo',
    icon: 'RCO',
  },
  {
    slug: 'encuadre-honorarios-y-facturacion',
    name: 'Encuadre, Honorarios y Facturación',
    description:
      'Límites con la familia, tarifas, contratos y aspectos administrativos del ejercicio profesional',
    icon: 'EHF',
  },
  {
    slug: 'organizacion-y-salud-ocupacional',
    name: 'Organización y Salud Ocupacional',
    description: 'Gestión del tiempo, burnout y autocuidado propio del acompañante terapéutico',
    icon: 'OSO',
  },
  {
    slug: 'recursos-y-materiales-de-trabajo',
    name: 'Recursos y Materiales de Trabajo',
    description:
      'Kit de herramientas, adaptación de espacios y materiales didácticos para la jornada',
    icon: 'RMT',
  },
  {
    slug: 'equipo-familias-y-capacitacion',
    name: 'Equipo, Familias y Capacitación',
    description:
      'Trabajo interdisciplinario, comunicación con familias/escuela y formación continua',
    icon: 'EFC',
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

// Sin PDFs definitivos todavía (ver docs/features/welcome-ebook-gift.md):
// en desarrollo siempre se siembran 3 títulos de prueba con un PDF
// placeholder, para poder probar el flujo completo (onboarding → claim →
// descarga) sin depender de tener contenido real. En producción NO corre
// salvo que se setee SEED_WELCOME_EBOOKS=true explícito — la tabla arranca
// vacía y el paso de regalo queda invisible hasta que subas los PDFs
// reales desde el admin.
async function seedWelcomeEbooks() {
  const isProd = process.env.NODE_ENV === 'production'
  if (isProd && process.env.SEED_WELCOME_EBOOKS !== 'true') {
    console.log('… SEED_WELCOME_EBOOKS no está en "true" en producción — se omite (esperado).')
    return
  }

  await mkdir(EBOOKS_DIR, { recursive: true })

  for (const ebook of WELCOME_EBOOKS) {
    const created = await prisma.welcomeEbook.upsert({
      where: { slug: ebook.slug },
      update: {
        title: ebook.title,
        subtitle: ebook.subtitle,
        topic: ebook.topic,
        summary: ebook.summary,
      },
      create: { ...ebook, active: true },
    })

    // PDF placeholder: un párrafo de texto plano con extensión .pdf.
    // Alcanza para probar la descarga real (stream + Content-Disposition)
    // sin depender de tener el contenido definitivo.
    const fileKey = `${created.id}.pdf`
    await writeFile(
      join(EBOOKS_DIR, fileKey),
      `${ebook.title}\n\n(Este es un PDF de prueba generado por el seed — reemplazar por el ` +
        `archivo definitivo desde /nexoat-admin/regalo-bienvenida.)`
    )
    await prisma.welcomeEbook.update({
      where: { id: created.id },
      data: { fileKey, fileName: `${ebook.slug}.pdf` },
    })
  }

  console.log(
    `✔ ${WELCOME_EBOOKS.length} ebooks de regalo de bienvenida sembrados (con PDF de prueba)`
  )
}

async function main() {
  await seedAdmin()
  await seedCategories()
  await seedWelcomeEbooks()
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
