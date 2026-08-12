<template>
  <div v-if="isLoading" class="container art-loading">
    <p class="section-lead">Cargando artículo…</p>
  </div>

  <div v-else-if="article" class="art-page">
    <!-- Cabecera a ancho completo -->
    <header class="art-head">
      <div class="art-head__wash" :style="{ background: theme.gradient }" aria-hidden="true"></div>

      <div class="container art-head__inner">
        <nav class="crumb" aria-label="Ruta de navegación">
          <RouterLink to="/">Inicio</RouterLink>
          <span aria-hidden="true">/</span>
          <RouterLink v-if="primaryCategory" :to="`/categoria/${article.categories[0]}`">
            {{ primaryCategory.name }}
          </RouterLink>
        </nav>

        <div class="art-head__chips">
          <AppChip variant="category">{{ primaryCategory?.name }}</AppChip>
          <AppChip :variant="`level-${article.level}`">{{ levelLabel }}</AppChip>
          <AppChip
            v-for="aud in article.audience"
            :key="aud"
            :variant="`audience-${aud === 'cuidadores-familiares' ? 'cuidadores' : 'profesionales'}`"
          >
            {{ aud === 'cuidadores-familiares' ? 'Para familias' : 'Para profesionales' }}
          </AppChip>
        </div>

        <h1 class="art-head__title">{{ article.title }}</h1>
        <p class="art-head__sub">{{ article.subtitle }}</p>

        <div class="art-head__meta">
          <span>{{ formattedDate }}</span>
          <span v-if="article.readingTimeMinutes" class="art-head__dot" aria-hidden="true"></span>
          <span v-if="article.readingTimeMinutes">
            {{ article.readingTimeMinutes }} min de lectura
          </span>
        </div>
      </div>
    </header>

    <div class="container art-layout">
      <article class="art">
        <figure v-if="article.coverImage" class="art__cover">
          <img :src="article.coverImage" :alt="article.title" />
        </figure>

        <div v-if="contentHtml" class="prose art__body" v-html="contentHtml"></div>
        <div v-else class="prose art__body">
          <p class="art__note">No se pudo cargar el contenido de este artículo.</p>
        </div>

        <section v-if="article.sources.length" class="art__sources">
          <h2 class="eyebrow art__sources-title">Fuentes</h2>
          <ol class="art__sources-list">
            <li v-for="source in article.sources" :key="source.url" class="art__source">
              <a
                :href="source.url"
                target="_blank"
                rel="noopener noreferrer"
                class="art__source-link"
              >
                {{ source.title }}
              </a>
              <p v-if="source.description" class="art__source-desc">{{ source.description }}</p>
            </li>
          </ol>
        </section>

        <footer class="art__foot">
          <aside class="art__disclaimer">
            <strong>Nota</strong>
            Este artículo tiene fines informativos y no reemplaza la consulta con un profesional de
            salud.
          </aside>

          <div class="art__share">
            <span class="art__share-label">Compartir</span>
            <div class="art__share-row">
              <a
                v-for="target in shareLinks"
                :key="target.id"
                :href="target.href"
                target="_blank"
                rel="noopener noreferrer"
                class="art__share-icon"
                :aria-label="`Compartir en ${target.label}`"
                :title="target.label"
              >
                <svg
                  v-if="target.id === 'whatsapp'"
                  width="15"
                  height="15"
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
                  width="15"
                  height="15"
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
                  width="15"
                  height="15"
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
                  width="15"
                  height="15"
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
                  width="15"
                  height="15"
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
                class="art__share-icon"
                aria-label="Más opciones para compartir"
                title="Más opciones (Instagram, Mensajes…)"
                @click="nativeShare"
              >
                <svg
                  width="15"
                  height="15"
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

              <button class="art__share-btn" @click="copyLink">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.6"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  aria-hidden="true"
                >
                  <rect x="5.5" y="5.5" width="8" height="8" rx="2" />
                  <path d="M10.5 5.5v-1a2 2 0 00-2-2h-4a2 2 0 00-2 2v4a2 2 0 002 2h1" />
                </svg>
                {{ copied ? '¡Copiado!' : 'Copiar enlace' }}
              </button>
            </div>
          </div>

          <div v-if="article.keywords.length" class="art__tags">
            <span v-for="kw in article.keywords" :key="kw" class="art__tag">{{ kw }}</span>
          </div>
        </footer>
      </article>

      <aside class="side">
        <div class="side__sticky">
          <div class="side__block">
            <h2 class="eyebrow side__title">Seguir leyendo</h2>
            <RouterLink
              v-for="rel in related"
              :key="rel.slug"
              :to="`/articulo/${rel.slug}`"
              class="side__rel"
            >
              <span class="side__rel-title">{{ rel.title }}</span>
              <span class="side__rel-meta">{{ rel.readingTimeMinutes }} min</span>
            </RouterLink>
            <p v-if="!related.length" class="side__empty">Pronto habrá más en esta categoría.</p>
          </div>

          <div class="side__block">
            <h2 class="eyebrow side__title">Todos los temas</h2>
            <nav class="side__cats">
              <RouterLink
                v-for="cat in store.categories"
                :key="cat.slug"
                :to="`/categoria/${cat.slug}`"
                class="side__cat"
              >
                <span class="side__cat-dot" :style="{ background: cat.accent }"></span>
                <span class="side__cat-name">{{ cat.name }}</span>
                <span class="side__cat-count">{{ cat.articleCount }}</span>
              </RouterLink>
            </nav>
          </div>
        </div>
      </aside>
    </div>
  </div>

  <div v-else class="container art-missing">
    <h1 class="section-title">No encontramos ese artículo</h1>
    <p class="section-lead">Puede que haya cambiado de dirección o que ya no esté publicado.</p>
    <RouterLink to="/" class="btn btn--primary">Volver al inicio</RouterLink>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watchEffect } from 'vue'
