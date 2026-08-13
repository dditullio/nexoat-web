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
          <AppChip v-if="scopeLabel" variant="scope-restricted">{{ scopeLabel }}</AppChip>
        </div>

        <h1 class="art-head__title">{{ article.title }}</h1>
        <p class="art-head__sub">{{ article.subtitle }}</p>

        <div class="art-head__meta">
          <span>{{ formattedDate }}</span>
          <span v-if="article.readingTimeMinutes" class="art-head__dot" aria-hidden="true"></span>
          <span v-if="article.readingTimeMinutes">
            {{ article.readingTimeMinutes }} min de lectura
          </span>
          <ArticleShare
            :title="article.title"
            :excerpt="article.excerpt"
            size="sm"
            :bordered="false"
            class="art-head__share"
          />
        </div>

        <div v-if="article.isTruncated" class="art-head__notice">
          <svg
            width="18"
            height="18"
            viewBox="0 0 18 18"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
            class="art-head__notice-icon"
          >
            <rect x="3.5" y="8" width="11" height="7.5" rx="2" />
            <path d="M6 8V5.5a3 3 0 0 1 6 0V8" />
          </svg>
          <p class="art-head__notice-text">
            <strong>Vista previa.</strong>
            Este artículo es para
            {{
              article.requiredScope === 'suscriptores_nivel_1'
                ? 'suscriptores registrados'
                : 'suscriptores de nivel superior'
            }}
            — a continuación usted podrá leer solo una parte, no el contenido completo.
          </p>
          <RouterLink
            v-if="article.requiredScope === 'suscriptores_nivel_1'"
            :to="{ name: 'register', query: { redirect: route.fullPath } }"
            class="btn btn--primary art-head__notice-cta"
          >
            Registrate gratis
          </RouterLink>
          <RouterLink v-else to="/planes" class="btn btn--primary art-head__notice-cta">
            Ver planes
          </RouterLink>
        </div>
      </div>
    </header>

    <div class="container art-layout">
      <article class="art">
        <figure v-if="article.coverImage" class="art__cover">
          <img :src="article.coverImage" :alt="article.title" />
        </figure>

        <div
          v-if="contentHtml"
          class="prose art__body"
          :class="{ 'art__body--truncated': article.isTruncated }"
          v-html="contentHtml"
        ></div>
        <div v-else class="prose art__body">
          <p class="art__note">No se pudo cargar el contenido de este artículo.</p>
        </div>

        <aside v-if="article.isTruncated" class="art__paywall">
          <p class="art__paywall-eyebrow eyebrow">Contenido para suscriptores {{ scopeLabel }}</p>
          <template v-if="article.requiredScope === 'suscriptores_nivel_1'">
            <h2 class="art__paywall-title">Seguí leyendo gratis</h2>
            <p class="art__paywall-text">
              Registrate sin costo para acceder al resto de este artículo.
            </p>
            <RouterLink
              :to="{ name: 'register', query: { redirect: route.fullPath } }"
              class="btn btn--primary"
            >
              Registrate gratis
            </RouterLink>
          </template>
          <template v-else>
            <h2 class="art__paywall-title">Estamos preparando este contenido</h2>
            <p class="art__paywall-text">
              El resto de este artículo es exclusivo para suscriptores {{ scopeLabel }}. Todavía
              estamos afinando el lanzamiento de las suscripciones pagas — sumate a la lista de
              espera y vas a ser de las primeras personas en acceder.
            </p>
            <RouterLink to="/planes" class="btn btn--primary">
              Sumarme a la lista de espera
            </RouterLink>
          </template>
        </aside>

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
            <ArticleShare :title="article.title" :excerpt="article.excerpt" />
          </div>

          <div v-if="article.keywords.length" class="art__tags">
            <span v-for="kw in article.keywords" :key="kw" class="art__tag">{{ kw }}</span>
          </div>
        </footer>
      </article>

      <aside class="side">
        <div class="side__sticky">
          <div class="side__block">
            <h2 class="eyebrow side__title">Compartir</h2>
            <ArticleShare :title="article.title" :excerpt="article.excerpt" />
          </div>

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
import { getCategoryTheme, SCOPE_CHIPS } from '@/utils/theme'
import { http } from '@/services/http'
import { renderMarkdown } from '@/utils/markdown'
import AppChip from '@/components/ui/AppChip.vue'
import ArticleShare from '@/components/blog/ArticleShare.vue'
import type { ArticleFull } from '@/types'

const route = useRoute()
const store = useBlogStore()

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

// "publico" no muestra chip — solo se anuncian los artículos restringidos.
// Todavía es solo clasificación (sin recorte real de contenido), ver
// docs/features/article-scope-filters.md.
const scopeLabel = computed(() => article.value && SCOPE_CHIPS[article.value.scope]?.label)
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
  flex-wrap: wrap;
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

/* Empuja el "compartir" al espacio libre a la derecha de la fecha, en la
   misma línea — en mobile (sin lugar) pasa a la línea de abajo, por el
   flex-wrap de .art-head__meta. */
.art-head__share {
  margin-left: auto;
}

/* Aviso de vista previa (artículo recortado para el nivel del viewer) —
   mismo par ochre-soft/ochre que ya usan el disclaimer y el bloque de
   paywall, para que se lea como "misma familia de aviso editorial". Vive en
   la cabecera, antes de que el lector empiece a leer, para que sepa de
   antemano que no va a poder terminar el artículo (ver
   docs/features/reader-accounts-and-paywall.md). */
.art-head__notice {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 24px;
  background: var(--color-ochre-soft);
  border: 1px solid var(--color-ochre);
  border-radius: var(--radius-lg);
  padding: 14px 18px;
}

.art-head__notice-icon {
  flex-shrink: 0;
  color: var(--color-ochre);
}

.art-head__notice-text {
  flex: 1 1 320px;
  font-size: 0.86rem;
  line-height: 1.55;
  color: var(--color-ink-secondary);
}

.art-head__notice-text strong {
  color: var(--color-ink);
}

.art-head__notice-cta {
  flex-shrink: 0;
  font-size: 0.85rem;
  padding: 0.6rem 1.15rem;
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

/* Se desvanece hacia abajo cuando el contenido está recortado — sin esto,
   el corte se sentía arbitrario/roto (el texto paraba en seco a mitad de
   idea). El degradado hacia el color de fondo de la página comunica "esto
   se interrumpe a propósito" antes de llegar al bloque de paywall. */
.art__body--truncated {
  position: relative;
}

.art__body--truncated::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 220px;
  background: linear-gradient(to bottom, transparent, var(--color-canvas));
  pointer-events: none;
}

/* ── Paywall (contenido recortado) ── */
.art__paywall {
  margin-top: 40px;
  background: var(--color-ochre-soft);
  border: 1px solid var(--color-ochre);
  border-radius: var(--radius-xl);
  padding: 32px;
  max-width: var(--container-prose);
}

.art__paywall-eyebrow {
  margin-bottom: 10px;
}

.art__paywall-title {
  font-size: 1.4rem;
  margin-bottom: 10px;
}

.art__paywall-text {
  font-size: 0.94rem;
  line-height: 1.65;
  color: var(--color-ink-secondary);
  margin-bottom: 18px;
  max-width: 52ch;
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
