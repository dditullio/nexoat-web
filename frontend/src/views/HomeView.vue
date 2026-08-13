<template>
  <div>
    <!-- ═══ HERO ═══ -->
    <section class="hero">
      <div class="hero__orb hero__orb--sage" aria-hidden="true"></div>
      <div class="hero__orb hero__orb--clay" aria-hidden="true"></div>
      <div class="hero__orb hero__orb--ochre" aria-hidden="true"></div>

      <div class="container hero__inner">
        <div class="hero__text">
          <span class="hero__badge rise" style="animation-delay: 0.05s">
            <span class="hero__badge-dot" aria-hidden="true"></span>
            Acompañamiento terapéutico y cuidado de personas
          </span>

          <h1 class="hero__title rise" style="animation-delay: 0.15s">
            Acompañar a alguien<br />
            no debería hacerse<br />
            <span class="hero__accent">
              <em>a ciegas.</em>
              <!-- Trazo a mano alzada: el gesto humano detrás del énfasis -->
              <svg
                class="hero__swash"
                viewBox="0 0 220 16"
                fill="none"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                <path
                  d="M3 11.5c34-6 78-8.5 122-7.5 32 .7 60 3 92 6.5"
                  stroke="currentColor"
                  stroke-width="3.2"
                  stroke-linecap="round"
                />
              </svg>
            </span>
          </h1>

          <p class="hero__lead rise" style="animation-delay: 0.25s">
            Artículos claros y con respaldo profesional para familias, cuidadores y acompañantes
            terapéuticos. Sin tecnicismos innecesarios, sin promesas vacías.
          </p>

          <div class="hero__search rise" style="animation-delay: 0.35s">
            <svg
              class="hero__search-icon"
              width="18"
              height="18"
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
            <input
              v-model="searchQuery"
              type="text"
              placeholder="¿Sobre qué necesitás leer hoy?"
              class="hero__input"
              aria-label="Buscar artículos"
              @keyup.enter="goToSearch"
            />
            <button class="hero__go" @click="goToSearch">Buscar</button>
          </div>

          <div class="hero__quick rise" style="animation-delay: 0.45s">
            <span class="hero__quick-label">Empezá por</span>
            <RouterLink
              v-for="cat in quickCategories"
              :key="cat.slug"
              :to="`/categoria/${cat.slug}`"
              class="hero__chip"
            >
              {{ cat.name }}
            </RouterLink>
          </div>
        </div>

        <!-- Pila de arcos con las portadas reales: el motivo del sitio
             convertido en contenido navegable, no en decoración. -->
        <HeroArticleStack
          :articles="heroArticles"
          class="hero__deck rise"
          style="animation-delay: 0.3s"
        />
      </div>
    </section>

    <!-- ═══ DESTACADO ═══ -->
    <section class="section feat-sec">
      <div class="container">
        <div class="sec-head reveal">
          <div>
            <span class="eyebrow">Lectura destacada</span>
            <h2 class="section-title">De esta semana</h2>
          </div>
        </div>

        <RouterLink
          v-if="featured"
          :to="`/articulo/${featured.slug}`"
          class="feat reveal"
          :style="{ '--feat-grad': featuredTheme.gradient }"
        >
          <div class="feat__cover" :class="{ 'feat__cover--photo': featured.coverImage }">
            <img
              v-if="featured.coverImage"
              :src="featured.coverImage"
              :alt="featured.title"
              class="feat__img"
            />
            <span v-else class="feat__mark">{{ featuredTheme.icon }}</span>
          </div>

          <div class="feat__body">
            <span
              class="pill feat__cat"
              :style="{ background: featuredTheme.bg, color: featuredTheme.accent }"
            >
              {{ featuredCategoryName }}
            </span>

            <h3 class="feat__title">{{ featured.title }}</h3>
            <p class="feat__excerpt">{{ featured.excerpt }}</p>

            <div class="feat__meta">
              <span>{{ formatDate(featured.date) }}</span>
              <span class="feat__dot" aria-hidden="true"></span>
              <span>{{ featured.readingTimeMinutes }} min de lectura</span>
              <span
                class="pill"
                :style="{
                  background: LEVEL_CHIPS[featured.level].bg,
                  color: LEVEL_CHIPS[featured.level].text,
                }"
              >
                {{ LEVEL_CHIPS[featured.level].label }}
              </span>
            </div>

            <span class="link-arrow feat__cta">
              Leer el artículo
              <svg
                width="15"
                height="15"
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
          </div>
        </RouterLink>
      </div>
    </section>

    <!-- ═══ RECIENTES ═══ -->
    <section class="section recent-sec">
      <div class="container">
        <div class="sec-head reveal">
          <div>
            <span class="eyebrow">Publicaciones</span>
            <h2 class="section-title">Lo más reciente</h2>
          </div>
          <RouterLink to="/buscar" class="link-arrow">
            Ver todo
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
          </RouterLink>
        </div>

        <div class="grid-3">
          <ArticleCard
            v-for="article in displayedArticles"
            :key="article.slug"
            :article="article"
            class="reveal"
          />
        </div>
      </div>
    </section>

    <!-- ═══ TEMAS ═══ -->
    <section id="temas" class="section topics-sec">
      <div class="container">
        <div class="topics-sec__head reveal">
          <span class="eyebrow eyebrow--plain">Explorá por tema</span>
          <h2 class="section-title">Quince formas de entrar</h2>
          <p class="section-lead topics-sec__lead">
            Cada tema reúne los artículos de un área concreta del cuidado. Entrá por donde más lo
            necesites hoy.
          </p>
        </div>

        <div class="grid-5">
          <CategoryCard
            v-for="cat in store.categories"
            :key="cat.slug"
            :category="cat"
            class="reveal"
          />
        </div>
      </div>
    </section>

    <!-- ═══ AUDIENCIAS ═══ -->
    <section class="aud-sec">
      <div class="aud-sec__glow" aria-hidden="true"></div>
      <div class="container aud-sec__inner">
        <div class="aud-sec__head reveal">
          <h2 class="aud-sec__title">¿Desde dónde llegás?</h2>
          <p class="aud-sec__sub">
            El contenido está pensado para dos recorridos distintos — y nada impide hacer los dos.
          </p>
        </div>

        <div class="aud-cols">
          <div class="aud reveal">
            <span class="aud__glyph aud__glyph--fam" aria-hidden="true">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.6"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
              </svg>
            </span>
            <h3 class="aud__title">Cuido a alguien</h3>
            <p class="aud__desc">
              Si estás acompañando a una persona que querés, este es tu lado. Guías prácticas,
              herramientas concretas y orientación honesta sobre lo que también te pasa a vos.
            </p>
            <RouterLink to="/categoria/guia-cuidador" class="btn btn--accent">
              Artículos para familias
            </RouterLink>
          </div>

          <div class="aud reveal">
            <span class="aud__glyph aud__glyph--pro" aria-hidden="true">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.6"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            </span>
            <h3 class="aud__title">Trabajo en AT</h3>
            <p class="aud__desc">
              Material de nivel intermedio y avanzado: profundidad clínica, marcos teóricos y
              reflexión sobre la práctica del acompañamiento terapéutico.
            </p>
            <RouterLink to="/categoria/acompanamiento-terapeutico" class="btn btn--primary">
              Artículos para profesionales
            </RouterLink>
          </div>
        </div>
      </div>
    </section>

    <!-- ═══ NEWSLETTER ═══ -->
    <section id="newsletter" class="section news-sec">
      <div class="container">
        <div class="news reveal">
          <NewsletterForm source="homepage-hero" />
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useBlogStore } from '@/stores/blog'
import { getCategoryTheme, LEVEL_CHIPS } from '@/utils/theme'
import { useReveal } from '@/composables/useReveal'
import ArticleCard from '@/components/blog/ArticleCard.vue'
import CategoryCard from '@/components/blog/CategoryCard.vue'
import HeroArticleStack from '@/components/blog/HeroArticleStack.vue'
import NewsletterForm from '@/components/blog/NewsletterForm.vue'

