<template>
  <div class="share" :class="[`share--${size}`, { 'share--ghost': !bordered }]">
    <a
      v-for="target in shareLinks"
      :key="target.id"
      :href="target.href"
      target="_blank"
      rel="noopener noreferrer"
      class="share__btn"
      :aria-label="`Compartir en ${target.label}`"
      :title="target.label"
    >
      <svg
        v-if="target.id === 'whatsapp'"
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path d="M8 2a6 6 0 00-5.2 9l-.8 3 3.1-.8A6 6 0 108 2z" />
        <path
          d="M5.5 6.2c0-.4.3-.7.7-.7h.4c.3 0 .5.2.6.5l.3.9c.1.3 0 .6-.2.8l-.4.4c.4.9 1.1 1.6 2 2l.4-.4c.2-.2.5-.3.8-.2l.9.3c.3.1.5.3.5.6v.4c0 .4-.3.7-.7.7-2.9 0-5.3-2.4-5.3-5.3z"
        />
      </svg>
      <svg
        v-else-if="target.id === 'facebook'"
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <circle cx="8" cy="8" r="6.2" />
        <path d="M9.6 5.4H8.6c-.7 0-1.2.5-1.2 1.2v1h2.1l-.3 1.6H7.4V13" />
      </svg>
      <svg
        v-else-if="target.id === 'twitter'"
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path d="M3 3l10 10M13 3L3 13" />
      </svg>
      <svg
        v-else-if="target.id === 'telegram'"
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path d="M2.5 8.4l11-5.4-3.6 11-2.9-3.7-2.9 1.7v-2.6z" />
        <path d="M9.9 3l-5.4 5.4" />
      </svg>
      <svg
        v-else
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <rect x="2" y="3.5" width="12" height="9" rx="1.5" />
        <path d="M2.5 4.5l5.5 4.5 5.5-4.5" />
      </svg>
    </a>

    <button
      v-if="nativeShareSupported"
      type="button"
      class="share__btn"
      aria-label="Más opciones para compartir"
      title="Más opciones (Instagram, Mensajes…)"
      @click="nativeShare"
    >
      <svg
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <circle cx="12.5" cy="3.5" r="1.5" />
        <circle cx="3.5" cy="8" r="1.5" />
        <circle cx="12.5" cy="12.5" r="1.5" />
        <path d="M5 7l6-3M5 9l6 3" />
      </svg>
    </button>

    <button
      type="button"
      class="share__btn"
      :aria-label="copied ? 'Enlace copiado' : 'Copiar enlace'"
      :title="copied ? '¡Copiado!' : 'Copiar enlace'"
      @click="copyLink"
    >
      <svg
        v-if="!copied"
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <rect x="5.5" y="5.5" width="8" height="8" rx="2" />
        <path d="M10.5 5.5v-1a2 2 0 00-2-2h-4a2 2 0 00-2 2v4a2 2 0 002 2h1" />
      </svg>
      <svg
        v-else
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        stroke-width="1.6"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path d="M3 8.5l3.2 3.2L13 4.5" />
      </svg>
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { SHARE_TARGETS } from '@/utils/share'

// Un solo componente para las tres ubicaciones donde se puede compartir un
// artículo (encabezado, sidebar sticky, pie) — ver ArticleView.vue. Cada
// instancia arma sus propios links con la URL actual en el momento del
// click/render, así que sirve igual en cualquiera de los tres lugares.
const props = withDefaults(
  defineProps<{
    title: string
    excerpt?: string
    /** 'sm' para el encabezado (más compacto), 'md' para sidebar/pie. */
    size?: 'sm' | 'md'
    /** false = "fantasma" (sin fondo/borde), para que no compita con el header. */
    bordered?: boolean
  }>(),
  { size: 'md', bordered: true, excerpt: undefined }
)

const copied = ref(false)

const shareLinks = computed(() => {
  const opts = { url: window.location.href, title: props.title }
  return SHARE_TARGETS.map((target) => ({
    id: target.id,
    label: target.label,
    href: target.buildUrl(opts),
  }))
})

// Solo navegadores mobile (Android Chrome, iOS Safari) soportan esto — ahí
// abre la hoja nativa de compartir del sistema, que sí incluye Instagram,
// Mensajes, Notas, etc. En desktop el botón directamente no se muestra.
const nativeShareSupported = typeof navigator !== 'undefined' && !!navigator.share

async function nativeShare() {
  try {
    await navigator.share({ title: props.title, text: props.excerpt, url: window.location.href })
  } catch {
    // el usuario canceló el diálogo nativo — no es un error a mostrar
  }
}

async function copyLink() {
  await navigator.clipboard.writeText(window.location.href)
  copied.value = true
  setTimeout(() => (copied.value = false), 2000)
}
</script>

<style scoped>
.share {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.share__btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  background: var(--color-surface);
  border: 1px solid var(--color-line);
  border-radius: var(--radius-full);
  color: var(--color-ink-secondary);
  transition:
    border-color 0.2s ease,
    color 0.2s ease,
    background 0.2s ease;
}

.share__btn svg {
  width: 15px;
  height: 15px;
}

.share__btn:hover {
  border-color: var(--color-primary);
  color: var(--color-primary-dark);
}

.share--sm .share__btn {
  width: 28px;
  height: 28px;
}

.share--sm .share__btn svg {
  width: 13px;
  height: 13px;
}

/* Variante "fantasma": sin fondo ni borde propios, para convivir con el
   lavado de color del encabezado sin agregar otra superficie encima. */
.share--ghost .share__btn {
  background: transparent;
  border-color: transparent;
  color: var(--color-ink-faint);
}

.share--ghost .share__btn:hover {
  background: var(--color-surface);
  border-color: var(--color-line-light);
  color: var(--color-primary-dark);
}
</style>
