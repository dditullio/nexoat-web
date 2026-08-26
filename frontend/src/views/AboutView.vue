<template>
  <div class="about">
    <header class="about__hero">
      <div class="about__orb" aria-hidden="true"></div>
      <div class="container about__hero-inner">
        <span class="eyebrow">Acerca de</span>
        <h1 class="about__title">El nexo entre saber y<br /><em>acompañar</em></h1>
        <p class="about__lead">
          NexoAT es un espacio de divulgación sobre acompañamiento terapéutico y cuidado de personas
          a lo largo de todo el ciclo vital.
        </p>
      </div>
    </header>

    <div class="container about__body">
      <section class="about__block">
        <span class="about__num" aria-hidden="true">01</span>
        <div class="about__content">
          <h2 class="about__h2">Qué es NexoAT</h2>
          <div class="prose">
            <p>
              Un espacio de divulgación especializado en
              <strong>Acompañamiento Terapéutico (AT)</strong> y en el cuidado de personas a lo
              largo de toda la vida: infancias, adolescencias, personas adultas, adultos mayores y
              personas con discapacidad motora o mental.
            </p>
            <p>
              El objetivo es ser exactamente eso, un <strong>nexo</strong>: el puente entre el
              conocimiento especializado del campo de la salud mental y quienes lo necesitan en su
              vida cotidiana — familias, cuidadores y los propios profesionales.
            </p>
          </div>
        </div>
      </section>

      <section class="about__block">
        <span class="about__num" aria-hidden="true">02</span>
        <div class="about__content">
          <h2 class="about__h2">Para quién es</h2>

          <div class="who">
            <article class="who__card">
              <span class="who__glyph who__glyph--fam" aria-hidden="true">
                <svg
                  width="22"
                  height="22"
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
              <h3 class="who__title">Familias y cuidadores</h3>
              <p class="who__desc">
                Quienes acompañan a un ser querido en situaciones de cuidado y necesitan orientación
                práctica — y también emocional, porque cuidar desgasta.
              </p>
            </article>

            <article class="who__card">
              <span class="who__glyph who__glyph--pro" aria-hidden="true">
                <svg
                  width="22"
                  height="22"
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
              <h3 class="who__title">Profesionales del AT</h3>
              <p class="who__desc">
                Acompañantes terapéuticos, psicólogos, trabajadores sociales y otros profesionales
                que buscan profundizar y revisar su práctica.
              </p>
            </article>
          </div>
        </div>
      </section>

      <section class="about__block">
        <span class="about__num" aria-hidden="true">03</span>
        <div class="about__content">
          <h2 class="about__h2">Cómo leernos</h2>
          <div class="prose">
            <p>
              Cada artículo indica su <strong>nivel</strong> — básico, intermedio o avanzado — y
              <strong>a quién está dirigido</strong>. Eso te permite saber de antemano si un texto
              está escrito para vos o si conviene empezar por otro.
            </p>
          </div>

          <blockquote class="quote">
            <p>
              Los contenidos de este sitio tienen fines exclusivamente informativos y de
              divulgación. No reemplazan la consulta, el diagnóstico ni el tratamiento por parte de
              profesionales de la salud calificados. Ante cualquier situación de salud, consultá
              siempre a un especialista.
            </p>
          </blockquote>
        </div>
      </section>

      <div class="about__cta">
        <h2 class="about__cta-title">¿Empezamos?</h2>
        <div class="about__cta-row">
          <RouterLink to="/categoria/guia-cuidador" class="btn btn--accent">
            Si cuidás a alguien
          </RouterLink>
          <RouterLink to="/categoria/acompanamiento-terapeutico" class="btn btn--primary">
            Si trabajás en AT
          </RouterLink>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useSeoMeta } from '@/composables/useSeoMeta'

useSeoMeta({
  title: 'Acerca de',
  description: 'Quiénes somos y por qué escribimos sobre acompañamiento terapéutico en NexoAT.',
  path: '/acerca-de',
})
</script>

