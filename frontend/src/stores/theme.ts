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
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      applyTheme(stored === 'dark')
    } else {
      applyTheme(window.matchMedia('(prefers-color-scheme: dark)').matches)
    }
  }

  return { isDark, toggle, init }
})
