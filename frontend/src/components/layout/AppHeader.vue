<template>
  <header class="header">
    <div class="container header__inner">
      <!-- Logo -->
      <RouterLink to="/" class="header__logo">
        Nexo<span class="header__logo-accent">AT</span>
      </RouterLink>

      <!-- Desktop nav -->
      <nav id="desktop-nav" class="header__nav" aria-label="Navegación principal">
        <RouterLink
          to="/"
          class="header__nav-link"
          :class="{ 'header__nav-link--active': $route.path === '/' }"
        >
          Inicio
        </RouterLink>

        <div
          class="header__dropdown-wrap"
          @mouseenter="showCats = true"
          @mouseleave="showCats = false"
        >
          <button
            class="header__nav-link header__nav-link--btn"
            :class="{ 'header__nav-link--active': showCats }"
          >
            Categorías
            <svg
              width="11"
              height="11"
              viewBox="0 0 12 12"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
            >
              <path d="M2 4l4 4 4-4" />
            </svg>
          </button>
          <div v-show="showCats" class="header__mega">
            <RouterLink
              v-for="cat in store.categories"
              :key="cat.slug"
              :to="`/categoria/${cat.slug}`"
              class="header__mega-item"
              @click="showCats = false"
            >
              <span class="header__mega-icon" :style="{ background: cat.bg, color: cat.accent }">{{
                cat.icon
              }}</span>
              <span class="header__mega-name">{{ cat.name }}</span>
              <span class="header__mega-count">{{ cat.articleCount }}</span>
            </RouterLink>
          </div>
        </div>

        <RouterLink to="/acerca-de" class="header__nav-link">Acerca de</RouterLink>
        <span class="header__nav-link header__nav-link--disabled">Servicios</span>
      </nav>

      <!-- Right actions -->
      <div class="header__actions">
        <RouterLink to="/buscar" class="header__icon-btn" aria-label="Buscar">
          <svg
            width="17"
            height="17"
            viewBox="0 0 18 18"
            fill="none"
            stroke="currentColor"
            stroke-width="1.6"
          >
            <circle cx="7.5" cy="7.5" r="5" />
            <path d="M12 12l4 4" />
          </svg>
        </RouterLink>
        <a href="#newsletter" class="header__subscribe-btn">
          Suscribirme
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path d="M2 6h8M6 2l4 4-4 4" />
          </svg>
        </a>
      </div>

      <!-- Hamburger -->
      <button class="header__burger" aria-label="Abrir menú" @click="menuOpen = true">
        <svg
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          stroke-width="1.6"
        >
          <path d="M3 5h14M3 10h14M3 15h14" />
        </svg>
      </button>
    </div>
  </header>

  <!-- Mobile drawer -->
  <Teleport to="body">
    <Transition name="overlay">
      <div v-if="menuOpen" class="drawer-overlay" @click="menuOpen = false" />
    </Transition>
    <Transition name="drawer">
      <aside v-if="menuOpen" class="drawer" aria-label="Menú mobile">
        <div class="drawer__header">
          <span class="drawer__logo">Nexo<span class="header__logo-accent">AT</span></span>
          <button class="drawer__close" aria-label="Cerrar menú" @click="menuOpen = false">
            <svg
              width="17"
              height="17"
              viewBox="0 0 18 18"
              fill="none"
              stroke="currentColor"
              stroke-width="1.6"
            >
              <path d="M2 2l14 14M16 2L2 16" />
            </svg>
          </button>
        </div>
        <nav class="drawer__nav">
          <RouterLink to="/" class="drawer__link drawer__link--primary" @click="menuOpen = false"
            >Inicio</RouterLink
          >
          <RouterLink to="/acerca-de" class="drawer__link" @click="menuOpen = false"
            >Acerca de</RouterLink
          >
          <span class="drawer__section">Categorías</span>
          <RouterLink
            v-for="cat in store.categories"
            :key="cat.slug"
            :to="`/categoria/${cat.slug}`"
            class="drawer__link drawer__link--sub"
            @click="menuOpen = false"
            >{{ cat.name }}</RouterLink
          >
          <span class="drawer__link drawer__link--disabled">Servicios (próximamente)</span>
        </nav>
        <div class="drawer__footer">
          <a href="#newsletter" class="drawer__subscribe" @click="menuOpen = false"
            >Suscribirme →</a
          >
        </div>
      </aside>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useBlogStore } from '@/stores/blog'

const store = useBlogStore()
const showCats = ref(false)
const menuOpen = ref(false)
</script>

<style scoped>
.header {
  position: sticky;
  top: 0;
  z-index: 100;
  background: rgba(247, 245, 242, 0.96);
  border-bottom: 1px solid rgba(224, 220, 214, 0.9);
  backdrop-filter: blur(8px);
}

.header__inner {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 66px;
}

/* Logo */
.header__logo {
  font-family: var(--font-serif);
  font-size: 21px;
  font-weight: 700;
  color: var(--color-text);
  letter-spacing: -0.02em;
  flex-shrink: 0;
  margin-right: 24px;
  text-decoration: none;
}
.header__logo-accent {
  color: var(--color-primary);
}

/* Desktop nav */
.header__nav {
  display: flex;
  align-items: center;
  gap: 4px;
  flex: 1;
}

