<template>
  <div>
    <!-- ── HERO ── -->
    <section class="hero">
      <div class="hero__orb hero__orb--tr"></div>
      <div class="hero__orb hero__orb--br"></div>
      <div class="hero__orb hero__orb--tl"></div>
      <div class="hero__fade"></div>

      <div class="container hero__inner">
        <div id="hero-content" class="hero__content">
          <!-- Badge -->
          <div class="hero__badge">
            <span class="hero__badge-dot"></span>
            Blog especializado · AT y Cuidado de Personas
          </div>

          <!-- Headline -->
          <h1 class="hero__title">
            Tu nexo con el acompañamiento terapéutico y el cuidado que transforma
          </h1>

          <!-- Subtítulo -->
          <p class="hero__sub">
            Artículos especializados para familias, cuidadores y profesionales que trabajan con el
            cuidado de personas a lo largo de toda la vida.
          </p>

          <!-- Search -->
          <div class="hero__search-wrap">
            <svg
              class="hero__search-icon"
              width="18"
              height="18"
              viewBox="0 0 18 18"
              fill="none"
              stroke="#8A93A8"
              stroke-width="1.6"
            >
              <circle cx="7.5" cy="7.5" r="5" />
              <path d="M12 12l4 4" />
            </svg>
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Buscar artículos, temas, condiciones…"
              class="hero__search-input"
              @keyup.enter="goToSearch"
            />
            <button class="hero__search-btn" @click="goToSearch">Buscar</button>
          </div>

          <!-- Quick chips -->
          <div class="hero__chips">
            <span class="hero__chips-label">Acceso rápido:</span>
            <RouterLink
              v-for="cat in quickCategories"
              :key="cat.slug"
              :to="`/categoria/${cat.slug}`"
              class="hero__chip"
              >{{ cat.name }}</RouterLink
            >
          </div>
        </div>
      </div>
    </section>

    <!-- ── ARTÍCULO DESTACADO ── -->
    <section class="sec featured-sec">
      <div class="container">
        <div class="featured-sec__header">
          <h2 class="section-title">Artículo destacado</h2>
          <span class="featured-sec__badge">✦ De esta semana</span>
        </div>

        <div class="featured-card">
          <!-- Imagen -->
          <div class="featured-card__img">
            <span class="featured-card__img-watermark">AT</span>
            <span class="featured-card__img-label">
              <svg
                style="display: inline; vertical-align: middle; margin-right: 4px"
                width="10"
                height="10"
                viewBox="0 0 12 12"
                fill="none"
                stroke="currentColor"
                stroke-width="1.5"
              >
                <rect x="1" y="2" width="10" height="8" rx="1" />
                <path d="M4 2V1M8 2V1M1 5h10" />
              </svg>
              Imagen del artículo
            </span>
          </div>

          <!-- Contenido -->
          <div class="featured-card__body">
            <span class="featured-card__chip">Acompañamiento Terapéutico</span>
            <h3 class="featured-card__title">
              ¿Qué es el Acompañamiento Terapéutico y para quién está indicado?
            </h3>
            <p class="featured-card__excerpt">
              Una guía clara para familias que acaban de escuchar el término por primera vez. Qué
              hace un AT, cómo trabaja en equipo interdisciplinario y cuándo es la indicación
              adecuada para tu situación.
            </p>
            <div class="featured-card__meta">
              <span class="featured-card__date">12 jun 2026</span>
              <span class="meta-dot"></span>
              <span class="featured-card__date">7 min de lectura</span>
              <span class="meta-dot"></span>
              <span class="chip-basico">Básico</span>
              <span class="chip-cuidadores">Para cuidadores</span>
            </div>
            <RouterLink
              to="/articulo/que-es-el-acompanamiento-terapeutico"
              class="featured-card__cta"
            >
              Leé el artículo completo
              <svg
                width="14"
                height="14"
                viewBox="0 0 14 14"
                fill="none"
                stroke="currentColor"
                stroke-width="2.2"
              >
                <path d="M2 7h10M7 2l5 5-5 5" />
              </svg>
            </RouterLink>
          </div>
        </div>
      </div>
    </section>

    <!-- ── ARTÍCULOS RECIENTES ── -->
    <section class="sec recent-sec">
      <div class="container">
        <div class="recent-sec__header">
          <h2 class="section-title">Artículos recientes</h2>
          <RouterLink to="/categoria/acompanamiento-terapeutico" class="section-link">
            Ver todos
            <svg
              width="13"
              height="13"
              viewBox="0 0 14 14"
              fill="none"
              stroke="currentColor"
              stroke-width="2.2"
            >
              <path d="M2 7h10M7 2l5 5-5 5" />
            </svg>
          </RouterLink>
        </div>

        <div class="articles-grid">
          <ArticleCard
            v-for="article in displayedArticles"
            :key="article.slug"
            :article="article"
          />
        </div>

        <div class="recent-sec__more">
          <button class="btn-outline">
            Ver más artículos
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path d="M7 2v10M2 7l5 5 5-5" />
            </svg>
          </button>
        </div>
      </div>
    </section>

    <!-- ── CATEGORÍAS ── -->
    <section id="categorias" class="sec cat-sec">
      <div class="container">
        <div class="cat-sec__header">
          <h2 class="section-title section-title--center">Explorá por tema</h2>
          <p class="cat-sec__sub">
            Encontrá los artículos que más necesitás según el área que más te importa en este
            momento.
          </p>
        </div>
        <div class="cat-grid">
          <CategoryCard v-for="cat in store.categories" :key="cat.slug" :category="cat" />
        </div>
      </div>
    </section>

    <!-- ── BANNER AUDIENCIAS ── -->
    <section class="audience-sec">
      <div class="container">
        <div class="audience-sec__header">
          <h2 class="audience-sec__title">¿Qué tipo de contenido buscás?</h2>
          <p class="audience-sec__sub">
            Diseñamos el contenido para dos perfiles distintos — aunque podés explorar los dos.
          </p>
        </div>
        <div class="audience-cols">
          <!-- Familias -->
          <div class="audience-col audience-col--families">
            <div class="audience-col__orb"></div>
            <div class="audience-col__content">
              <div class="audience-col__icon audience-col__icon--families">
                <svg
                  width="26"
                  height="26"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#E07B68"
                  stroke-width="1.5"
                >
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </div>
              <h3 class="audience-col__title">Para familias<br />y cuidadores</h3>
              <p class="audience-col__desc">
                Si estás acompañando a alguien que querés, este espacio es para vos. Guías
                prácticas, herramientas claras y orientación real sin tecnicismos innecesarios.
              </p>
              <RouterLink
                to="/categoria/guia-cuidador"
                class="audience-col__btn audience-col__btn--families"
              >
                Artículos para familias
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 14 14"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2.2"
                >
                  <path d="M2 7h10M7 2l5 5-5 5" />
                </svg>
              </RouterLink>
            </div>
          </div>

          <!-- Profesionales -->
          <div class="audience-col audience-col--pros">
            <div class="audience-col__orb audience-col__orb--pros"></div>
            <div class="audience-col__content">
              <div class="audience-col__icon audience-col__icon--pros">
                <svg
                  width="26"
                  height="26"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#7FA3D1"
                  stroke-width="1.5"
                >
                  <path d="M12 2L2 7l10 5 10-5-10-5z" />
                  <path d="M2 17l10 5 10-5" />
                  <path d="M2 12l10 5 10-5" />
                </svg>
              </div>
              <h3 class="audience-col__title">¿Sos profesional<br />del AT?</h3>
              <p class="audience-col__desc">
                Artículos de nivel intermedio y avanzado con profundidad clínica, marcos teóricos y
                reflexión sobre la práctica del acompañamiento terapéutico.
              </p>
              <RouterLink
                to="/categoria/acompanamiento-terapeutico"
                class="audience-col__btn audience-col__btn--pros"
              >
                Artículos para profesionales
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 14 14"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2.2"
                >
                  <path d="M2 7h10M7 2l5 5-5 5" />
                </svg>
              </RouterLink>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ── NEWSLETTER ── -->
    <section id="newsletter" class="newsletter-sec sec">
      <div class="newsletter-sec__inner">
        <div class="newsletter-sec__icon">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#fff"
            stroke-width="1.5"
          >
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
            <polyline points="22,6 12,13 2,6" />
          </svg>
        </div>
        <h2 class="newsletter-sec__title">Artículos nuevos,<br />cada semana en tu correo</h2>
        <p class="newsletter-sec__desc">
          Recibí el mejor contenido sobre acompañamiento terapéutico y cuidado de personas
          directamente en tu bandeja de entrada.
        </p>

        <form v-if="!submitted" class="newsletter-sec__form" @submit.prevent="subscribe">
          <input
            v-model="email"
            type="email"
            placeholder="tu@email.com"
            class="newsletter-sec__input"
            required
          />
          <button type="submit" class="newsletter-sec__btn">Me sumo</button>
        </form>
        <p v-if="!submitted" class="newsletter-sec__disclaimer">
          Sin spam. Cancelás cuando querés.
        </p>

        <div v-if="submitted" class="newsletter-sec__success">
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            stroke="#fff"
            stroke-width="2.2"
          >
            <path d="M2 10l5.5 6L18 4" />
          </svg>
          <span>¡Listo! Te suscribiste correctamente.</span>
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
import ArticleCard from '@/components/blog/ArticleCard.vue'
import CategoryCard from '@/components/blog/CategoryCard.vue'

