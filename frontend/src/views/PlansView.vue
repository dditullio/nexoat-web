<template>
  <div class="container plans">
    <div class="plans__head reveal">
      <p class="eyebrow eyebrow--plain">Niveles de suscripción</p>
      <h1 class="section-title">Estamos preparando los niveles pagos</h1>
      <p class="section-lead plans__lead">
        Hoy podés leer gratis todo el contenido público de NexoAT, y registrarte sin costo te abre
        los artículos de nivel registrado. Los niveles pagos (Nivel 2 y Nivel 3) todavía están en
        preparación — van a sumar contenido más profundo para sostener el proyecto a largo plazo.
      </p>
    </div>

    <div class="plans__grid reveal">
      <!-- "Visitante" no es un plan real (no se elige, no tiene tag de
           estado) — es la columna de referencia para que el contraste con
           "Gratuito" haga el trabajo de vender el registro. Los ítems son
           los mismos textos que Gratuito, mismo orden, para que se lean
           alineados en fila aunque no sea una tabla literal.

           El tag cambia según haya o no sesión: "Así lo ves hoy" solo es
           cierto para quien todavía no tiene cuenta — alguien ya
           registrado no "ve" esto hoy, está comparando contra su propio
           pasado. -->
      <div class="plan plan--anon">
        <span class="plan__tag plan__tag--anon">
          {{ authStore.isAuthenticated ? 'Antes de registrarte' : 'Así lo ves hoy' }}
        </span>
        <h2 class="plan__name">Visitante</h2>
        <p class="plan__desc">Sin cuenta, con acceso solo al contenido público del blog.</p>
        <ul class="plan__benefits plan__benefits--muted">
          <li v-for="benefit in benefits" :key="benefit">
            <svg
              class="plan__benefit-icon plan__benefit-icon--x"
              width="15"
              height="15"
              viewBox="0 0 15 15"
              fill="none"
              stroke="currentColor"
              stroke-width="1.6"
              stroke-linecap="round"
              aria-hidden="true"
            >
              <path d="M4 4l7 7M11 4l-7 7" />
            </svg>
            <span>{{ benefit }}</span>
          </li>
        </ul>
      </div>

      <div class="plan" :class="{ 'plan--current': isCurrentPlan('gratuito') }">
        <span class="plan__tag" :class="{ 'plan__tag--current': isCurrentPlan('gratuito') }">
          {{ isCurrentPlan('gratuito') ? 'Tu plan actual' : 'Ya disponible' }}
        </span>
        <h2 class="plan__name">Gratuito</h2>
        <p class="plan__desc">Todo lo que se abre apenas creás tu cuenta, sin costo.</p>
        <ul class="plan__benefits">
          <li v-for="benefit in benefits" :key="benefit">
            <svg
              class="plan__benefit-icon plan__benefit-icon--check"
              width="15"
              height="15"
              viewBox="0 0 15 15"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path d="M3 7.8l3 3 6-6.6" />
            </svg>
            <span>{{ benefit }}</span>
          </li>
        </ul>
        <!-- Único CTA accionable hoy — solo tiene sentido para quien
             todavía no tiene sesión (si ya está registrado, "Gratuito" ya
             es su plan vigente, ver isCurrentPlan arriba). Estilo con más
             peso que un link ghost a propósito: es la conversión que esta
             página existe para lograr. -->
        <RouterLink v-if="!authStore.isAuthenticated" to="/registrarme" class="plan__cta-register">
          <span aria-hidden="true">🎁</span>
          Registrarme gratis
          <svg
            class="plan__cta-arrow"
            width="16"
            height="16"
            viewBox="0 0 18 18"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="M4 9h10M9.5 4.5L14 9l-4.5 4.5" />
          </svg>
        </RouterLink>
      </div>

      <div
        v-for="plan in paidPlans"
        :key="plan.tier"
        class="plan plan--pending"
        :class="{ 'plan--current': isCurrentPlan(plan.tier) }"
      >
        <span class="plan__tag" :class="{ 'plan__tag--current': isCurrentPlan(plan.tier) }">
          {{ isCurrentPlan(plan.tier) ? 'Tu plan actual' : plan.tagLabel }}
        </span>
        <h2 class="plan__name">{{ plan.name }}</h2>
        <p class="plan__desc">{{ plan.description }}</p>
      </div>
    </div>

    <div class="plans__waitlist reveal">
      <NewsletterForm
        source="plans-waitlist"
        title="Te avisamos apenas estén disponibles"
        description="Dejanos tu email y sé de las primeras personas en enterarte cuando abramos los niveles pagos — sin compromiso."
        button-label="Sumarme a la lista de espera"
        success-message="¡Listo! Te vamos a avisar apenas esté disponible."
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useReveal } from '@/composables/useReveal'
import { useSeoMeta } from '@/composables/useSeoMeta'
import { useAuthStore } from '@/stores/auth'
import NewsletterForm from '@/components/blog/NewsletterForm.vue'
import type { SubscriptionTier } from '@/types/auth'

useSeoMeta({
  title: 'Planes de suscripción',
  description: 'Comparación de planes y beneficios de suscribirte a NexoAT.',
  path: '/planes',
})

useReveal()

const authStore = useAuthStore()

// Mismo orden que se muestra en las columnas "Visitante" (✕) y "Gratuito"
// (✓) — así el contraste entre ambas listas hace de comparación, sin
// necesidad de una tabla literal por fila. El newsletter no entra: ya está
// disponible para cualquiera sin cuenta (ver el ícono de sobre en
// AppHeader.vue), así que no es un beneficio exclusivo de registrarse — y
// tachado en "Visitante" además se leía ambiguo, como si no recibir el
// newsletter fuera "no recibir spam".
const benefits = [
  'Personalizá tu perfil y contá tu forma de acompañar',
  'Elegí tu ebook de regalo de bienvenida',
  'Accedé a artículos "Solo para registrados", con más profundidad',
  'Retomá donde dejaste — guardamos tu historial de lectura',
  'Guardá los artículos que te interesan para volver a ellos',
]

