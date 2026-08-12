import { describe, it, expect } from 'vitest'
import { getCategoryTheme, LEVEL_CHIPS, AUDIENCE_CHIPS, CATEGORY_THEMES } from './theme'

describe('getCategoryTheme', () => {
  it('devuelve el tema correcto para una categoría válida', () => {
    const theme = getCategoryTheme('acompanamiento-terapeutico')
    expect(theme).toBeDefined()
    expect(theme.bg).toBeTruthy()
    expect(theme.accent).toBeTruthy()
  })

  it('devuelve el tema por defecto para una categoría desconocida', () => {
    const theme = getCategoryTheme('categoria-inexistente' as never)
    expect(theme).toBeDefined()
  })

  it('cubre las 15 categorías del sistema', () => {
    expect(Object.keys(CATEGORY_THEMES)).toHaveLength(15)
  })
})

describe('LEVEL_CHIPS', () => {
  it('define chips para los tres niveles', () => {
    expect(LEVEL_CHIPS.basico).toBeDefined()
    expect(LEVEL_CHIPS.intermedio).toBeDefined()
    expect(LEVEL_CHIPS.avanzado).toBeDefined()
  })
})

describe('AUDIENCE_CHIPS', () => {
  it('define chips para ambas audiencias', () => {
    expect(AUDIENCE_CHIPS['cuidadores-familiares']).toBeDefined()
    expect(AUDIENCE_CHIPS['profesionales']).toBeDefined()
  })
})