const router = useRouter()
const store = useBlogStore()
const { filteredArticles } = storeToRefs(store)

const searchQuery = ref('')
const email = ref('')
const submitted = ref(false)

const quickCategories = computed(() => store.categories.slice(0, 3))
const displayedArticles = computed(() => filteredArticles.value.slice(0, 6))

function goToSearch() {
  const q = searchQuery.value.trim()
  if (!q) return
  store.setFilter('query', q)
  router.push({ name: 'search', query: { q } })
}

function subscribe() {
  submitted.value = true
  email.value = ''
}
</script>

<style scoped>
/* ── Sección base ── */
.sec {
  padding: 80px 0;
}

.section-title {
  font-family: var(--font-serif);
  font-size: 26px;
  font-weight: 700;
  color: var(--color-text);
  letter-spacing: -0.02em;
}
.section-title--center {
  font-size: 34px;
  text-align: center;
  margin-bottom: 12px;
}

.section-link {
  font-size: 13px;
  font-weight: 700;
  color: var(--color-primary);
  display: flex;
  align-items: center;
  gap: 6px;
  text-decoration: none;
  transition: color 0.15s;
}
.section-link:hover {
  color: var(--color-primary-dark);
}

/* ── Hero ── */
.hero {
  background: linear-gradient(158deg, #192e58 0%, #2a4080 38%, #3e5aa8 72%, #4e6eb8 100%);
  padding: 96px 0 80px;
  position: relative;
  overflow: hidden;
  min-height: 58vh;
  display: flex;
  align-items: center;
}

.hero__orb {
  position: absolute;
  border-radius: 50%;
  pointer-events: none;
}
.hero__orb--tr {
  top: -120px;
  right: -80px;
  width: 560px;
  height: 560px;
  background: rgba(255, 255, 255, 0.03);
}
.hero__orb--br {
  bottom: -100px;
  right: 12%;
  width: 360px;
  height: 360px;
  background: rgba(100, 140, 210, 0.12);
}
.hero__orb--tl {
  top: 10%;
  left: -100px;
  width: 300px;
  height: 300px;
  background: rgba(60, 90, 160, 0.15);
}

.hero__fade {
  position: absolute;
  inset: 0;
  background: linear-gradient(to bottom, transparent 60%, rgba(25, 46, 88, 0.4) 100%);
  pointer-events: none;
}

.hero__inner {
  position: relative;
  z-index: 1;
}

.hero__content {
  max-width: 720px;
  animation: fadeUp 0.85s cubic-bezier(0.22, 1, 0.36, 1) both;
}

@keyframes fadeUp {
  from {
    opacity: 0;
    transform: translateY(28px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.hero__badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.17);
  border-radius: var(--radius-full);
  padding: 6px 16px;
  margin-bottom: 28px;
  font-size: 11px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.78);
  letter-spacing: 0.09em;
  text-transform: uppercase;
}

.hero__badge-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #e07b68;
  flex-shrink: 0;
}