import { useRoute } from 'vue-router'
import { useBlogStore } from '@/stores/blog'
import { getCategoryTheme } from '@/utils/theme'
import { http } from '@/services/http'
import { renderMarkdown } from '@/utils/markdown'
import { SHARE_TARGETS } from '@/utils/share'
import AppChip from '@/components/ui/AppChip.vue'
import type { ArticleFull } from '@/types'

const route = useRoute()
const store = useBlogStore()
const copied = ref(false)

// Se pide directo por slug (no se deriva de store.articles): trae el
// contenido completo, que la lista pública no incluye, y no depende de que
// fetchArticles() ya haya resuelto al entrar directo a esta URL.
const article = ref<ArticleFull | null>(null)
const isLoading = ref(true)

const contentHtml = computed(() => (article.value ? renderMarkdown(article.value.content) : ''))

watchEffect(async () => {
  const slug = route.params.slug
  if (typeof slug !== 'string') return
  isLoading.value = true
  try {
    article.value = await http<ArticleFull>(`/articles/${slug}`, { skipAuthRetry: true })
  } catch {
    article.value = null
  } finally {
    isLoading.value = false
  }
})

const primaryCategory = computed(() =>
  article.value ? store.getCategoryBySlug(article.value.categories[0]) : undefined
)

const theme = computed(() =>
  getCategoryTheme(article.value?.categories[0] ?? 'acompanamiento-terapeutico')
)

const related = computed(() => {
  if (!article.value) return []
  const slug = article.value.categories[0]
  return store.articles
    .filter((a) => a.slug !== article.value!.slug && a.categories.includes(slug))
    .slice(0, 3)
})

