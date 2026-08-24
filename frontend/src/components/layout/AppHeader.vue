<template>
  <header class="hdr" :class="{ 'hdr--scrolled': scrolled }">
    <div class="container hdr__inner">
      <RouterLink to="/" class="hdr__logo" aria-label="NexoAT — inicio">
        Nexo<span class="hdr__logo-mark">AT</span>
      </RouterLink>

      <nav class="hdr__nav" aria-label="Navegación principal">
        <RouterLink to="/" class="hdr__link" :class="{ 'is-active': $route.path === '/' }">
          Inicio
        </RouterLink>

        <div class="hdr__drop" @mouseenter="showCats = true" @mouseleave="showCats = false">
          <button
            class="hdr__link hdr__link--btn"
            :class="{ 'is-active': showCats }"
            :aria-expanded="showCats"
            aria-haspopup="true"
            @click="showCats = !showCats"
          >
            Temas
            <svg
              class="hdr__caret"
              :class="{ 'is-open': showCats }"
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

          <Transition name="mega">
            <!-- Agrupado por Eje (no lista plana de 19 categorías): con
                 170+ artículos, alguien que recién llega necesita una
                 primera pista de "por dónde empezar según quién es" antes
                 de ver el detalle de cada tema. Ver docs/features/
                 sidebar-navigation.md. -->
            <div v-show="showCats" class="mega">
              <div v-for="group in trackGroups" :key="group.label" class="mega__col">
                <span class="mega__col-label" :style="{ color: group.color }">{{
                  group.label
                }}</span>
                <RouterLink
                  v-for="cat in group.categories"
                  :key="cat.slug"
                  :to="`/categoria/${cat.slug}`"
                  class="mega__item"
                  @click="showCats = false"
                >
                  <span
                    class="mega__glyph"
                    :style="{ background: cat.bg, color: cat.accent }"
                    aria-hidden="true"
                    >{{ cat.icon }}</span
                  >
                  <span class="mega__name">{{ cat.name }}</span>
                  <span class="mega__count">{{ cat.articleCount }}</span>
                </RouterLink>
              </div>
            </div>
          </Transition>
        </div>

        <RouterLink
          to="/acerca-de"
          class="hdr__link"
          :class="{ 'is-active': $route.path === '/acerca-de' }"
        >
          Acerca de
        </RouterLink>
      </nav>

      <div class="hdr__actions">
        <ThemeToggle />
        <RouterLink to="/buscar" class="hdr__icon" aria-label="Buscar artículos">
          <svg
            width="17"
            height="17"
            viewBox="0 0 18 18"
            fill="none"
            stroke="currentColor"
            stroke-width="1.7"
            stroke-linecap="round"
            aria-hidden="true"
          >
            <circle cx="7.5" cy="7.5" r="5" />
            <path d="M11.5 11.5L16 16" />
          </svg>
        </RouterLink>

        <UserMenu v-if="authStore.isAuthenticated" />
        <RouterLink v-else to="/ingresar" class="btn btn--primary hdr__cta">Ingresar</RouterLink>
      </div>

      <button class="hdr__burger" aria-label="Abrir menú" @click="menuOpen = true">
        <svg
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          stroke-width="1.7"
          stroke-linecap="round"
          aria-hidden="true"
        >
          <path d="M3 6h14M3 10h14M3 14h14" />
        </svg>
      </button>
    </div>
  </header>

  <Teleport to="body">
    <Transition name="fade">
      <div v-if="menuOpen" class="scrim" @click="menuOpen = false" />
    </Transition>
    <Transition name="slide">
      <aside v-if="menuOpen" class="drawer" aria-label="Menú de navegación">
        <div class="drawer__top">
          <span class="hdr__logo">Nexo<span class="hdr__logo-mark">AT</span></span>
          <button class="drawer__close" aria-label="Cerrar menú" @click="menuOpen = false">
            <svg
              width="17"
              height="17"
              viewBox="0 0 18 18"
              fill="none"
              stroke="currentColor"
              stroke-width="1.7"
              stroke-linecap="round"
              aria-hidden="true"
            >
              <path d="M3 3l12 12M15 3L3 15" />
            </svg>
          </button>
        </div>

        <nav class="drawer__nav">
          <RouterLink to="/" class="drawer__link" @click="menuOpen = false">Inicio</RouterLink>
          <RouterLink to="/acerca-de" class="drawer__link" @click="menuOpen = false"
            >Acerca de</RouterLink
          >
          <RouterLink to="/buscar" class="drawer__link" @click="menuOpen = false"
            >Buscar</RouterLink
          >

          <template v-for="group in trackGroups" :key="group.label">
            <span class="eyebrow drawer__section" :style="{ color: group.color }">{{
              group.label
            }}</span>
            <RouterLink
              v-for="cat in group.categories"
              :key="cat.slug"
              :to="`/categoria/${cat.slug}`"
              class="drawer__link drawer__link--sub"
              @click="menuOpen = false"
            >
              <span
                class="drawer__dot"
                :style="{ background: cat.accent }"
                aria-hidden="true"
              ></span>
              {{ cat.name }}
            </RouterLink>
          </template>
        </nav>

        <div class="drawer__foot">
          <template v-if="authStore.isAuthenticated">
            <div class="drawer__session">
              <span class="drawer__session-name">{{
                authStore.user?.name || authStore.user?.email
              }}</span>
            </div>
            <RouterLink
              to="/mi-cuenta/perfil"
              class="drawer__link drawer__link--sub"
              @click="menuOpen = false"
            >
              <span class="drawer__glyph" aria-hidden="true">👤</span>
              Mi perfil
            </RouterLink>
            <RouterLink
              to="/mi-cuenta/guardados"
              class="drawer__link drawer__link--sub"
              @click="menuOpen = false"
            >
              <span class="drawer__glyph" aria-hidden="true">🔖</span>
              Artículos guardados
            </RouterLink>
            <RouterLink
              to="/mi-cuenta/historial"
              class="drawer__link drawer__link--sub"
              @click="menuOpen = false"
            >
              <span class="drawer__glyph" aria-hidden="true">🕮</span>
              Historial de lectura
            </RouterLink>
            <RouterLink
              to="/mi-cuenta/preferencias"
              class="drawer__link drawer__link--sub"
              @click="menuOpen = false"
            >
              <span class="drawer__glyph" aria-hidden="true">✉</span>
              Preferencias de correo
            </RouterLink>
            <RouterLink
              to="/planes"
              class="drawer__link drawer__link--sub"
              @click="menuOpen = false"
            >
              <span class="drawer__glyph" aria-hidden="true">✦</span>
              Planes y suscripción
            </RouterLink>
            <RouterLink
              v-if="isStaff"
              to="/nexoat-admin"
              class="drawer__link drawer__link--sub"
              @click="menuOpen = false"
            >
              <span class="drawer__glyph" aria-hidden="true">⚙</span>
              Panel de administración
            </RouterLink>
            <button type="button" class="btn btn--ghost drawer__logout" @click="onLogout">
              Cerrar sesión
            </button>
          </template>
          <RouterLink
            v-else
            to="/ingresar"
            class="btn btn--primary drawer__login"
            @click="menuOpen = false"
          >
            Ingresar
          </RouterLink>
        </div>
      </aside>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { useBlogStore } from '@/stores/blog'