.hero__title {
  font-family: var(--font-serif);
  font-size: clamp(34px, 4.8vw, 60px);
  font-weight: 700;
  color: #fff;
  line-height: 1.12;
  letter-spacing: -0.025em;
  margin-bottom: 20px;
}

.hero__sub {
  font-size: 18px;
  font-weight: 400;
  color: rgba(255, 255, 255, 0.7);
  line-height: 1.7;
  margin-bottom: 40px;
  max-width: 560px;
}

.hero__search-wrap {
  display: flex;
  align-items: center;
  background: #fff;
  border-radius: var(--radius-full);
  max-width: 600px;
  margin-bottom: 28px;
  box-shadow: var(--shadow-hero);
  overflow: hidden;
}

.hero__search-icon {
  margin-left: 22px;
  flex-shrink: 0;
}

.hero__search-input {
  flex: 1;
  border: none;
  padding: 17px 16px;
  font-size: 15px;
  color: var(--color-text);
  background: none;
  min-width: 0;
  outline: none;
}

.hero__search-btn {
  background: var(--color-primary);
  color: #fff;
  font-size: 14px;
  font-weight: 700;
  padding: 14px 26px;
  margin: 4px;
  border-radius: var(--radius-full);
  white-space: nowrap;
  transition: background 0.15s;
}
.hero__search-btn:hover {
  background: var(--color-primary-dark);
}

