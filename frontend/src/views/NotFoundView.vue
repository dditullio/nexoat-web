<template>
  <div class="nf">
    <div class="nf__orb" aria-hidden="true"></div>

    <div class="container nf__inner">
      <div class="nf__arch" aria-hidden="true">
        <span class="nf__code">404</span>
      </div>

      <h1 class="nf__title">Esta página se perdió</h1>
      <p class="nf__desc">
        El contenido que buscabas no existe o cambió de dirección. No es tu culpa — pasa.
      </p>

      <div class="nf__actions">
        <RouterLink to="/" class="btn btn--primary">Volver al inicio</RouterLink>
        <RouterLink to="/buscar" class="btn btn--ghost">Buscar un tema</RouterLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts"></script>

<style scoped>
.nf {
  position: relative;
  overflow: hidden;
  padding-block: clamp(5rem, 12vw, 9rem);
  display: flex;
  align-items: center;
  min-height: 68vh;
}

.nf__orb {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 620px;
  height: 620px;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  background: rgba(122, 148, 113, 0.15);
  filter: blur(90px);
  pointer-events: none;
}

.nf__inner {
  position: relative;
  text-align: center;
  max-width: 520px;
  margin-inline: auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

/* Arco: el mismo motivo del resto del sitio */
.nf__arch {
  width: 128px;
  height: 152px;
  border-radius: 999px 999px var(--radius-lg) var(--radius-lg) / 64px 64px var(--radius-lg)
    var(--radius-lg);
  background: var(--cat-at-grad);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 12px;
  box-shadow: var(--shadow-bloom);
}

.nf__code {
  font-family: var(--font-display);
  font-variation-settings:
    'SOFT' 70,
    'WONK' 1;
  font-size: 2.2rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.45);
  letter-spacing: -0.03em;
}

.nf__title {
  font-size: clamp(1.8rem, 4vw, 2.6rem);
  font-weight: 600;
  letter-spacing: -0.032em;
}

.nf__desc {
  font-size: 1.02rem;
  color: var(--color-ink-secondary);
  line-height: 1.74;
  max-width: 44ch;
  margin-bottom: 10px;
}

.nf__actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  justify-content: center;
}
</style>