<style scoped>
/* Hero */
.about__hero {
  position: relative;
  overflow: hidden;
  background: var(--color-canvas-alt);
  border-bottom: 1px solid var(--color-line-light);
  padding: clamp(3.5rem, 7vw, 5.5rem) 0;
}

.about__orb {
  position: absolute;
  top: -45%;
  right: -8%;
  width: 560px;
  height: 560px;
  border-radius: 50%;
  background: rgba(122, 148, 113, 0.2);
  filter: blur(80px);
  pointer-events: none;
}

.about__hero-inner {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 18px;
  max-width: 760px;
}

.about__title {
  font-size: clamp(2.2rem, 5.2vw, 3.6rem);
  font-weight: 600;
  line-height: 1.08;
  letter-spacing: -0.035em;
}

.about__title em {
  font-style: italic;
  color: var(--color-primary-dark);
  font-variation-settings:
    'SOFT' 90,
    'WONK' 1;
}

.about__lead {
  font-size: 1.12rem;
  color: var(--color-ink-secondary);
  line-height: 1.76;
  max-width: 56ch;
}

/* Cuerpo */
.about__body {
  padding-block: 72px 96px;
  display: flex;
  flex-direction: column;
  gap: 64px;
  max-width: 900px;
}

.about__block {
  display: grid;
  grid-template-columns: 72px 1fr;
  gap: 24px;
  align-items: start;
}

/* Numeral editorial */
.about__num {
  font-family: var(--font-display);
  font-variation-settings:
    'SOFT' 60,
    'WONK' 1;
  font-size: 2.1rem;
  font-weight: 600;
  color: var(--color-line);
  line-height: 1;
  letter-spacing: -0.04em;
  padding-top: 4px;
}

.about__content {
  display: flex;
  flex-direction: column;
  gap: 18px;
  min-width: 0;
}

.about__h2 {
  font-size: clamp(1.5rem, 2.6vw, 2rem);
  font-weight: 600;
  letter-spacing: -0.028em;
}

/* Audiencias */
.who {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-top: 4px;
}

.who__card {
  background: var(--color-surface);
  border: 1px solid var(--color-line-light);
  border-radius: var(--radius-xl);
  padding: 26px 24px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  transition:
    transform 0.4s var(--ease-out-soft),
    box-shadow 0.4s var(--ease-out-soft);
}

.who__card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-md);
}

.who__glyph {
  width: 46px;
  height: 46px;
  border-radius: 999px 999px 13px 13px / 24px 24px 13px 13px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 4px;
}

.who__glyph--fam {
  background: var(--color-accent-soft);
  color: var(--color-accent-dark);
}

.who__glyph--pro {
  background: var(--color-primary-soft);
  color: var(--color-primary-dark);
}

.who__title {
  font-size: 1.08rem;
  font-weight: 600;
  letter-spacing: -0.015em;
}

.who__desc {
  font-size: 0.92rem;
  color: var(--color-ink-secondary);
  line-height: 1.72;
}

/* Cita / disclaimer */
.quote {
  background: var(--color-ochre-soft);
  border-left: 3px solid var(--color-ochre);
  border-radius: 0 var(--radius-lg) var(--radius-lg) 0;
  padding: 22px 26px;
  margin-top: 8px;
}

.quote p {
  font-family: var(--font-display);
  font-variation-settings: 'SOFT' 70;
  font-style: italic;
  font-size: 1rem;
  line-height: 1.76;
  color: var(--color-ink-secondary);
}

/* CTA */
.about__cta {
  background: var(--color-primary-soft);
  border-radius: var(--radius-2xl);
  padding: clamp(2.5rem, 5vw, 3.5rem);
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 22px;
}

.about__cta-title {
  font-size: clamp(1.6rem, 3vw, 2.2rem);
  font-weight: 600;
  letter-spacing: -0.03em;
}

.about__cta-row {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  justify-content: center;
}

/* Responsive */
@media (max-width: 700px) {
  .about__block {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .about__num {
    font-size: 1.6rem;
  }

  .who {
    grid-template-columns: 1fr;
  }
}
</style>
