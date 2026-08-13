<template>
  <div class="deck">
    <span class="deck__label">
      <span class="deck__pulse" aria-hidden="true"></span>
      Lo último
    </span>

    <!-- Pila de arcos: las portadas reales de los artículos recientes en el
         motivo del arco, apiladas en abanico. Avanza sola; el visitante ve
         que hay más contenido sin tener que scrollear. -->
    <div
      class="deck__stage"
      @mouseenter="pause"
      @mouseleave="resume"
      @focusin="pause"
      @focusout="resume"
    >
      <template v-if="items.length">
        <!-- Los arcos son la superficie clickeable para el mouse, pero el
             nombre accesible lo aporta .deck__caption (un único destino por
             artículo para teclado y lectores de pantalla). -->
        <RouterLink
          v-for="(article, i) in items"
          :key="article.slug"
          :to="`/articulo/${article.slug}`"
          class="deck__arch"
          :style="slotStyle(i, article)"
          tabindex="-1"
          aria-hidden="true"
        >
          <img
            v-if="article.coverImage"
            :src="article.coverImage"
            alt=""
            class="deck__img"
            :loading="i === 0 ? 'eager' : 'lazy'"
          />
          <span v-else class="deck__mark">{{ themeOf(article).icon }}</span>
        </RouterLink>
      </template>

      <!-- Sin artículos (API caída o cargando): el arco decorativo de siempre,
           del mismo tamaño, para que no haya salto de layout al llegar. -->
      <div v-else class="deck__arch deck__arch--empty" aria-hidden="true">
        <span class="deck__mark">AT</span>
      </div>
    </div>

    <RouterLink
      v-if="active"
      :to="`/articulo/${active.slug}`"
      class="deck__caption"
      @mouseenter="pause"
      @mouseleave="resume"
      @focusin="pause"
      @focusout="resume"
    >
      <Transition name="cap" mode="out-in">
        <span :key="active.slug" class="deck__caption-in">
          <span
            class="pill deck__cat"
            :style="{ background: themeOf(active).bg, color: themeOf(active).accent }"
          >
            {{ categoryName(active) }}
          </span>
          <span class="deck__title">{{ active.title }}</span>
        </span>
      </Transition>

      <span class="deck__cta">
        Leer
        <svg
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
          stroke="currentColor"
          stroke-width="2.2"
          stroke-linecap="round"
          aria-hidden="true"
        >
          <path d="M2 7h10M7 2l5 5-5 5" />
        </svg>
      </span>
    </RouterLink>

    <div v-if="items.length > 1" class="deck__dots">
      <button
        v-for="(article, i) in items"
        :key="article.slug"
        type="button"
        class="deck__dot"
        :class="{ 'is-on': i === index }"
        :aria-label="`Ver: ${article.title}`"
        :aria-current="i === index ? 'true' : undefined"
        @click="goTo(i)"
      ></button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { getCategoryTheme } from '@/utils/theme'
import { useBlogStore } from '@/stores/blog'
import type { Article } from '@/types'

const props = defineProps<{ articles: Article[] }>()
const store = useBlogStore()

/**
 * Posiciones de la pila. El 0 va adelante; el 1 y el 2 asoman por detrás
 * rotados desde su base (`transform-origin` abajo), como fotos apoyadas
 * sobre una mesa. Del 3 en adelante se quedan en la posición del 2 pero
 * invisibles: así el que entra aparece con un fundido y el que sale se va
 * al fondo, sin saltos.
 */
const SLOTS = [
  { transform: 'translate(0, 0) rotate(0deg) scale(1)', opacity: 1 },
  { transform: 'translate(30px, -24px) rotate(6deg) scale(0.92)', opacity: 1 },
  { transform: 'translate(-26px, -42px) rotate(-7deg) scale(0.84)', opacity: 0.72 },
]

const MAX_ITEMS = 5
const ROTATE_MS = 6500

const items = computed(() => props.articles.slice(0, MAX_ITEMS))
const index = ref(0)

// Los artículos llegan async: si el índice quedó fuera de rango (o todavía
// no hay nada), esto evita un `undefined` en el template.
const active = computed(() => items.value[index.value % (items.value.length || 1)])

