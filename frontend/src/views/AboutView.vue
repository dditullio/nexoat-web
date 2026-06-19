<template>
  <div class="about-page">
    <div class="container about-page__inner">
      <h1 class="about-page__title">Acerca de NexoAT</h1>

      <div class="about-page__content">
        <section class="about-section">
          <h2>¿Qué es NexoAT?</h2>
          <p>
            NexoAT es un espacio de divulgación especializado en
            <strong>Acompañamiento Terapéutico (AT)</strong>
            y cuidado de personas a lo largo de todo el ciclo vital: niños, adolescentes, adultos,
            adultos mayores y personas con discapacidad motora o mental.
          </p>
          <p>
            Nuestro objetivo es ser el nexo — el vínculo, el puente — entre el conocimiento
            especializado del campo de la salud mental y quienes lo necesitan en su vida cotidiana:
            familias, cuidadores y los propios profesionales.
          </p>
        </section>

        <section class="about-section">
          <h2>¿A quién va dirigido?</h2>
          <div class="about-audience">
            <div class="about-audience__item">
              <span class="about-audience__icon">👨‍👩‍👧</span>
              <div>
                <h3>Familias y cuidadores</h3>
                <p>
                  Quienes acompañan a un ser querido en situaciones de cuidado y necesitan
                  orientación práctica y emocional.
                </p>
              </div>
            </div>
            <div class="about-audience__item">
              <span class="about-audience__icon">🩺</span>
              <div>
                <h3>Profesionales del AT y la salud</h3>
                <p>
                  Acompañantes terapéuticos, psicólogos, trabajadores sociales y otros profesionales
                  que buscan profundizar su práctica.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section class="about-section">
          <h2>Nota importante</h2>
          <p class="about-disclaimer">
            Los artículos publicados en NexoAT tienen fines exclusivamente informativos y de
            divulgación. No reemplazan la consulta, el diagnóstico ni el tratamiento por parte de
            profesionales de la salud calificados. Ante cualquier situación de salud, consultá
            siempre a un especialista.
          </p>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts"></script>

<style scoped>
.about-page {
  padding-block: var(--spacing-3xl);
}

.about-page__inner {
  max-width: 720px;
}

.about-page__title {
  font-size: clamp(1.6rem, 3vw, 2.2rem);
  font-weight: 800;
  margin-bottom: var(--spacing-2xl);
}

.about-section {
  margin-bottom: var(--spacing-2xl);
}

.about-section h2 {
  font-size: 1.3rem;
  font-weight: 700;
  margin-bottom: var(--spacing-md);
  color: var(--color-primary);
}

.about-section p {
  font-size: 1rem;
  line-height: 1.75;
  color: var(--color-text);
  margin-bottom: var(--spacing-md);
}

.about-audience {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
  margin-top: var(--spacing-md);
}

.about-audience__item {
  display: flex;
  gap: var(--spacing-lg);
  align-items: flex-start;
}

.about-audience__icon {
  font-size: 2rem;
  flex-shrink: 0;
}

.about-audience__item h3 {
  font-size: 1rem;
  font-weight: 700;
  margin-bottom: var(--spacing-xs);
}

.about-audience__item p {
  margin: 0;
  font-size: 0.9rem;
  color: var(--color-text-muted);
}

.about-disclaimer {
  background: var(--color-bg-section);
  border-left: 4px solid var(--color-secondary);
  padding: var(--spacing-lg);
  border-radius: 0 var(--radius-md) var(--radius-md) 0;
  font-style: italic;
  color: var(--color-text-muted) !important;
}
</style>
