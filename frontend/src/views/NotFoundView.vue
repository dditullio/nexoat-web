<template>
  <div class="not-found">
    <div class="container not-found__inner">
      <h1 class="not-found__code">404</h1>
      <h2 class="not-found__title">Página no encontrada</h2>
      <p class="not-found__desc">El contenido que buscás no existe o fue movido.</p>
      <RouterLink to="/" class="not-found__btn">Volver al inicio</RouterLink>
    </div>
  </div>
</template>

<script setup lang="ts"></script>

<style scoped>
.not-found {
  padding-block: var(--spacing-3xl);
}

.not-found__inner {
  text-align: center;
  max-width: 480px;
  margin-inline: auto;
}

.not-found__code {
  font-size: 5rem;
  font-weight: 800;
  color: var(--color-border);
  line-height: 1;
}

.not-found__title {
  font-size: 1.5rem;
  font-weight: 700;
  margin-block: var(--spacing-md);
}

.not-found__desc {
  color: var(--color-text-muted);
  margin-bottom: var(--spacing-xl);
}

.not-found__btn {
  display: inline-block;
  background: var(--color-primary);
  color: var(--color-white);
  padding: 0.65rem 1.5rem;
  border-radius: var(--radius-full);
  font-weight: 600;
  text-decoration: none;
  transition: background 0.15s;
}

.not-found__btn:hover {
  background: var(--color-primary-light);
  text-decoration: none;
}
</style>