import { useAuthStore } from '@/stores/auth'
import { CATEGORY_TRACK_MAP, TRACK_CHIPS } from '@/utils/theme'
import ThemeToggle from '@/components/ui/ThemeToggle.vue'
import UserMenu from '@/components/ui/UserMenu.vue'
import type { Category, ContentTrack } from '@/types'

const store = useBlogStore()
const authStore = useAuthStore()
const showCats = ref(false)
const menuOpen = ref(false)
const scrolled = ref(false)

const TRACKS: ContentTrack[] = [
  'acompanamiento-terapeutico',
  'cuidado-de-mayores',
  'recursos-profesionales-at',
]
const TRACK_DOT: Record<ContentTrack, string> = {
  'acompanamiento-terapeutico': 'var(--color-primary-dark)',
  'cuidado-de-mayores': 'var(--color-accent-dark)',
  'recursos-profesionales-at': 'var(--color-ochre)',
}

/**
 * Agrupa las categorías del menú "Temas" por Eje temático, usando el mapeo
 * curado `CATEGORY_TRACK_MAP` (no los `tracks` reales de los artículos
 * cargados — ver el comentario de esa constante en `utils/theme.ts`: los
 * tracks por artículo se solapan mucho entre categorías y desbordaban el
 * menú además de agrupar mal). Las categorías ausentes del mapeo (ej.
 * "Familia y Vínculos", intencionalmente "sin eje prioritario") van a un
 * grupo "Otros temas".
 */
