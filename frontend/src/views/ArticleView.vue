<template>
  <div v-if="article" class="art-page">
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

        <div class="prose art__body">
          <p class="art__note">
            El contenido del artículo se cargará acá una vez integrado el backend o el parser de
            Markdown.
          </p>
        </div>

        <footer class="art__foot">
          <aside class="art__disclaimer">
            <strong>Nota</strong>
            Este artículo tiene fines informativos y no reemplaza la consulta con un profesional de
            salud.
          </aside>

          <div class="art__share">
            <span class="art__share-label">Compartir</span>
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
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useBlogStore, CATEGORIES } from '@/stores/blog'
import { getCategoryTheme } from '@/utils/theme'
import AppChip from '@/components/ui/AppChip.vue'

const route = useRoute()
const store = useBlogStore()
const copied = ref(false)

const article = computed(() => store.articles.find((a) => a.slug === route.params.slug))

const primaryCategory = computed(() =>
  article.value ? CATEGORIES.find((c) => c.slug === article.value!.categories[0]) : undefined
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
}

.art__share-label {
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: var(--color-ink-muted);
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