const router = useRouter()
const store = useBlogStore()
const { filteredArticles } = storeToRefs(store)

useReveal()

const searchQuery = ref('')

const quickCategories = computed(() => store.categories.slice(0, 3))

// El hero es la primera impresión: solo artículos de alcance público, para
// no ofrecer en portada una lectura que el visitante todavía no puede abrir.
const heroArticles = computed(() => store.articles.filter((a) => a.scope === 'publico'))
const featured = computed(() => store.articles[0])
const featuredTheme = computed(() =>
  getCategoryTheme(featured.value?.categories[0] ?? 'acompanamiento-terapeutico')
)
const featuredCategoryName = computed(
  () =>
    (featured.value?.categories[0]
      ? store.getCategoryBySlug(featured.value.categories[0])
      : undefined
    )?.name ?? ''
)
const displayedArticles = computed(() => filteredArticles.value.slice(0, 6))

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function goToSearch() {
  const q = searchQuery.value.trim()
  if (!q) return
  store.setFilter('query', q)
  router.push({ name: 'search', query: { q } })
}
</script>

<style scoped>
/* ── Grillas compartidas ── */
.grid-3 {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 26px;
}

.grid-5 {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 16px;
}

.sec-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 40px;
}

.sec-head .eyebrow {
  margin-bottom: 14px;
}

