import { Audience } from '@prisma/client'

/**
 * El identificador Prisma no admite guiones, así que `Audience.cuidadores_familiares`
 * es literalmente el string "cuidadores_familiares" en runtime — `@map` en
 * el schema solo cambia lo que se guarda en la columna de Postgres, no lo
 * que ve el Prisma Client. El tipo `Audience` del frontend
 * (frontend/src/types/index.ts) usa guion, así que la traducción vive acá,
 * en el borde de ArticlesModule, y en ningún otro lado.
 */
export const AUDIENCE_API_VALUES = ['cuidadores-familiares', 'profesionales', 'mixto'] as const
export type AudienceApiValue = (typeof AUDIENCE_API_VALUES)[number]

const TO_API: Record<Audience, AudienceApiValue> = {
  [Audience.cuidadores_familiares]: 'cuidadores-familiares',
  [Audience.profesionales]: 'profesionales',
  [Audience.mixto]: 'mixto',
}

const FROM_API: Record<AudienceApiValue, Audience> = {
  'cuidadores-familiares': Audience.cuidadores_familiares,
  profesionales: Audience.profesionales,
  mixto: Audience.mixto,
}

export function audienceToApi(values: Audience[]): AudienceApiValue[] {
  return values.map((v) => TO_API[v])
}

export function audienceFromApi(values: AudienceApiValue[]): Audience[] {
  return values.map((v) => FROM_API[v])
}