function themeOf(article: Article) {
  return getCategoryTheme(article.categories[0])
}

function categoryName(article: Article) {
  return store.getCategoryBySlug(article.categories[0])?.name ?? article.categories[0]
}

function slotOf(i: number) {
  const n = items.value.length
  return (i - index.value + n) % n
}

function slotStyle(i: number, article: Article) {
  const slot = slotOf(i)
  const pos = SLOTS[Math.min(slot, SLOTS.length - 1)]
  const hidden = slot >= SLOTS.length
  return {
    // El transform va como custom property, no como `transform` directo:
    // así el :hover del CSS puede componerle un translateY sin que el
    // estilo inline lo pise.
    '--slot-t': pos.transform,
    opacity: hidden ? 0 : pos.opacity,
    zIndex: String(SLOTS.length + 2 - Math.min(slot, SLOTS.length)),
    pointerEvents: slot === 0 ? 'auto' : 'none',
    background: article.coverImage ? undefined : themeOf(article).gradient,
  } as Record<string, string | number | undefined>
}

/* ── Rotación automática ── */
let timer: ReturnType<typeof setInterval> | undefined
let paused = false

function next() {
  if (items.value.length < 2) return
  index.value = (index.value + 1) % items.value.length
}

function start() {
  stop()
  if (paused || items.value.length < 2 || prefersReducedMotion()) return
  timer = setInterval(next, ROTATE_MS)
}

function stop() {
  if (timer) clearInterval(timer)
  timer = undefined
}

function pause() {
  paused = true
  stop()
}

function resume() {
  paused = false
  start()
}

function goTo(i: number) {
  index.value = i
  start() // reinicia el conteo para que no salte apenas elegiste
}

// Los artículos llegan por API *después* del montaje, así que en onMounted
// todavía no hay nada que rotar y start() se va sin crear el timer. Sin este
// watch la pila queda quieta para siempre en una carga limpia (con HMR no se
// notaba: el componente se re-montaba con los artículos ya en el store).
watch(
  () => items.value.length,
  (n) => {
    if (index.value >= n) index.value = 0
    start()
  }
)

function prefersReducedMotion() {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
}

// Con la pestaña en segundo plano el navegador congela requestAnimationFrame,
// así que las transiciones no avanzan: si el timer siguiera corriendo, al
// volver la pila aparecería desfasada de su ficha. Mejor frenar y retomar.
function onVisibility() {
  if (document.hidden) stop()
  else start()
}

onMounted(() => {
  start()
  document.addEventListener('visibilitychange', onVisibility)
})

onBeforeUnmount(() => {
  stop()
  document.removeEventListener('visibilitychange', onVisibility)
})
</script>

<style scoped>
.deck {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 16px;
}

/* ── Etiqueta ── */
.deck__label {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  align-self: center;
  font-size: 0.7rem;
  font-weight: 700;
  color: var(--color-ink-faint);
  text-transform: uppercase;
  letter-spacing: 0.14em;
}

.deck__pulse {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--color-primary);
  box-shadow: 0 0 0 0 var(--color-primary-soft);
  animation: deck-pulse 2.6s var(--ease-out-soft) infinite;
}

@keyframes deck-pulse {
  0% {
    box-shadow: 0 0 0 0 var(--color-primary-soft);
  }
  70% {
    box-shadow: 0 0 0 9px transparent;
  }
  100% {
    box-shadow: 0 0 0 0 transparent;
  }
}

/* ── Pila ── */
.deck__stage {
  position: relative;
  width: min(300px, 100%);
  aspect-ratio: 3 / 4;
  margin: 0 auto;
}

.deck__arch {
  position: absolute;
  inset: 0;
  overflow: hidden;
  /* El arco: cúpula casi semicircular arriba, esquinas suaves abajo. */
  border-radius: 999px 999px var(--radius-lg) var(--radius-lg) / 38% 38% var(--radius-lg)
    var(--radius-lg);
  transform-origin: 50% 100%;
  transform: var(--slot-t);
  /* Anillo interior: enmarca la foto sin sumar un borde duro. */
  box-shadow:
    var(--shadow-lg),
    inset 0 0 0 1px rgba(255, 253, 250, 0.16);
  transition:
    transform 0.85s var(--ease-out-soft),
    opacity 0.85s var(--ease-out-soft),
    box-shadow 0.45s var(--ease-out-soft);
}

