<template>
  <div class="callback">
    <p class="section-lead">Ingresando…</p>
  </div>
</template>

<script setup lang="ts">
// El backend, tras el callback de Google/Facebook, ya dejó la cookie
// httpOnly de refresh puesta y redirigió acá SIN el access token en la URL
// (evita JWTs en logs/historial) — esta vista solo tiene que pedirlo.
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()

onMounted(async () => {
  const ok = await authStore.refresh()
  router.replace(ok ? '/nexoat-admin' : { name: 'admin-login' })
})
</script>

<style scoped>
.callback {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-canvas);
}
</style>
