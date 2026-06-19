<template>
  <div class="article-page">
    <div v-if="article" class="container article-page__layout">
      <!-- Columna principal -->
      <article class="article">
        <nav class="breadcrumb" aria-label="Ruta de navegación">
          <RouterLink to="/">Inicio</RouterLink>
          <span>›</span>
          <RouterLink v-if="primaryCategory" :to="`/categoria/${article.categories[0]}`">
            {{ primaryCategory.name }}
          </RouterLink>
          <span>›</span>
          <span>{{ article.title }}</span>
        </nav>

        <header class="article__header">
          <div class="article__chips">
            <AppChip variant="category">{{ primaryCategory?.name }}</AppChip>
            <AppChip :variant="`level-${article.level}`">{{ levelLabel }}</AppChip>
            <AppChip
              v-for="aud in article.audience"
              :key="aud"
              :variant="`audience-${aud === 'cuidadores-familiares' ? 'cuidadores' : 'profesionales'}`"
              >{{
                aud === 'cuidadores-familiares' ? 'Para familias' : 'Para profesionales'
              }}</AppChip
            >
          </div>

          <h1 class="article__title">{{ article.title }}</h1>
          <p class="article__subtitle">{{ article.subtitle }}</p>

          <div class="article__meta">
            <span>{{ formattedDate }}</span>
            <span v-if="article.readingTimeMinutes"
              >· {{ article.readingTimeMinutes }} min de lectura</span
            >
          </div>

          <div v-if="article.coverImage" class="article__cover">
            <img :src="article.coverImage" :alt="article.title" />
          </div>
        </header>

        <div class="article__body">
          <!-- Placeholder: el contenido markdown se renderizará aquí -->
          <p class="article__placeholder">
            <em
              >El contenido del artículo se cargará aquí una vez implementada la integración con el
              backend o el parser de Markdown.</em
            >
          </p>
        </div>

        <footer class="article__footer">
          <p class="article__disclaimer">
            Este artículo tiene fines informativos y no reemplaza la consulta con un profesional de
            salud.
          </p>
          <div class="article__share">
            <span class="article__share-label">Compartir:</span>
            <button class="article__share-btn" @click="copyLink">📋 Copiar enlace</button>
          </div>
          <div class="article__tags">
            <span v-for="kw in article.keywords" :key="kw" class="article__tag">{{ kw }}</span>
          </div>
        </footer>
      </article>

      <!-- Sidebar -->
      <aside class="sidebar">
        <div class="sidebar__block">
          <h3 class="sidebar__title">Categorías</h3>
          <nav class="sidebar__cats">
            <RouterLink
              v-for="cat in store.categories"
              :key="cat.slug"
              :to="`/categoria/${cat.slug}`"
              class="sidebar__cat-link"
            >
              {{ cat.name }}
              <span class="sidebar__cat-count">{{ cat.articleCount }}</span>
            </RouterLink>
          </nav>
        </div>
      </aside>
    </div>

    <div v-else class="container">
      <p>Artículo no encontrado.</p>
      <RouterLink to="/">Volver al inicio</RouterLink>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useBlogStore, CATEGORIES } from '@/stores/blog'
import AppChip from '@/components/ui/AppChip.vue'

const route = useRoute()
const store = useBlogStore()

const article = computed(() => store.articles.find((a) => a.slug === route.params.slug))

const primaryCategory = computed(() =>
  article.value ? CATEGORIES.find((c) => c.slug === article.value!.categories[0]) : undefined
)

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
    ({
      basico: 'Básico',
      intermedio: 'Intermedio',
      avanzado: 'Avanzado',
    })[article.value?.level ?? 'basico']
)

function copyLink() {
  navigator.clipboard.writeText(window.location.href)
  alert('¡Enlace copiado!')
}
</script>

<style scoped>
.article-page__layout {
  display: grid;
  grid-template-columns: 1fr 280px;
  gap: var(--spacing-3xl);
  padding-block: var(--spacing-2xl);
  align-items: start;
}

.breadcrumb {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--spacing-sm);
  font-size: 0.82rem;
  color: var(--color-text-muted);
  margin-bottom: var(--spacing-xl);
}

.breadcrumb a {
  color: var(--color-primary);
}

/* Header del artículo */
.article__chips {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-xs);
  margin-bottom: var(--spacing-lg);
}

.article__title {
  font-size: clamp(1.5rem, 3vw, 2.2rem);
  font-weight: 800;
  line-height: 1.2;
  margin-bottom: var(--spacing-md);
}

.article__subtitle {
  font-size: 1.1rem;
  color: var(--color-text-muted);
  line-height: 1.6;
  font-style: italic;
  margin-bottom: var(--spacing-lg);
}

.article__meta {
  font-size: 0.85rem;
  color: var(--color-text-muted);
  margin-bottom: var(--spacing-xl);
}

.article__cover {
  border-radius: var(--radius-lg);
  overflow: hidden;
  margin-bottom: var(--spacing-xl);
}

.article__cover img {
  width: 100%;
  aspect-ratio: 16/9;
  object-fit: cover;
}

/* Cuerpo del artículo */
.article__body {
  font-size: 1.05rem;
  line-height: 1.75;
  color: var(--color-text);
  max-width: var(--container-article);
}

.article__placeholder {
  padding: var(--spacing-2xl);
  background: var(--color-bg-section);
  border-radius: var(--radius-md);
  color: var(--color-text-muted);
  text-align: center;
}

/* Footer del artículo */
.article__footer {
  margin-top: var(--spacing-3xl);
  padding-top: var(--spacing-xl);
  border-top: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
}

.article__disclaimer {
  font-size: 0.82rem;
  color: var(--color-text-muted);
  font-style: italic;
  background: var(--color-bg-section);
  padding: var(--spacing-md);
  border-radius: var(--radius-md);
  border-left: 3px solid var(--color-secondary);
}

.article__share {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
}

.article__share-label {
  font-weight: 600;
  font-size: 0.9rem;
}

.article__share-btn {
  background: var(--color-bg-section);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-full);
  padding: 0.3rem 0.9rem;
  font-size: 0.85rem;
  cursor: pointer;
  font-family: inherit;
  transition: background 0.15s;
}

.article__share-btn:hover {
  background: var(--color-border);
}

.article__tags {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-xs);
}

.article__tag {
  background: var(--color-bg-section);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-full);
  padding: 0.2rem 0.7rem;
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

/* Sidebar */
.sidebar {
  position: sticky;
  top: 80px;
}

.sidebar__block {
  background: var(--color-white);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--spacing-lg);
}

.sidebar__title {
  font-size: 0.85rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--color-text-muted);
  margin-bottom: var(--spacing-md);
}

.sidebar__cats {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.sidebar__cat-link {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-xs) var(--spacing-sm);
  border-radius: var(--radius-sm);
  text-decoration: none;
  color: var(--color-text);
  font-size: 0.875rem;
  transition: background 0.1s;
}

.sidebar__cat-link:hover {
  background: var(--color-bg-section);
  text-decoration: none;
}

.sidebar__cat-count {
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

@media (max-width: 1024px) {
  .article-page__layout {
    grid-template-columns: 1fr;
  }

  .sidebar {
    display: none;
  }
}
</style>