.hero__chips {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.hero__chips-label {
  font-size: 11px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.42);
  text-transform: uppercase;
  letter-spacing: 0.07em;
  margin-right: 2px;
}

.hero__chip {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.18);
  color: rgba(255, 255, 255, 0.85);
  font-size: 13px;
  font-weight: 600;
  padding: 6px 14px;
  border-radius: var(--radius-full);
  text-decoration: none;
  transition: background 0.15s;
}
.hero__chip:hover {
  background: rgba(255, 255, 255, 0.18);
}

/* ── Featured ── */
.featured-sec {
  background: var(--color-bg);
}

.featured-sec__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
}

.featured-sec__badge {
  font-size: 12px;
  font-weight: 600;
  color: #a8a298;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.featured-card {
  background: var(--color-white);
  border-radius: var(--radius-xl);
  overflow: hidden;
  box-shadow: 0 4px 24px rgba(42, 46, 61, 0.07);
  border: 1px solid var(--color-border);
  display: flex;
}

.featured-card__img {
  width: 44%;
  min-height: 380px;
  flex-shrink: 0;
  background: linear-gradient(138deg, #7fa3d1 0%, #4568a0 52%, #2a3e80 100%);
  position: relative;
  display: flex;
  align-items: flex-end;
  padding: 24px;
}

.featured-card__img-watermark {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-serif);
  font-size: 140px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.05);
  line-height: 1;
  user-select: none;
  letter-spacing: -0.04em;
}

.featured-card__img-label {
  position: relative;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: rgba(255, 255, 255, 0.75);
  font-size: 11px;
  font-weight: 600;
  padding: 4px 12px;
  border-radius: var(--radius-full);
  letter-spacing: 0.03em;
}

