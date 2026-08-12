<template>
  <div class="admin">
    <aside class="admin__sidebar">
      <RouterLink to="/nexoat-admin" class="admin__logo">
        Nexo<span class="admin__logo-mark">AT</span>
        <span class="admin__logo-tag">admin</span>
      </RouterLink>

      <nav class="admin__nav" aria-label="Navegación del panel">
        <RouterLink to="/nexoat-admin" class="admin__link" :class="{ 'is-active': isDashboard }">
          <IconGrid />
          Panel
        </RouterLink>

        <RouterLink
          v-if="authStore.hasRole('EDITOR', 'ADMIN', 'SUPER_ADMIN')"
          to="/nexoat-admin/articulos"
          class="admin__link"
          :class="{ 'is-active': $route.path.startsWith('/nexoat-admin/articulos') }"
        >
          <IconDocument />
          Artículos
        </RouterLink>

        <RouterLink
          v-if="authStore.hasRole('EDITOR', 'ADMIN', 'SUPER_ADMIN')"
          to="/nexoat-admin/categorias"
          class="admin__link"
          :class="{ 'is-active': $route.path === '/nexoat-admin/categorias' }"
        >
          <IconImage />
          Categorías
        </RouterLink>

        <RouterLink
          v-if="authStore.hasRole('ADMIN', 'SUPER_ADMIN')"
          to="/nexoat-admin/usuarios"
          class="admin__link"
          :class="{ 'is-active': $route.path === '/nexoat-admin/usuarios' }"
        >
          <IconUsers />
          Usuarios
        </RouterLink>

        <RouterLink
          v-if="authStore.hasRole('ADMIN', 'SUPER_ADMIN')"
          to="/nexoat-admin/auditoria"
          class="admin__link"
          :class="{ 'is-active': $route.path === '/nexoat-admin/auditoria' }"
        >
          <IconClock />
          Auditoría
        </RouterLink>

        <RouterLink
          v-if="authStore.hasRole('ADMIN', 'SUPER_ADMIN')"
          to="/nexoat-admin/suscripciones"
          class="admin__link"
          :class="{ 'is-active': $route.path === '/nexoat-admin/suscripciones' }"
        >
          <IconMail />
          Suscripciones
        </RouterLink>
      </nav>

      <div class="admin__sidebar-foot">
        <RouterLink to="/" class="admin__back" target="_blank">
          <IconExternal />
          Ver el sitio
        </RouterLink>
        <ThemeToggle />
      </div>
    </aside>

    <div class="admin__body">
      <header class="admin__topbar">
        <h1 class="admin__page-title">{{ $route.meta.title }}</h1>

        <div class="admin__user">
          <span class="admin__user-name">{{ authStore.user?.name ?? authStore.user?.email }}</span>
          <span class="admin__user-role pill">{{ roleLabel }}</span>
          <button class="admin__logout" type="button" @click="onLogout">Salir</button>
        </div>
      </header>

      <main class="admin__main">
        <RouterView />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import ThemeToggle from '@/components/ui/ThemeToggle.vue'
import IconGrid from '@/components/admin/icons/IconGrid.vue'
import IconDocument from '@/components/admin/icons/IconDocument.vue'
import IconImage from '@/components/admin/icons/IconImage.vue'
import IconUsers from '@/components/admin/icons/IconUsers.vue'
import IconClock from '@/components/admin/icons/IconClock.vue'
import IconMail from '@/components/admin/icons/IconMail.vue'
import IconExternal from '@/components/admin/icons/IconExternal.vue'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const isDashboard = computed(
  () => route.path === '/nexoat-admin' || route.path === '/nexoat-admin/'
)

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super admin',
  ADMIN: 'Admin',
  EDITOR: 'Editor',
  USER: 'Usuario',
}
const roleLabel = computed(() => ROLE_LABELS[authStore.user?.role ?? 'USER'])

async function onLogout() {
  await authStore.logout()
  router.push({ name: 'admin-login' })
}
</script>

<style scoped>
.admin {
  display: grid;
  grid-template-columns: 248px 1fr;
  min-height: 100vh;
  background: var(--color-canvas-alt);
}

/* ── Sidebar ── */
.admin__sidebar {
  display: flex;
  flex-direction: column;
  background: var(--color-surface);
  border-right: 1px solid var(--color-line-light);
  padding: 24px 16px;
  position: sticky;
  top: 0;
  height: 100vh;
}

.admin__logo {
  font-family: var(--font-display);
  font-variation-settings:
    'SOFT' 60,
    'WONK' 1;
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--color-ink);
  display: flex;
  align-items: baseline;
  gap: 8px;
  padding: 8px 12px 20px;
}

.admin__logo-mark {
  color: var(--color-primary-dark);
}

.admin__logo-tag {
  font-family: var(--font-sans);
  font-size: 0.62rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--color-ink-faint);
}

.admin__nav {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
}

.admin__link {
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 10px 12px;
  border-radius: var(--radius-md);
  font-size: 0.88rem;
  font-weight: 600;
  color: var(--color-ink-secondary);
  transition:
    background 0.16s ease,
    color 0.16s ease;
}

.admin__link :deep(svg) {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
  opacity: 0.75;
}

.admin__link:hover {
  background: var(--color-canvas-alt);
  color: var(--color-ink);
}

.admin__link.is-active {
  background: var(--color-primary-soft);
  color: var(--color-primary-dark);
}

.admin__link.is-active :deep(svg) {
  opacity: 1;
}

.admin__sidebar-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 12px;
  border-top: 1px solid var(--color-line-faint);
}

.admin__back {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--color-ink-muted);
  transition: color 0.16s ease;
}

.admin__back:hover {
  color: var(--color-primary-dark);
}

.admin__back :deep(svg) {
  width: 14px;
  height: 14px;
}

/* ── Body ── */
.admin__body {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.admin__topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 20px 32px;
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-line-light);
  position: sticky;
  top: 0;
  z-index: 10;
}

.admin__page-title {
  font-size: 1.3rem;
  margin: 0;
}

.admin__user {
  display: flex;
  align-items: center;
  gap: 12px;
}

.admin__user-name {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--color-ink-secondary);
}

.admin__user-role {
  background: var(--color-ochre-soft);
  color: var(--color-ochre);
}

.admin__logout {
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--color-ink-muted);
  padding: 6px 14px;
  border-radius: var(--radius-full);
  border: 1px solid var(--color-line);
  transition:
    border-color 0.16s ease,
    color 0.16s ease;
}

.admin__logout:hover {
  border-color: var(--color-accent);
  color: var(--color-accent-dark);
}

.admin__main {
  flex: 1;
  padding: 32px;
}

@media (max-width: 900px) {
  .admin {
    grid-template-columns: 1fr;
  }

  .admin__sidebar {
    position: static;
    height: auto;
    flex-direction: row;
    align-items: center;
    flex-wrap: wrap;
    padding: 12px 16px;
  }

  .admin__nav {
    flex-direction: row;
    flex-wrap: wrap;
  }

  .admin__sidebar-foot {
    border-top: none;
  }

  .admin__main {
    padding: 20px;
  }

  .admin__topbar {
    padding: 16px 20px;
  }
}
</style>