const formattedDate = computed(() =>
  article.value
    ? new Date(article.value.date).toLocaleDateString('es-AR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : ''
)

const levelLabel = computed(
  () =>
    ({ basico: 'Básico', intermedio: 'Intermedio', avanzado: 'Avanzado' })[
      article.value?.level ?? 'basico'
    ]
)

async function copyLink() {
  await navigator.clipboard.writeText(window.location.href)
  copied.value = true
  setTimeout(() => (copied.value = false), 2000)
}

// Links directos por red — no requieren SDK ni credenciales (ver
// utils/share.ts). Instagram no tiene un intent equivalente, se cubre con
// la Web Share API nativa de abajo cuando el navegador la soporta.
const shareLinks = computed(() => {
  if (!article.value) return []
  const opts = { url: window.location.href, title: article.value.title }
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
  if (!article.value) return
  try {
    await navigator.share({
      title: article.value.title,
      text: article.value.excerpt,
      url: window.location.href,
    })
  } catch {
    // el usuario canceló el diálogo nativo — no es un error a mostrar
  }
}
</script>

<style scoped>
/* ── Cabecera ── */
.art-head {
  position: relative;
  padding: 48px 0 44px;
  overflow: hidden;
  background: var(--color-canvas-alt);
  border-bottom: 1px solid var(--color-line-light);
}

/* Lavado de color de la categoría, muy tenue */
.art-head__wash {
  position: absolute;
  top: -60%;
  left: 50%;
  width: 900px;
  height: 500px;
  transform: translateX(-50%);
  filter: blur(90px);
  opacity: 0.16;
  pointer-events: none;
}

.art-head__inner {
  position: relative;
  max-width: 860px;
}

.crumb {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 9px;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--color-ink-faint);
  margin-bottom: 26px;
}

.crumb a {
  color: var(--color-ink-muted);
  transition: color 0.2s ease;
}

.crumb a:hover {
  color: var(--color-primary-dark);
}

.art-head__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  margin-bottom: 20px;
}

.art-head__title {
  font-size: clamp(2rem, 4.6vw, 3.3rem);
  font-weight: 600;
  line-height: 1.1;
  letter-spacing: -0.035em;
  margin-bottom: 16px;
}

.art-head__sub {
  font-family: var(--font-display);
  font-variation-settings: 'SOFT' 70;
  font-size: clamp(1.05rem, 1.8vw, 1.3rem);
  font-style: italic;
  color: var(--color-ink-secondary);
  line-height: 1.6;
  margin-bottom: 22px;
  max-width: 58ch;
}

.art-head__meta {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--color-ink-faint);
}

.art-head__dot {
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: var(--color-ink-faint);
}

/* ── Layout ── */
.art-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 290px;
  gap: 64px;
  padding-block: 56px 96px;
  align-items: start;
}

.art__cover {
  border-radius: var(--radius-xl);
  overflow: hidden;
  margin-bottom: 40px;
}

.art__cover img {
  width: 100%;
  aspect-ratio: 16 / 9;
  object-fit: cover;
}

.art__note {
  background: var(--color-surface-sunken);
  border-radius: var(--radius-lg);
  padding: 40px 32px;
  text-align: center;
  font-style: italic;
  color: var(--color-ink-muted);
  font-size: 0.98rem;
}

/* ── Fuentes ── */
.art__sources {
  margin-top: 48px;
  padding-top: 32px;
  border-top: 1px solid var(--color-line-light);
  max-width: var(--container-prose);
}

.art__sources-title {
  margin-bottom: 16px;
}

.art__sources-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
  list-style: none;
  counter-reset: source;
}

.art__source {
  counter-increment: source;
  padding-left: 26px;
  position: relative;
}

.art__source::before {
  content: counter(source) '.';
  position: absolute;
  left: 0;
  font-weight: 700;
  color: var(--color-ink-faint);
  font-size: 0.86rem;
}

.art__source-link {
  font-weight: 600;
  color: var(--color-primary-dark);
  line-height: 1.5;
  text-decoration: underline;
  text-decoration-color: var(--color-line);
  text-underline-offset: 3px;
  transition: text-decoration-color 0.2s ease;
}

.art__source-link:hover {
  text-decoration-color: currentColor;
}