/* ═══ HERO ═══ */
.hero {
  position: relative;
  overflow: hidden;
  padding: clamp(3.5rem, 8vw, 6.5rem) 0 clamp(4rem, 9vw, 7rem);
  background: linear-gradient(180deg, var(--color-canvas) 0%, var(--color-canvas-alt) 100%);
}

/* Formas orgánicas difusas: dan atmósfera sin competir con el texto */
.hero__orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(70px);
  pointer-events: none;
  animation: nx-breathe 18s ease-in-out infinite;
}

.hero__orb--sage {
  top: -12%;
  right: -6%;
  width: 520px;
  height: 520px;
  background: rgba(122, 148, 113, 0.26);
}

.hero__orb--clay {
  bottom: -22%;
  left: -8%;
  width: 420px;
  height: 420px;
  background: rgba(192, 117, 83, 0.16);
  animation-delay: -6s;
}

.hero__orb--ochre {
  top: 42%;
  left: 46%;
  width: 300px;
  height: 300px;
  background: rgba(201, 154, 63, 0.12);
  animation-delay: -12s;
}

.hero__inner {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: 1.35fr 0.65fr;
  gap: 56px;
  align-items: center;
}

.hero__badge {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  background: var(--color-surface);
  border: 1px solid var(--color-line-light);
  border-radius: var(--radius-full);
  padding: 7px 16px 7px 12px;
  margin-bottom: 26px;
  font-size: 0.74rem;
  font-weight: 700;
  color: var(--color-ink-secondary);
  letter-spacing: 0.01em;
  box-shadow: var(--shadow-sm);
}

.hero__badge-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--color-primary);
  flex-shrink: 0;
}

.hero__title {
  font-size: clamp(2.6rem, 6.2vw, 4.6rem);
  font-weight: 600;
  line-height: 1.04;
  letter-spacing: -0.035em;
  margin-bottom: 24px;
}

.hero__title em {
  font-style: italic;
  color: var(--color-primary-dark);
  font-variation-settings:
    'SOFT' 90,
    'WONK' 1;
}

/* Énfasis subrayado a mano: el trazo se dibuja solo al entrar la página */
.hero__accent {
  position: relative;
  display: inline-block;
}

.hero__swash {
  position: absolute;
  left: 0.06em;
  right: 0.06em;
  bottom: -0.1em;
  width: auto;
  height: 0.2em;
  color: var(--color-accent);
  opacity: 0.75;
  overflow: visible;
}

.hero__swash path {
  stroke-dasharray: 232;
  stroke-dashoffset: 232;
  animation: hero-draw 1.1s var(--ease-out-soft) 0.75s forwards;
}

@keyframes hero-draw {
  to {
    stroke-dashoffset: 0;
  }
}

.hero__lead {
  font-size: 1.1rem;
  color: var(--color-ink-secondary);
  line-height: 1.76;
  margin-bottom: 34px;
  max-width: 54ch;
}

/* Buscador */
.hero__search {
  display: flex;
  align-items: center;
  gap: 4px;
  background: var(--color-surface);
  border: 1px solid var(--color-line);
  border-radius: var(--radius-full);
  padding: 5px 5px 5px 20px;
  max-width: 520px;
  margin-bottom: 24px;
  box-shadow: var(--shadow-md);
  transition:
    border-color 0.25s ease,
    box-shadow 0.3s ease;
}

.hero__search:focus-within {
  border-color: var(--color-primary);
  box-shadow: var(--shadow-lg);
}

