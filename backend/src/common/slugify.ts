/**
 * Slug simple en minúsculas, sin acentos, separado por guiones.
 * "Acompañamiento Terapéutico" -> "acompanamiento-terapeutico" (coincide
 * con el estilo de slug que ya usan las categorías sembradas).
 */
const DIACRITICS = new RegExp(`[̀-ͯ]`, 'g')

export function slugify(input: string): string {
  return input
    .normalize('NFD')
    .replace(DIACRITICS, '') // saca diacríticos (á->a, ñ->n, etc.)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