.art__source-desc {
  margin-top: 4px;
  font-size: 0.86rem;
  line-height: 1.6;
  color: var(--color-ink-muted);
}

/* ── Pie del artículo ── */
.art__foot {
  margin-top: 64px;
  padding-top: 36px;
  border-top: 1px solid var(--color-line-light);
  display: flex;
  flex-direction: column;
  gap: 28px;
  max-width: var(--container-prose);
}

.art__disclaimer {
  display: block;
  background: var(--color-ochre-soft);
  border-left: 3px solid var(--color-ochre);
  border-radius: 0 var(--radius-md) var(--radius-md) 0;
  padding: 18px 22px;
  font-size: 0.88rem;
  line-height: 1.68;
  color: var(--color-ink-secondary);
}

.art__disclaimer strong {
  display: block;
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: var(--color-ink-muted);
  margin-bottom: 5px;
}

.art__share {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
}

.art__share-label {
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: var(--color-ink-muted);
}

.art__share-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.art__share-icon {
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
    color 0.2s ease;
}

.art__share-icon:hover {
  border-color: var(--color-primary);
  color: var(--color-primary-dark);
}

.art__share-btn {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  background: var(--color-surface);
  border: 1px solid var(--color-line);
  border-radius: var(--radius-full);
  padding: 8px 16px;
  font-size: 0.83rem;
  font-weight: 600;
  color: var(--color-ink-secondary);
  transition:
    border-color 0.2s ease,
    color 0.2s ease;
}

.art__share-btn:hover {
  border-color: var(--color-primary);
  color: var(--color-primary-dark);
}

.art__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
}

.art__tag {
  background: var(--color-surface-sunken);
  border-radius: var(--radius-full);
  padding: 5px 13px;
  font-size: 0.76rem;
  font-weight: 600;
  color: var(--color-ink-muted);
}

.art__tag::before {
  content: '#';
  opacity: 0.5;
  margin-right: 1px;
}

/* ── Sidebar ── */
.side__sticky {
  position: sticky;
  top: 96px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.side__block {
  background: var(--color-surface);
  border: 1px solid var(--color-line-light);
  border-radius: var(--radius-xl);
  padding: 22px;
}

.side__title {
  margin-bottom: 16px;
}

.side__rel {
  display: block;
  padding: 12px 0;
  border-bottom: 1px solid var(--color-line-faint);
  transition: color 0.2s ease;
}

.side__rel:last-of-type {
  border-bottom: none;
  padding-bottom: 0;
}

.side__rel:hover .side__rel-title {
  color: var(--color-primary-dark);
}

.side__rel-title {
  display: block;
  font-family: var(--font-display);
  font-variation-settings:
    'SOFT' 60,
    'WONK' 1;
  font-size: 0.92rem;
  font-weight: 600;
  line-height: 1.35;
  letter-spacing: -0.01em;
  margin-bottom: 4px;
  transition: color 0.2s ease;
}

.side__rel-meta {
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--color-ink-faint);
}

.side__empty {
  font-size: 0.85rem;
  color: var(--color-ink-faint);
  font-style: italic;
}

.side__cats {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.side__cat {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 8px 10px;
  border-radius: var(--radius-sm);
  font-size: 0.84rem;
  font-weight: 600;
  color: var(--color-ink-secondary);
  transition:
    background 0.18s ease,
    color 0.18s ease;
}

.side__cat:hover {
  background: var(--color-canvas-alt);
  color: var(--color-ink);
}

.side__cat-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
}

.side__cat-name {
  flex: 1;
  line-height: 1.3;
}

.side__cat-count {
  font-size: 0.72rem;
  color: var(--color-ink-faint);
}

/* ── Sin artículo ── */
.art-loading {
  padding-block: 120px;
}

.art-missing {
  padding-block: 120px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 18px;
}

/* ── Responsive ── */
@media (max-width: 1024px) {
  .art-layout {
    grid-template-columns: 1fr;
    gap: 48px;
  }

  .side__sticky {
    position: static;
  }
}
</style>