.hero__search-icon {
  color: var(--color-ink-faint);
  flex-shrink: 0;
}

.hero__input {
  flex: 1;
  border: none;
  background: none;
  padding: 14px 12px;
  font-size: 0.98rem;
  min-width: 0;
  outline: none;
}

.hero__input::placeholder {
  color: var(--color-ink-faint);
}

.hero__go {
  background: var(--color-primary);
  color: #fffdfa;
  font-size: 0.88rem;
  font-weight: 700;
  padding: 12px 24px;
  border-radius: var(--radius-full);
  white-space: nowrap;
  transition: background 0.2s ease;
}

.dark .hero__go {
  color: #191512;
}

.hero__go:hover {
  background: var(--color-primary-dark);
}

/* Accesos rápidos */
.hero__quick {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.hero__quick-label {
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--color-ink-faint);
  text-transform: uppercase;
  letter-spacing: 0.13em;
  margin-right: 2px;
}

.hero__chip {
  background: var(--color-surface);
  border: 1px solid var(--color-line-light);
  color: var(--color-ink-secondary);
  font-size: 0.82rem;
  font-weight: 600;
  padding: 7px 15px;
  border-radius: var(--radius-full);
  transition:
    border-color 0.2s ease,
    color 0.2s ease,
    transform 0.3s var(--ease-out-soft);
}

.hero__chip:hover {
  border-color: var(--color-primary);
  color: var(--color-primary-dark);
  transform: translateY(-2px);
}

/* La pila de portadas vive en HeroArticleStack.vue; acá solo su lugar
   en la grilla del hero. */
.hero__deck {
  min-width: 0;
}

/* ═══ DESTACADO ═══ */
.feat-sec {
  background: var(--color-canvas-alt);
}

.feat {
  display: grid;
  grid-template-columns: 0.85fr 1.15fr;
  gap: 0;
  background: var(--color-surface);
  border: 1px solid var(--color-line-light);
  border-radius: var(--radius-2xl);
  overflow: hidden;
  color: inherit;
  transition:
    transform 0.45s var(--ease-out-soft),
    box-shadow 0.45s var(--ease-out-soft);
}

.feat:hover {
  transform: translateY(-5px);
  box-shadow: var(--shadow-bloom);
}

.feat__cover {
  position: relative;
  min-height: 380px;
  margin: 12px 0 12px 12px;
  border-radius: 999px 999px var(--radius-lg) var(--radius-lg) / 180px 180px var(--radius-lg)
    var(--radius-lg);
  background: var(--feat-grad);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.feat__mark {
  font-family: var(--font-display);
  font-variation-settings:
    'SOFT' 70,
    'WONK' 1;
  font-size: 6rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.2);
  letter-spacing: -0.05em;
  transition: transform 0.6s var(--ease-out-soft);
}

.feat:hover .feat__mark {
  transform: scale(1.08);
}

.feat__img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.6s var(--ease-out-soft);
}

.feat:hover .feat__img {
  transform: scale(1.05);
}

/* Scrim: por si algún día el destacado suma texto sobre la foto */
.feat__cover--photo::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(20, 16, 12, 0) 60%, rgba(20, 16, 12, 0.28) 100%);
}

.feat__body {
  padding: 48px 52px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 16px;
}

.feat__cat {
  align-self: flex-start;
}

.feat__title {
  font-size: clamp(1.5rem, 2.6vw, 2.15rem);
  font-weight: 600;
  line-height: 1.2;
  letter-spacing: -0.025em;
}

.feat__excerpt {
  font-size: 1rem;
  color: var(--color-ink-secondary);
  line-height: 1.75;
  max-width: 54ch;
}

.feat__meta {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  font-size: 0.8rem;
  color: var(--color-ink-faint);
  font-weight: 600;
}

.feat__dot {
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: var(--color-ink-faint);
}

.feat__cta {
  margin-top: 6px;
}

/* ═══ RECIENTES ═══ */
.recent-sec {
  background: var(--color-canvas);
}

/* ═══ TEMAS ═══ */
.topics-sec {
  background: var(--color-canvas-alt);
}

.topics-sec__head {
  text-align: center;
  max-width: 620px;
  margin: 0 auto 48px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
}

.topics-sec__lead {
  text-align: center;
}