interface Plan {
  tier: SubscriptionTier
  name: string
  description: string
  tagLabel: string
}

// Solo Nivel 2/3 — "Visitante" y "Gratuito" tienen su propia lista de
// beneficios (ver benefits arriba) y se maquetan directo en el template. Los
// dos siguen "pendientes" (ver .plan--pending fijo en el template), así que
// no necesitan un campo status propio.
const paidPlans: Plan[] = [
  {
    tier: 'nivel_2',
    name: 'Nivel 2',
    description:
      'Contenido adicional para quienes quieren profundizar más allá de lo público. Todavía estamos definiendo el detalle y el lanzamiento.',
    tagLabel: 'En preparación',
  },
  {
    tier: 'nivel_3',
    name: 'Nivel 3',
    description:
      'El nivel más completo, pensado para quienes acompañan de forma profesional. También en preparación.',
    tagLabel: 'En preparación',
  },
]

// Toda cuenta nace en "gratuito" y hoy no hay forma de subir de nivel (sin
// cobro real, ver docs/features/reader-accounts-and-paywall.md) — pero se
// compara contra `subscriptionTier` en vez de hardcodear "gratuito", para
// que esto ya funcione solo cuando nivel_2/nivel_3 se puedan asignar.
function isCurrentPlan(tier: SubscriptionTier): boolean {
  return authStore.isAuthenticated && authStore.user?.subscriptionTier === tier
}
</script>

<style scoped>
.plans {
  padding-block: 64px 96px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 56px;
}

.plans__head {
  max-width: 640px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
}

.plans__lead {
  max-width: 56ch;
}

.plans__grid {
  width: 100%;
  max-width: 1160px;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 18px;
  align-items: stretch;
}

.plan {
  background: var(--color-surface);
  border: 1px solid var(--color-line-light);
  border-radius: var(--radius-xl);
  padding: 28px 24px;
  text-align: left;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.plan--pending,
.plan--anon {
  background: var(--color-surface-sunken);
}

.plan--current {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 1px var(--color-primary);
}

.plan__tag {
  align-self: flex-start;
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--color-ink-faint);
  background: var(--color-canvas);
  border: 1px solid var(--color-line);
  border-radius: var(--radius-full);
  padding: 5px 12px;
}

.plan--pending .plan__tag {
  color: var(--color-ink-secondary);
  background: var(--color-ochre-soft);
  border-color: var(--color-ochre);
}

.plan__tag--anon {
  color: var(--color-ink-faint);
  background: var(--color-canvas);
  border-color: var(--color-line);
}

.plan__tag--current {
  color: var(--color-primary-dark);
  background: var(--color-primary-tint);
  border-color: var(--color-primary);
}

.plan__name {
  font-size: 1.3rem;
}

.plan__desc {
  font-size: 0.9rem;
  line-height: 1.6;
  color: var(--color-ink-secondary);
}

/* La lista (no el párrafo de arriba) es la que crece para parejar la
   altura de las 4 tarjetas — Nivel 2/3 no tienen lista propia, así que su
   .plan__desc queda igual que antes (sin flex), y esas tarjetas se estiran
   solas por el align-items:stretch del grid. */
.plan__benefits {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 10px;
  list-style: none;
}

.plan__benefits li {
  display: flex;
  align-items: flex-start;
  gap: 9px;
  font-size: 0.86rem;
  line-height: 1.45;
  color: var(--color-ink-secondary);
}

.plan__benefits--muted li {
  color: var(--color-ink-faint);
}

.plan__benefit-icon {
  flex-shrink: 0;
  margin-top: 2px;
}

.plan__benefit-icon--check {
  color: var(--color-primary-dark);
}

.plan__benefit-icon--x {
  color: var(--color-ink-faint);
}

/* CTA con más peso que un link ghost — misma familia visual que el CTA del
   hero de HomeView.vue (gradiente arcilla, flecha animada), adaptado a
   botón compacto para que entre en el ancho de la tarjeta. */
.plan__cta-register {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: 6px;
  padding: 12px 16px;
  background: linear-gradient(135deg, var(--color-accent-soft), var(--color-surface));
  border: 1.5px solid var(--color-accent);
  border-radius: var(--radius-full);
  font-family: var(--font-sans);
  font-weight: 700;
  font-size: 0.86rem;
  color: var(--color-accent-dark);
  text-decoration: none;
  box-shadow: var(--shadow-md);
  transition:
    box-shadow 0.25s var(--ease-out-soft),
    transform 0.25s var(--ease-out-soft),
    border-color 0.25s var(--ease-out-soft);
}

.plan__cta-register:hover {
  box-shadow: var(--shadow-bloom);
  border-color: var(--color-accent-dark);
  transform: translateY(-2px);
}

.plan__cta-arrow {
  flex-shrink: 0;
  transition: transform 0.25s var(--ease-out-soft);
}

.plan__cta-register:hover .plan__cta-arrow {
  transform: translateX(4px);
}

.plans__waitlist {
  width: 100%;
  max-width: 480px;
  background: var(--color-primary-soft);
  border: 1px solid var(--color-line-light);
  border-radius: var(--radius-2xl);
  padding: clamp(2.25rem, 5vw, 3rem) 28px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

@media (max-width: 1080px) {
  .plans__grid {
    grid-template-columns: repeat(2, 1fr);
    max-width: 680px;
  }
}

@media (max-width: 640px) {
  .plans__grid {
    grid-template-columns: 1fr;
  }
}
</style>