interface TrackGroup {
  track: ContentTrack | null
  label: string
  color: string
  categories: Category[]
}

const trackGroups = computed<TrackGroup[]>(() => {
  const groups: TrackGroup[] = TRACKS.map((track) => ({
    track,
    label: TRACK_CHIPS[track].label,
    color: TRACK_DOT[track],
    categories: [],
  }))
  const otros: Category[] = []

  for (const cat of store.categories) {
    const track = CATEGORY_TRACK_MAP[cat.slug]
    const group = groups.find((g) => g.track === track)
    ;(group?.categories ?? otros).push(cat)
  }

  if (otros.length) {
    groups.push({
      track: null,
      label: 'Otros temas',
      color: 'var(--color-ink-faint)',
      categories: otros,
    })
  }

  return groups.filter((g) => g.categories.length)
})

const isStaff = computed(() => authStore.hasRole('SUPER_ADMIN', 'ADMIN', 'EDITOR'))

function onLogout() {
  menuOpen.value = false
  authStore.logout()
}

function onScroll() {
  scrolled.value = window.scrollY > 12
}

// Bloquea el scroll de fondo mientras el drawer está abierto.
watch(menuOpen, (open) => {
  document.body.style.overflow = open ? 'hidden' : ''
})

onMounted(() => {
  window.addEventListener('scroll', onScroll, { passive: true })
  onScroll()
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', onScroll)
  document.body.style.overflow = ''
})
</script>

<style scoped>
.hdr {
  position: sticky;
  top: 0;
  z-index: 100;
  background: var(--nx-header-bg);
  backdrop-filter: blur(14px) saturate(1.4);
  -webkit-backdrop-filter: blur(14px) saturate(1.4);
  border-bottom: 1px solid transparent;
  transition:
    border-color 0.35s ease,
    box-shadow 0.35s ease;
}

.hdr--scrolled {
  border-bottom-color: var(--nx-header-border);
  box-shadow: var(--shadow-sm);
}

.hdr__inner {
  display: flex;
  align-items: center;
  gap: 10px;
  height: 72px;
  /* Ancla el mega-menú acá (no en `.hdr__drop`, ver esa regla): así su
     `left: 0` alinea contra el borde del header/container, no contra la
     posición del botón "Temas" — que no está pegado a ese borde, así que
     un `left: 0` relativo a él hacía que el menú se saliera por la
     derecha en ventanas angostas. */
  position: relative;
}

/* Logo */
.hdr__logo {
  font-family: var(--font-display);
  font-variation-settings:
    'SOFT' 70,
    'WONK' 1;
  font-size: 1.4rem;
  font-weight: 600;
  letter-spacing: -0.03em;
  flex-shrink: 0;
  margin-right: 26px;
}

.hdr__logo-mark {
  color: var(--color-primary);
}

