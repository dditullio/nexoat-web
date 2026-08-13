import { defineStore } from 'pinia'
import { ref } from 'vue'

const STORAGE_KEY = 'nexoat-theme'

export const useThemeStore = defineStore('theme', () => {
  const isDark = ref(false)

  function applyTheme(dark: boolean) {
    isDark.value = dark
    document.documentElement.classList.toggle('dark', dark)
    localStorage.setItem(STORAGE_KEY, dark ? 'dark' : 'light')
  }

  function toggle() {
    applyTheme(!isDark.value)
  }

  function init() {
    // Modo claro por defecto para quien nunca eligió: no se sigue la
    // preferencia del sistema (prefers-color-scheme) — solo se respeta una
    // vez que la persona toca el switch, ahí sí queda guardada.
    const stored = localStorage.getItem(STORAGE_KEY)
    applyTheme(stored === 'dark')
  }

  return { isDark, toggle, init }
})
