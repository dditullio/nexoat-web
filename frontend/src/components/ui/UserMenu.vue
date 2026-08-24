<template>
  <div ref="root" class="um">
    <button
      class="um__trigger"
      :class="{ 'is-open': open }"
      type="button"
      :aria-expanded="open"
      aria-haspopup="menu"
      :aria-label="`Menú de ${displayName}`"
      @click="open = !open"
    >
      <span class="um__avatar" aria-hidden="true">
        <img v-if="showAvatarImg" :src="user!.avatarUrl!" alt="" @error="avatarError = true" />
        <span v-else class="um__initials">{{ initials }}</span>
      </span>
      <svg
        class="um__caret"
        :class="{ 'is-open': open }"
        width="10"
        height="10"
        viewBox="0 0 12 12"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        aria-hidden="true"
      >
        <path d="M2 4.5l4 4 4-4" />
      </svg>
    </button>

    <Transition name="um-pop">
      <div v-show="open" class="um__panel" role="menu">
        <div class="um__head">
          <span class="um__avatar um__avatar--lg" aria-hidden="true">
            <img v-if="showAvatarImg" :src="user!.avatarUrl!" alt="" @error="avatarError = true" />
            <span v-else class="um__initials">{{ initials }}</span>
          </span>
          <div class="um__id">
            <span class="um__name">{{ displayName }}</span>
            <span class="um__email">{{ user?.email }}</span>
            <span class="um__tier">{{ tierLabel }}</span>
          </div>
        </div>

        <div class="um__sep" />

        <div class="um__group">
          <RouterLink to="/mi-cuenta/perfil" class="um__item" role="menuitem" @click="open = false">
            <span class="um__glyph" aria-hidden="true">👤</span>
            <span class="um__label">Mi perfil</span>
          </RouterLink>

          <RouterLink
            to="/mi-cuenta/guardados"
            class="um__item"
            role="menuitem"
            @click="open = false"
          >
            <span class="um__glyph" aria-hidden="true">🔖</span>
            <span class="um__label">Artículos guardados</span>
          </RouterLink>

          <RouterLink
            to="/mi-cuenta/historial"
            class="um__item"
            role="menuitem"
            @click="open = false"
          >
            <span class="um__glyph" aria-hidden="true">🕮</span>
            <span class="um__label">Historial de lectura</span>
          </RouterLink>

          <RouterLink
            to="/mi-cuenta/preferencias"
            class="um__item"
            role="menuitem"
            @click="open = false"
          >
            <span class="um__glyph" aria-hidden="true">✉</span>
            <span class="um__label">Preferencias de correo</span>
          </RouterLink>
        </div>

        <div class="um__sep" />

        <div class="um__group">
          <RouterLink to="/planes" class="um__item" role="menuitem" @click="open = false">
            <span class="um__glyph" aria-hidden="true">✦</span>
            <span class="um__label">Planes y suscripción</span>
          </RouterLink>

          <RouterLink
            v-if="isStaff"
            to="/nexoat-admin"
            class="um__item"
            role="menuitem"
            @click="open = false"
          >
            <span class="um__glyph" aria-hidden="true">⚙</span>
            <span class="um__label">Panel de administración</span>
          </RouterLink>
        </div>

        <div class="um__sep" />

        <button type="button" class="um__item um__item--danger" role="menuitem" @click="onLogout">
          <span class="um__glyph" aria-hidden="true">⏻</span>
          <span class="um__label">Cerrar sesión</span>
        </button>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import type { SubscriptionTier } from '@/types/auth'

const emit = defineEmits<{ (e: 'navigate'): void }>()

const authStore = useAuthStore()
const user = computed(() => authStore.user)
const open = ref(false)
const root = ref<HTMLElement | null>(null)

// Algunas cuentas de Google/Facebook devuelven una URL de foto que no carga
// (privada, vencida, etc.) — sin esto, el navegador muestra el ícono de
// imagen rota en vez de caer a las iniciales.
const avatarError = ref(false)
const showAvatarImg = computed(() => !!user.value?.avatarUrl && !avatarError.value)
watch(
  () => user.value?.avatarUrl,
  () => {
    avatarError.value = false
  }
)