/* Navegación */
.hdr__nav {
  display: flex;
  align-items: center;
  gap: 2px;
  flex: 1;
}

.hdr__link {
  position: relative;
  font-size: 0.92rem;
  font-weight: 600;
  color: var(--color-ink-secondary);
  padding: 8px 14px;
  border-radius: var(--radius-full);
  display: inline-flex;
  align-items: center;
  gap: 5px;
  transition:
    background 0.2s ease,
    color 0.2s ease;
  white-space: nowrap;
}

.hdr__link:hover {
  background: var(--color-hover-bg);
  color: var(--color-ink);
}

.hdr__link.is-active {
  color: var(--color-primary-dark);
  background: var(--color-primary-tint);
}

.hdr__caret {
  transition: transform 0.3s var(--ease-out-soft);
}

.hdr__caret.is-open {
  transform: rotate(180deg);
}

/* Mega menú — `.hdr__drop` NO lleva `position: relative`: el ancla de
   `.mega` es `.hdr__inner` (ver esa regla), a propósito. */

.mega {
  position: absolute;
  top: calc(100% + 10px);
  /* 32px = el `padding-inline` de `.container` (ver main.css) — alinea el
     borde del menú con el logo/contenido, no con el borde de la ventana.
     Fijo (no depende del viewport): el ancla es la propia caja de
     `.hdr__inner`, cuyo padding es ese mismo valor sin importar dónde
     caiga esa caja en la pantalla. Este menú solo es alcanzable en
     viewports ≥900px, por encima del breakpoint mobile que baja ese
     padding a 20px, así que el valor fijo es seguro acá. */
  left: 32px;
  background: var(--color-surface-raised);
  border: 1px solid var(--color-line-light);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-lg);
  display: flex;
  align-items: flex-start;
  padding: 14px 6px;
  z-index: 10;
  /* 4 columnas × 180px + separadores ≈ 800px, entra sobrado bajo este
     máximo incluso en el viewport más angosto donde este menú es
     alcanzable (900px — por debajo pasa a ser el drawer mobile). No hace
     falta wrap ni scroll: NO usar `flex-wrap`/`overflow-x` acá — con
     `position: absolute` y ancho automático, `flex-wrap: wrap` colapsa el
     contenedor a una sola columna por fila en vez de intentar que entren
     todas (comprobado en vivo: se probó y se descartó). */
  max-width: calc(100vw - 64px);
}

.mega__col {
  display: flex;
  flex-direction: column;
  gap: 1px;
  width: 180px;
  flex-shrink: 0;
  padding-inline: 6px;
  max-height: calc(100vh - 140px);
  overflow-y: auto;
  /* Explícito: si solo se declara `overflow-y`, la spec de CSS fuerza
     `overflow-x` al mismo valor no-visible (acá se veía como una
     scrollbar horizontal fea por columna) — hay que declarar los dos ejes
     a mano para que no se acoplen. */
  overflow-x: hidden;
}

.mega__col + .mega__col {
  border-left: 1px solid var(--color-line-faint);
  margin-left: 6px;
  padding-left: 16px;
}

.mega__col-label {
  font-size: 0.66rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.09em;
  padding: 4px 8px 10px;
}

.mega__item {
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 9px 12px;
  border-radius: var(--radius-md);
  font-size: 0.85rem;
  font-weight: 600;
  transition: background 0.18s ease;
}

.mega__item:hover {
  background: var(--color-canvas-alt);
}

.mega__glyph {
  width: 32px;
  height: 32px;
  border-radius: 999px 999px 9px 9px / 18px 18px 9px 9px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-display);
  font-variation-settings: 'SOFT' 60;
  font-size: 0.66rem;
  font-weight: 700;
  letter-spacing: 0.03em;
  flex-shrink: 0;
}

