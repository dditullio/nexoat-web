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
      <div
        v-for="plan in plans"
        :key="plan.tier"
        class="plan"
        :class="{
          'plan--pending': plan.status === 'pending',
          'plan--current': isCurrentPlan(plan.tier),
        }"
      >
        <span class="plan__tag" :class="{ 'plan__tag--current': isCurrentPlan(plan.tier) }">
          {{ isCurrentPlan(plan.tier) ? 'Tu plan actual' : plan.tagLabel }}
        </span>
        <h2 class="plan__name">{{ plan.name }}</h2>
        <p class="plan__desc">{{ plan.description }}</p>
        <!-- El único CTA accionable hoy es "Registrarme gratis" — y solo
             tiene sentido para quien todavía no tiene sesión (si ya está
             registrado, "Gratuito" ya es su plan vigente, ver isCurrentPlan
             arriba). Nivel 2/3 no tienen CTA propio mientras sigan sin
             cobro real (ver plans__waitlist) — cuando se activen, ahí va a
             ir su botón de alta, con la misma condición de "no si ya es tu
             plan actual". -->
        <RouterLink
          v-if="plan.tier === 'gratuito' && !authStore.isAuthenticated"
          to="/registrarme"
          class="btn btn--ghost plan__cta"
        >
          Registrarme gratis
        </RouterLink>
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
import { useAuthStore } from '@/stores/auth'
import NewsletterForm from '@/components/blog/NewsletterForm.vue'
import type { SubscriptionTier } from '@/types/auth'

useReveal()

const authStore = useAuthStore()

interface Plan {
  tier: SubscriptionTier
  name: string
  description: string
  status: 'available' | 'pending'
  tagLabel: string
}

const plans: Plan[] = [
  {
    tier: 'gratuito',
    name: 'Gratuito',
    description:
      'Todo el contenido público del blog, y los artículos de nivel registrado con una cuenta gratuita.',
    status: 'available',
    tagLabel: 'Ya disponible',
  },
  {
    tier: 'nivel_2',
    name: 'Nivel 2',
    description:
      'Contenido adicional para quienes quieren profundizar más allá de lo público. Todavía estamos definiendo el detalle y el lanzamiento.',
    status: 'pending',
    tagLabel: 'En preparación',
  },
  {
    tier: 'nivel_3',
    name: 'Nivel 3',
    description:
      'El nivel más completo, pensado para quienes acompañan de forma profesional. También en preparación.',
    status: 'pending',
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
  max-width: 900px;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 18px;
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

.plan--pending {
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
  flex: 1;
}

.plan__cta {
  align-self: flex-start;
  margin-top: 6px;
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

@media (max-width: 860px) {
  .plans__grid {
    grid-template-columns: 1fr;
  }
}
</style>
