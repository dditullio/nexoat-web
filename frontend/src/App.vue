<template>
  <div class="app">
    <AppHeader />
    <main class="app__main">
      <RouterView />
    </main>
    <AppFooter />
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import AppHeader from '@/components/layout/AppHeader.vue'
import AppFooter from '@/components/layout/AppFooter.vue'
import { useBlogStore } from '@/stores/blog'
import { mockArticles } from '@/data/mockArticles'

const store = useBlogStore()
onMounted(() => store.loadArticles(mockArticles))
</script>
