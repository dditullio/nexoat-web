<template>
  <div class="app">
    <template v-if="route.meta.layout === 'admin'">
      <RouterView />
    </template>
    <template v-else>
      <AppHeader />
      <main class="app__main">
        <RouterView />
      </main>
      <AppFooter />
    </template>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useRoute } from 'vue-router'
import AppHeader from '@/components/layout/AppHeader.vue'
import AppFooter from '@/components/layout/AppFooter.vue'
import { useBlogStore } from '@/stores/blog'
import { useThemeStore } from '@/stores/theme'
import { useTrackStore } from '@/stores/track'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const blogStore = useBlogStore()
const themeStore = useThemeStore()
const trackStore = useTrackStore()
const authStore = useAuthStore()

onMounted(() => {
  themeStore.init()
  trackStore.init()
  authStore.bootstrap()
  blogStore.fetchArticles()
  blogStore.fetchCategories()
})
</script>
