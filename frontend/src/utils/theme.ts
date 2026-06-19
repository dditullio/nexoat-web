import type { CategorySlug, Level, Audience } from '@/types'

export const CATEGORY_THEMES: Record<
  CategorySlug,
  { bg: string; accent: string; gradient: string; cardColor: string; icon: string }
> = {
  'acompanamiento-terapeutico': {
    bg: '#EEF2FA',
    accent: '#4568A0',
    cardColor: '#EEF2FA',
    gradient: 'linear-gradient(138deg,#7FA3D1 0%,#4568A0 55%,#2A3E80 100%)',
    icon: 'AT',
  },
  'guia-cuidador': {
    bg: '#E8F5F4',
    accent: '#2A8A82',
    cardColor: '#E8F5F4',
    gradient: 'linear-gradient(138deg,#68B0A8 0%,#2A8A82 55%,#1A6A62 100%)',
    icon: 'GC',
  },
  'cuidar-al-cuidador': {
    bg: '#FCEAE6',
    accent: '#C05E4A',
    cardColor: '#FCEAE6',
    gradient: 'linear-gradient(138deg,#E8A090 0%,#D06850 55%,#B04030 100%)',
    icon: 'CC',
  },
  'neurodiversidad-y-discapacidad': {
    bg: '#F2EEFA',
    accent: '#6B4FA5',
    cardColor: '#F2EEFA',
    gradient: 'linear-gradient(138deg,#A080C8 0%,#7055A8 55%,#5040A0 100%)',
    icon: 'ND',
  },
  'familia-y-vinculos': {
    bg: '#FEF3EE',
    accent: '#C4733A',
    cardColor: '#FEF3EE',
    gradient: 'linear-gradient(138deg,#E8A870 0%,#C87840 55%,#A85820 100%)',
    icon: 'FV',
  },
  'salud-mental': {
    bg: '#EEEEF8',
    accent: '#5560A8',
    cardColor: '#EEEEF8',
    gradient: 'linear-gradient(138deg,#8090C8 0%,#5568B0 55%,#3548A0 100%)',
    icon: 'SM',
  },
  'patologias-en-la-vejez': {
    bg: '#EDF4E8',
    accent: '#4A7A2A',
    cardColor: '#EDF4E8',
    gradient: 'linear-gradient(138deg,#80B068 0%,#5A8A48 55%,#3A6A28 100%)',
    icon: 'VS',
  },
  'sistema-de-salud-y-recursos': {
    bg: '#E8F3F6',
    accent: '#2A6A8A',
    cardColor: '#E8F3F6',
    gradient: 'linear-gradient(138deg,#68A8C8 0%,#2A7A9A 55%,#1A5A7A 100%)',
    icon: 'SS',
  },
  'herramientas-practicas': {
    bg: '#FEF5E6',
    accent: '#C48528',
    cardColor: '#FEF5E6',
    gradient: 'linear-gradient(138deg,#E8C068 0%,#C89038 55%,#A87020 100%)',
    icon: 'HP',
  },
  'evidencia-en-foco': {
    bg: '#EEEAFA',
    accent: '#5548A0',
    cardColor: '#EEEAFA',
    gradient: 'linear-gradient(138deg,#8078C8 0%,#5850B0 55%,#3838A0 100%)',
    icon: 'EF',
  },
}

export const LEVEL_CHIPS: Record<Level, { bg: string; text: string; label: string }> = {
  basico: { bg: '#EDF7ED', text: '#2E7A2E', label: 'Básico' },
  intermedio: { bg: '#EEF2FA', text: '#4568A0', label: 'Intermedio' },
  avanzado: { bg: '#F2EEFA', text: '#6B4FA5', label: 'Avanzado' },
}

export const AUDIENCE_CHIPS: Record<Audience, { bg: string; text: string; label: string }> = {
  'cuidadores-familiares': { bg: '#FEF5E6', text: '#9A6A22', label: 'Cuidadores' },
  profesionales: { bg: '#EEEAFA', text: '#5548A0', label: 'Profesionales' },
  mixto: { bg: '#F0EEE8', text: '#5A6178', label: 'Mixto' },
}

export function getCategoryTheme(slug: CategorySlug) {
  return CATEGORY_THEMES[slug] ?? CATEGORY_THEMES['acompanamiento-terapeutico']
}