const displayName = computed(() => user.value?.name || user.value?.email || 'Mi cuenta')

const initials = computed(() => {
  const base = user.value?.name?.trim() || user.value?.email || '?'
  const parts = base.split(/[\s.@_-]+/).filter(Boolean)
  return (parts[0]?.[0] ?? '?').concat(parts[1]?.[0] ?? '').toUpperCase()
})

const TIER_LABEL: Record<SubscriptionTier, string> = {
  gratuito: 'Cuenta gratuita',
  nivel_2: 'Suscripción nivel 2',
  nivel_3: 'Suscripción nivel 3',
}
const tierLabel = computed(() => TIER_LABEL[user.value?.subscriptionTier ?? 'gratuito'])

const isStaff = computed(() => authStore.hasRole('SUPER_ADMIN', 'ADMIN', 'EDITOR'))

function onLogout() {
  open.value = false
  emit('navigate')
  authStore.logout()
}

function onDocClick(e: MouseEvent) {
  if (open.value && root.value && !root.value.contains(e.target as Node)) open.value = false
}

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') open.value = false
}

onMounted(() => {
  document.addEventListener('click', onDocClick)
  document.addEventListener('keydown', onKey)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', onDocClick)
  document.removeEventListener('keydown', onKey)
})
</script>

<style scoped>
.um {
  position: relative;
}

.um__trigger {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 4px 8px 4px 4px;
  border-radius: var(--radius-full);
  color: var(--color-ink-muted);
  transition:
    background 0.2s ease,
    color 0.2s ease;
}

.um__trigger:hover,
.um__trigger.is-open {
  background: var(--color-hover-bg);
  color: var(--color-ink);
}

.um__avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-primary-tint);
  color: var(--color-primary-dark);
}

.um__avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.um__avatar--lg {
  width: 42px;
  height: 42px;
}

.um__initials {
  font-family: var(--font-display);
  font-variation-settings: 'SOFT' 60;
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.02em;
}

.um__avatar--lg .um__initials {
  font-size: 1rem;
}

.um__caret {
  transition: transform 0.3s var(--ease-out-soft);
}

.um__caret.is-open {
  transform: rotate(180deg);
}

.um__panel {
  position: absolute;
  top: calc(100% + 10px);
  right: 0;
  width: 268px;
  background: var(--color-surface-raised);
  border: 1px solid var(--color-line-light);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-lg);
  padding: 8px;
  z-index: 20;
}

.um__head {
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 10px 10px 12px;
}

.um__id {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}

.um__name,
.um__email {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.um__name {
  font-size: 0.92rem;
  font-weight: 700;
  color: var(--color-ink);
}

.um__email {
  font-size: 0.76rem;
  color: var(--color-ink-faint);
}

.um__tier {
  margin-top: 4px;
  font-size: 0.66rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--color-primary-dark);
}

.um__sep {
  height: 1px;
  background: var(--color-line-faint);
  margin: 4px 6px;
}

.um__group {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.um__item {
  display: flex;
  align-items: center;
  gap: 11px;
  width: 100%;
  padding: 9px 11px;
  border-radius: var(--radius-md);
  font-size: 0.86rem;
  font-weight: 600;
  color: var(--color-ink-secondary);
  text-align: left;
  transition:
    background 0.18s ease,
    color 0.18s ease;
}

.um__item:hover {
  background: var(--color-canvas-alt);
  color: var(--color-ink);
}

.um__glyph {
  width: 20px;
  font-size: 0.9rem;
  text-align: center;
  flex-shrink: 0;
}

.um__label {
  flex: 1;
  min-width: 0;
}

.um__item--danger {
  color: var(--color-accent-dark);
}

.um-pop-enter-active,
.um-pop-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.2s var(--ease-out-soft);
}

.um-pop-enter-from,
.um-pop-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
