<template>
  <div class="container callback">
    <p class="section-lead">Ingresando…</p>
  </div>
</template>

<script setup lang="ts">
// Análogo público de AdminOAuthCallbackView.vue: el backend, tras el
// callback de Google/Facebook, ya dejó la cookie httpOnly de refresh puesta
// y redirigió acá (según el `state` de OAuth) SIN el access token en la URL
// — esta vista solo tiene que pedirlo. Ver docs/features/public-oauth-login.md.
import { onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

onMounted(async () => {
  const ok = await authStore.refresh()
  if (!ok) {
    router.replace({ name: 'login' })
    return
  }
  const redirect = route.query.redirect
  router.replace(typeof redirect === 'string' ? redirect : '/')
})
</script>

<style scoped>
.callback {
  min-height: 50vh;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