.featured-card__body {
  padding: 44px 52px;
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.featured-card__chip {
  display: inline-block;
  background: #eef2fa;
  color: var(--color-primary);
  font-size: 12px;
  font-weight: 700;
  padding: 5px 12px;
  border-radius: var(--radius-full);
  letter-spacing: 0.04em;
  margin-bottom: 16px;
}

.featured-card__title {
  font-family: var(--font-serif);
  font-size: clamp(21px, 2.2vw, 30px);
  font-weight: 700;
  color: var(--color-text);
  line-height: 1.28;
  letter-spacing: -0.02em;
  margin-bottom: 16px;
}

.featured-card__excerpt {
  font-size: 16px;
  color: var(--color-text-secondary);
  line-height: 1.74;
  margin-bottom: 24px;
  max-width: 540px;
}

.featured-card__meta {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 32px;
}

.featured-card__date {
  font-size: 13px;
  color: var(--color-text-faint);
  font-weight: 500;
}

.meta-dot {
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: #c8c4bc;
  flex-shrink: 0;
}

.chip-basico {
  font-size: 11px;
  font-weight: 700;
  padding: 3px 10px;
  border-radius: var(--radius-full);
  background: #edf7ed;
  color: #2e7a2e;
}
.chip-cuidadores {
  font-size: 11px;
  font-weight: 700;
  padding: 3px 10px;
  border-radius: var(--radius-full);
  background: #fef5e6;
  color: #9a6a22;
}

.featured-card__cta {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  background: var(--color-primary);
  color: #fff;
  font-size: 14px;
  font-weight: 700;
  padding: 13px 26px;
  border-radius: var(--radius-full);
  letter-spacing: 0.02em;
  text-decoration: none;
  align-self: flex-start;
  transition: background 0.15s;
}
.featured-card__cta:hover {
  background: var(--color-primary-dark);
}

/* ── Recent ── */
.recent-sec {
  background: var(--color-white);
}

.recent-sec__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 36px;
}

.articles-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
}

.recent-sec__more {
  text-align: center;
  margin-top: 48px;
}

.btn-outline {
  background: var(--color-white);
  border: 2px solid var(--color-primary);
  color: var(--color-primary);
  font-size: 14px;
  font-weight: 700;
  padding: 13px 32px;
  border-radius: var(--radius-full);
  display: inline-flex;
  align-items: center;
  gap: 8px;
  transition: background 0.15s;
  font-family: var(--font-sans);
}
.btn-outline:hover {
  background: #eef2fa;
}

/* ── Categorías ── */
.cat-sec {
  background: var(--color-bg-alt);
}

.cat-sec__header {
  text-align: center;
  margin-bottom: 48px;
}

.cat-sec__sub {
  font-size: 16px;
  color: var(--color-text-muted);
  line-height: 1.65;
  max-width: 480px;
  margin: 0 auto;
}

.cat-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 14px;
}

/* ── Audiencias ── */
.audience-sec {
  background: var(--color-audience-bg);
  padding: 80px 0;
}

.audience-sec__header {
  text-align: center;
  margin-bottom: 44px;
}

.audience-sec__title {
  font-family: var(--font-serif);
  font-size: 28px;
  font-weight: 700;
  color: #fff;
  letter-spacing: -0.02em;
}

.audience-sec__sub {
  font-size: 15px;
  color: rgba(255, 255, 255, 0.45);
  margin-top: 10px;
  line-height: 1.6;
}

.audience-cols {
  display: grid;
  grid-template-columns: 1fr 1fr;
  border-radius: var(--radius-xl);
  overflow: hidden;
}

.audience-col {
  padding: 52px;
  position: relative;
  overflow: hidden;
}
.audience-col--families {
  background: rgba(224, 123, 104, 0.11);
  border-right: 1px solid rgba(255, 255, 255, 0.05);
}
.audience-col--pros {
  background: rgba(69, 104, 160, 0.14);
}

.audience-col__orb {
  position: absolute;
  bottom: -80px;
  right: -60px;
  width: 260px;
  height: 260px;
  border-radius: 50%;
  background: rgba(224, 123, 104, 0.06);
  pointer-events: none;
}
.audience-col__orb--pros {
  bottom: -80px;
  left: -60px;
  right: auto;
  background: rgba(69, 104, 160, 0.07);
}

.audience-col__content {
  position: relative;
  z-index: 1;
}