.deck__arch--empty {
  background: var(--cat-at-grad);
  box-shadow: var(--shadow-bloom);
}

.deck__arch:hover {
  transform: var(--slot-t) translateY(-6px);
  box-shadow:
    var(--shadow-bloom),
    inset 0 0 0 1px rgba(255, 253, 250, 0.22);
}

.deck__img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  /* Sesgo hacia arriba: la cúpula recorta las esquinas superiores y así
     las caras quedan dentro del arco, no cortadas. */
  object-position: center 35%;
  transition: transform 0.9s var(--ease-out-soft);
}

.deck__arch:hover .deck__img {
  transform: scale(1.05);
}

/* Viñeta: apoya la ficha flotante y da profundidad a la foto. */
.deck__arch::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(20, 16, 12, 0) 45%, rgba(20, 16, 12, 0.42) 100%);
  pointer-events: none;
}

.deck__mark {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-display);
  font-variation-settings:
    'SOFT' 70,
    'WONK' 1;
  font-size: 4.5rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.22);
  letter-spacing: -0.05em;
  user-select: none;
}

/* ── Ficha flotante ── */
.deck__caption {
  position: relative;
  z-index: 8;
  /* Monta sobre la base del arco y se corre a la izquierda: el quiebre de
     eje es lo que hace que la composición no se lea como una tarjeta más. */
  margin: -58px 26px 0 0;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 10px;
  background: var(--color-surface);
  border: 1px solid var(--color-line-light);
  border-radius: var(--radius-xl);
  padding: 18px 20px 16px;
  color: inherit;
  box-shadow: var(--shadow-lg);
  transition:
    transform 0.4s var(--ease-out-soft),
    box-shadow 0.4s var(--ease-out-soft),
    border-color 0.3s ease;
}

.deck__caption:hover {
  transform: translateY(-3px);
  border-color: var(--color-primary-light);
  box-shadow: var(--shadow-bloom);
}

.deck__caption-in {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 9px;
}

.deck__cat {
  font-size: 0.66rem;
  font-weight: 700;
  padding: 0.2rem 0.62rem;
  border-radius: var(--radius-full);
  line-height: 1.4;
}

.deck__title {
  font-family: var(--font-display);
  font-variation-settings:
    'SOFT' 60,
    'WONK' 1;
  font-size: 1.04rem;
  font-weight: 600;
  line-height: 1.32;
  letter-spacing: -0.015em;
  color: var(--color-ink);
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  transition: color 0.25s ease;
}

.deck__caption:hover .deck__title {
  color: var(--color-primary-dark);
}

.deck__cta {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--color-primary-dark);
}

.deck__cta svg {
  transition: transform 0.3s var(--ease-out-soft);
}

.deck__caption:hover .deck__cta svg {
  transform: translateX(3px);
}

/* Cambio de artículo: un fundido corto, sin desplazamientos bruscos. */
.cap-enter-active,
.cap-leave-active {
  transition:
    opacity 0.3s ease,
    transform 0.3s var(--ease-out-soft);
}

.cap-enter-from {
  opacity: 0;
  transform: translateY(7px);
}

.cap-leave-to {
  opacity: 0;
  transform: translateY(-7px);
}

/* ── Indicadores ── */
.deck__dots {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
}

.deck__dot {
  width: 16px;
  height: 4px;
  border-radius: var(--radius-full);
  background: var(--color-line);
  transition:
    width 0.4s var(--ease-out-soft),
    background 0.3s ease;
}

.deck__dot:hover {
  background: var(--color-primary-light);
}

.deck__dot.is-on {
  width: 28px;
  background: var(--color-primary);
}

/* ── Responsive ── */
@media (max-width: 1024px) {
  .deck {
    align-items: center;
  }

  .deck__caption {
    margin-right: 0;
    width: min(340px, 100%);
  }
}

@media (prefers-reduced-motion: reduce) {
  .deck__pulse {
    animation: none;
  }
}
</style>
