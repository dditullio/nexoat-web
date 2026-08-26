<template>
  <div class="app">
    <template v-if="route.meta.layout === 'admin'">
      <RouterView />
    </template>
    <template v-else>
      <AppHeader />
      <EmailVerificationBanner />
      <main class="app__main">
        <RouterView />
      </main>
      <AppFooter />
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useHead } from '@unhead/vue'
import { useRoute } from 'vue-router'
import AppHeader from '@/components/layout/AppHeader.vue'
import AppFooter from '@/components/layout/AppFooter.vue'
import EmailVerificationBanner from '@/components/layout/EmailVerificationBanner.vue'
import { useBlogStore } from '@/stores/blog'
import { useThemeStore } from '@/stores/theme'
import { useTrackStore } from '@/stores/track'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const blogStore = useBlogStore()
const themeStore = useThemeStore()
const trackStore = useTrackStore()
const authStore = useAuthStore()

// Único lugar con contenido público que interesa indexar — todo lo demás
// (admin, mi-cuenta, flujos de auth, 404) cae a noindex por default acá.
// Cada una de estas rutas ya pisa este valor con su propio `useSeoMeta`
// (ver docs/features/seo.md, Fase 1) — @unhead prioriza el tag registrado
// por el componente hijo (la vista) sobre el del padre (este componente
// raíz), así que no hace falta duplicar la lista acá.
const INDEXABLE_ROUTE_NAMES = new Set([
  'home',
  'category',
  'article',
  'search',
  'about',
  'plans',
  'terms',
])

// Fallback de robots — noindex por default, salvo que la ruta esté en la
// lista de arriba. Da igual si la vista concreta todavía no llamó a
// useSeoMeta (ej. mientras carga) porque este valor no depende de datos
// async: existe desde el primer render.
useHead({
  meta: [
    {
      name: 'robots',
      content: computed(() =>
        INDEXABLE_ROUTE_NAMES.has(String(route.name)) ? 'index, follow' : 'noindex, nofollow'
      ),
    },
  ],
})

onMounted(() => {
  themeStore.init()
  trackStore.init()
  authStore.bootstrap()
  blogStore.fetchArticles()
  blogStore.fetchCategories()
})
</script>