.audience-col__icon {
  width: 52px;
  height: 52px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 22px;
}
.audience-col__icon--families {
  background: rgba(224, 123, 104, 0.18);
}
.audience-col__icon--pros {
  background: rgba(69, 104, 160, 0.2);
}

.audience-col__title {
  font-family: var(--font-serif);
  font-size: 26px;
  font-weight: 700;
  color: #fff;
  margin-bottom: 14px;
  letter-spacing: -0.015em;
  line-height: 1.25;
}

.audience-col__desc {
  font-size: 15px;
  color: rgba(255, 255, 255, 0.58);
  line-height: 1.74;
  margin-bottom: 32px;
  max-width: 380px;
}

.audience-col__btn {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  font-weight: 700;
  padding: 13px 24px;
  border-radius: var(--radius-full);
  text-decoration: none;
  color: #fff;
  transition: background 0.15s;
}
.audience-col__btn--families {
  background: #e07b68;
}
.audience-col__btn--families:hover {
  background: #c86050;
}
.audience-col__btn--pros {
  background: var(--color-primary);
}
.audience-col__btn--pros:hover {
  background: var(--color-primary-dark);
}

/* ── Newsletter ── */
.newsletter-sec {
  background: var(--color-primary);
  padding: 96px 0;
}

.newsletter-sec__inner {
  max-width: 560px;
  margin: 0 auto;
  text-align: center;
}

.newsletter-sec__icon {
  width: 52px;
  height: 52px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.14);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 24px;
}

.newsletter-sec__title {
  font-family: var(--font-serif);
  font-size: clamp(26px, 3vw, 34px);
  font-weight: 700;
  color: #fff;
  letter-spacing: -0.025em;
  margin-bottom: 14px;
  line-height: 1.2;
}

.newsletter-sec__desc {
  font-size: 16px;
  color: rgba(255, 255, 255, 0.7);
  line-height: 1.7;
  margin-bottom: 36px;
}

.newsletter-sec__form {
  display: flex;
  gap: 8px;
  max-width: 480px;
  margin: 0 auto 14px;
}

.newsletter-sec__input {
  flex: 1;
  border: none;
  padding: 15px 20px;
  border-radius: var(--radius-full);
  font-size: 15px;
  color: var(--color-text);
  background: #fff;
  min-width: 0;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.12);
}
.newsletter-sec__input:focus {
  outline: none;
}

.newsletter-sec__btn {
  background: #1c2238;
  color: #fff;
  font-size: 14px;
  font-weight: 700;
  padding: 15px 22px;
  border-radius: var(--radius-full);
  white-space: nowrap;
  flex-shrink: 0;
  transition: background 0.15s;
  font-family: var(--font-sans);
}
.newsletter-sec__btn:hover {
  background: #0e1428;
}

.newsletter-sec__disclaimer {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.42);
}

.newsletter-sec__success {
  background: rgba(255, 255, 255, 0.14);
  border: 1px solid rgba(255, 255, 255, 0.24);
  border-radius: 12px;
  padding: 20px 32px;
  display: inline-flex;
  align-items: center;
  gap: 12px;
  font-size: 16px;
  font-weight: 600;
  color: #fff;
}

/* ── Responsive ── */
@media (max-width: 1024px) {
  .articles-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  .cat-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 768px) {
  .featured-card {
    flex-direction: column;
  }
  .featured-card__img {
    width: 100% !important;
    min-height: 220px !important;
  }
  .featured-card__body {
    padding: 28px 28px 32px;
  }
  .audience-cols {
    grid-template-columns: 1fr;
    border-radius: 12px;
  }
  .audience-col {
    padding: 40px 28px;
  }
  .newsletter-sec__form {
    flex-direction: column;
  }
}

@media (max-width: 640px) {
  .hero {
    padding: 56px 0 48px;
    min-height: auto;
  }
  .hero__title {
    font-size: 32px;
  }
  .hero__sub {
    font-size: 15px;
  }
  .sec {
    padding: 56px 0;
  }
  .articles-grid {
    grid-template-columns: 1fr;
  }
  .cat-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