.mega__name {
  flex: 1;
  /* Sin esto, un flex item no se encoge por debajo de su ancho de
     contenido en una sola línea (min-width:auto por default) y un nombre
     largo ("Acompañamiento Terapéutico") desborda la columna en vez de
     hacer wrap — con min-width:0 sí puede achicarse y partir en líneas. */
  min-width: 0;
  line-height: 1.35;
}

.mega__count {
  font-size: 0.7rem;
  color: var(--color-ink-faint);
  font-weight: 600;
}

.mega-enter-active,
.mega-leave-active {
  transition:
    opacity 0.22s ease,
    transform 0.22s var(--ease-out-soft);
}

.mega-enter-from,
.mega-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

/* Acciones */
.hdr__actions {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-left: auto;
}

.hdr__icon {
  width: 38px;
  height: 38px;
  border-radius: var(--radius-full);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-ink-muted);
  transition:
    background 0.2s ease,
    color 0.2s ease;
}

.hdr__icon:hover {
  background: var(--color-hover-bg);
  color: var(--color-ink);
}

.hdr__cta {
  font-size: 0.85rem;
  padding: 0.6rem 1.25rem;
  margin-left: 4px;
}

/* Hamburguesa */
.hdr__burger {
  display: none;
  width: 40px;
  height: 40px;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-full);
  color: var(--color-ink);
  margin-left: auto;
  flex-shrink: 0;
  transition: background 0.2s ease;
}

.hdr__burger:hover {
  background: var(--color-hover-bg);
}

/* Drawer */
.scrim {
  position: fixed;
  inset: 0;
  background: rgba(30, 24, 18, 0.5);
  backdrop-filter: blur(3px);
  z-index: 200;
}

.drawer {
  position: fixed;
  top: 0;
  left: 0;
  width: min(320px, 86vw);
  height: 100dvh;
  background: var(--color-surface);
  z-index: 201;
  display: flex;
  flex-direction: column;
  box-shadow: 24px 0 80px rgba(30, 24, 18, 0.24);
  overflow-y: auto;
  border-radius: 0 var(--radius-2xl) var(--radius-2xl) 0;
}

.drawer__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid var(--color-line-faint);
}

.drawer__close {
  width: 36px;
  height: 36px;
  border-radius: var(--radius-full);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-ink-muted);
  transition: background 0.2s ease;
}

.drawer__close:hover {
  background: var(--color-hover-bg);
}

.drawer__nav {
  padding: 12px 16px;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.drawer__section {
  padding: 20px 12px 8px;
}

.drawer__link {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-ink-secondary);
  padding: 12px 14px;
  border-radius: var(--radius-md);
  transition:
    background 0.18s ease,
    color 0.18s ease;
}

.drawer__link:hover {
  background: var(--color-canvas-alt);
  color: var(--color-ink);
}

.drawer__link--sub {
  font-size: 0.88rem;
  padding: 10px 14px;
  /* Algunos `.drawer__link--sub` son `<button>` (ítems mockeados de
     cuenta): sin esto no ocupan el ancho de la columna como los
     RouterLink vecinos. */
  width: 100%;
  text-align: left;
}

.drawer__dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
}

.drawer__foot {
  padding: 20px 24px;
  border-top: 1px solid var(--color-line-faint);
}

.drawer__login {
  width: 100%;
}

.drawer__session {
  padding: 0 14px 6px;
}

.drawer__session-name {
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--color-ink);
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.drawer__glyph {
  width: 20px;
  text-align: center;
  flex-shrink: 0;
}

.drawer__logout {
  width: 100%;
  margin-top: 12px;
}

/* Transiciones */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.slide-enter-active {
  transition: transform 0.4s var(--ease-out-soft);
}

.slide-leave-active {
  transition: transform 0.28s ease-in;
}

.slide-enter-from,
.slide-leave-to {
  transform: translateX(-100%);
}

/* Responsive */
@media (max-width: 900px) {
  .hdr__nav,
  .hdr__actions {
    display: none;
  }

  .hdr__burger {
    display: flex;
  }
}
</style>