/* ═══ AUDIENCIAS ═══ */
.aud-sec {
  position: relative;
  background: var(--color-deep);
  padding: clamp(4rem, 9vw, 7rem) 0;
  overflow: hidden;
  isolation: isolate;
}

.aud-sec__glow {
  position: absolute;
  top: -30%;
  left: 50%;
  width: 800px;
  height: 600px;
  transform: translateX(-50%);
  background: radial-gradient(ellipse at center, rgba(157, 186, 146, 0.14), transparent 70%);
  pointer-events: none;
  z-index: -1;
}

.aud-sec__inner {
  position: relative;
}

.aud-sec__head {
  text-align: center;
  margin-bottom: 44px;
}

.aud-sec__title {
  font-size: clamp(1.9rem, 3.6vw, 2.6rem);
  font-weight: 600;
  color: #f7f2e9;
  letter-spacing: -0.03em;
  margin-bottom: 12px;
}

.aud-sec__sub {
  font-size: 1rem;
  color: rgba(247, 242, 233, 0.55);
  line-height: 1.7;
  max-width: 52ch;
  margin: 0 auto;
}

.aud-cols {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.aud {
  background: rgba(247, 242, 233, 0.045);
  border: 1px solid rgba(247, 242, 233, 0.09);
  border-radius: var(--radius-2xl);
  padding: 44px 42px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 14px;
  transition:
    background 0.35s ease,
    transform 0.45s var(--ease-out-soft);
}

.aud:hover {
  background: rgba(247, 242, 233, 0.075);
  transform: translateY(-4px);
}

.aud__glyph {
  width: 52px;
  height: 52px;
  border-radius: 999px 999px 15px 15px / 28px 28px 15px 15px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 6px;
}

.aud__glyph--fam {
  background: rgba(221, 150, 112, 0.18);
  color: #e2a582;
}

.aud__glyph--pro {
  background: rgba(157, 186, 146, 0.18);
  color: #a7c79b;
}

.aud__title {
  font-size: 1.6rem;
  font-weight: 600;
  color: #f7f2e9;
  letter-spacing: -0.02em;
}

.aud__desc {
  font-size: 0.95rem;
  color: rgba(247, 242, 233, 0.58);
  line-height: 1.78;
  margin-bottom: 10px;
  max-width: 42ch;
}

/* ═══ NEWSLETTER ═══ */
.news-sec {
  background: var(--color-canvas);
}

.news {
  background: var(--color-primary-soft);
  border: 1px solid var(--color-line-light);
  border-radius: var(--radius-2xl);
  padding: clamp(3rem, 6vw, 4.5rem) 32px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
}

/* ═══ RESPONSIVE ═══ */
@media (max-width: 1024px) {
  .hero__inner {
    grid-template-columns: 1fr;
    gap: 44px;
  }

  .grid-3 {
    grid-template-columns: repeat(2, 1fr);
  }

  .grid-5 {
    grid-template-columns: repeat(3, 1fr);
  }

  .feat {
    grid-template-columns: 1fr;
  }

  .feat__cover {
    min-height: 240px;
    margin: 12px 12px 0;
    border-radius: 999px 999px var(--radius-lg) var(--radius-lg) / 110px 110px var(--radius-lg)
      var(--radius-lg);
  }

  .feat__body {
    padding: 32px 32px 38px;
  }
}

@media (max-width: 768px) {
  .aud-cols {
    grid-template-columns: 1fr;
  }

  .aud {
    padding: 34px 28px;
  }
}

@media (max-width: 640px) {
  .hero__title {
    font-size: 2.5rem;
  }

  .hero__search {
    flex-wrap: wrap;
    border-radius: var(--radius-lg);
    padding: 12px;
  }

  .hero__input {
    width: 100%;
    padding: 8px;
  }

  .hero__go {
    width: 100%;
  }

  /* La pila ya no se oculta en mobile como el arco decorativo que
     reemplazó: son artículos reales, vale la pena mostrarlos. */
  .hero__deck {
    margin-top: 8px;
  }

  .grid-3,
  .grid-5 {
    grid-template-columns: 1fr;
  }

  .sec-head {
    flex-direction: column;
    align-items: flex-start;
    gap: 14px;
  }
}

@media (min-width: 641px) and (max-width: 900px) {
  .grid-5 {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