.header__nav-link {
  font-size: 14px;
  font-weight: 600;
  color: #5a6178;
  padding: 7px 12px;
  border-radius: 8px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  text-decoration: none;
  transition:
    background 0.15s,
    color 0.15s;
  white-space: nowrap;
}
.header__nav-link:hover {
  background: rgba(42, 46, 61, 0.05);
  color: var(--color-text);
}
.header__nav-link--active {
  font-weight: 700;
  color: var(--color-primary);
  background: rgba(69, 104, 160, 0.07);
}
.header__nav-link--btn {
  background: none;
  border: none;
  cursor: pointer;
}
.header__nav-link--disabled {
  color: #c0bab2;
  pointer-events: none;
}

/* Mega dropdown */
.header__dropdown-wrap {
  position: relative;
}

.header__mega {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  background: var(--color-white);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-lg);
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2px;
  padding: 8px;
  min-width: 380px;
  z-index: 10;
}

.header__mega-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 12px;
  border-radius: 10px;
  text-decoration: none;
  color: var(--color-text);
  font-size: 13px;
  font-weight: 600;
  transition: background 0.1s;
}
.header__mega-item:hover {
  background: var(--color-bg);
}

.header__mega-icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 700;
  flex-shrink: 0;
  font-family: var(--font-serif);
}

.header__mega-name {
  flex: 1;
}
.header__mega-count {
  font-size: 11px;
  color: var(--color-text-faint);
  font-weight: 500;
}

/* Right actions */
.header__actions {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
}

.header__icon-btn {
  width: 38px;
  height: 38px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #6a7390;
  background: none;
  text-decoration: none;
  transition:
    background 0.15s,
    color 0.15s;
}
.header__icon-btn:hover {
  background: rgba(42, 46, 61, 0.06);
  color: var(--color-text);
}

.header__subscribe-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: var(--color-primary);
  color: #fff;
  font-size: 13px;
  font-weight: 700;
  padding: 9px 18px;
  border-radius: var(--radius-full);
  white-space: nowrap;
  letter-spacing: 0.01em;
  text-decoration: none;
  transition: background 0.15s;
}
.header__subscribe-btn:hover {
  background: var(--color-primary-dark);
}

/* Hamburger */
.header__burger {
  display: none;
  width: 40px;
  height: 40px;
  align-items: center;
  justify-content: center;
  background: none;
  border-radius: 8px;
  color: var(--color-text);
  margin-left: 8px;
  flex-shrink: 0;
  transition: background 0.15s;
}
.header__burger:hover {
  background: rgba(42, 46, 61, 0.06);
}

/* Mobile drawer */
.drawer-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.48);
  z-index: 200;
}

.drawer {
  position: fixed;
  top: 0;
  left: 0;
  width: 300px;
  height: 100dvh;
  background: var(--color-white);
  z-index: 201;
  display: flex;
  flex-direction: column;
  box-shadow: 20px 0 80px rgba(0, 0, 0, 0.22);
  overflow-y: auto;
}

.drawer__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 22px;
  border-bottom: 1px solid var(--color-border-faint);
}

.drawer__logo {
  font-family: var(--font-serif);
  font-size: 20px;
  font-weight: 700;
  color: var(--color-text);
}

.drawer__close {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #6a7390;
  background: none;
  transition: background 0.15s;
}
.drawer__close:hover {
  background: var(--color-border-faint);
}

.drawer__nav {
  padding: 10px 14px;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.drawer__section {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--color-text-faint);
  padding: 14px 14px 6px;
}

.drawer__link {
  display: flex;
  align-items: center;
  font-size: 16px;
  font-weight: 600;
  color: #5a6178;
  padding: 13px 14px;
  border-radius: 10px;
  text-decoration: none;
  transition: background 0.1s;
}
.drawer__link:hover {
  background: var(--color-bg);
}
.drawer__link--primary {
  font-weight: 700;
  color: var(--color-text);
  background: rgba(69, 104, 160, 0.06);
}
.drawer__link--sub {
  font-size: 14px;
  padding: 10px 14px 10px 20px;
}
.drawer__link--disabled {
  color: #c0bab2;
  pointer-events: none;
  font-style: italic;
  font-size: 14px;
}

.drawer__footer {
  padding: 18px 22px;
  border-top: 1px solid var(--color-border-faint);
}
.drawer__subscribe {
  display: block;
  text-align: center;
  background: var(--color-primary);
  color: #fff;
  font-size: 15px;
  font-weight: 700;
  padding: 15px;
  border-radius: var(--radius-full);
  text-decoration: none;
  transition: background 0.15s;
}
.drawer__subscribe:hover {
  background: var(--color-primary-dark);
}

/* Transitions */
.overlay-enter-active,
.overlay-leave-active {
  transition: opacity 0.2s ease;
}
.overlay-enter-from,
.overlay-leave-to {
  opacity: 0;
}

.drawer-enter-active {
  transition: transform 0.32s cubic-bezier(0.22, 1, 0.36, 1);
}
.drawer-leave-active {
  transition: transform 0.22s ease-in;
}
.drawer-enter-from,
.drawer-leave-to {
  transform: translateX(-100%);
}

/* Responsive */
@media (max-width: 768px) {
  .header__nav,
  .header__actions {
    display: none;
  }
  .header__burger {
    display: flex;
  }
}
</style>
