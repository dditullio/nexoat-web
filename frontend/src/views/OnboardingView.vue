<template>
  <div class="container onboarding">
    <div class="onboarding__card">
      <p class="onboarding__step-label">Paso {{ step }} de {{ totalSteps }}</p>

      <!-- Paso 1: tipo de usuario -->
      <template v-if="step === 1">
        <h1 class="onboarding__title">¿Cómo te describirías?</h1>
        <p class="onboarding__lead">Nos ayuda a mostrarte lo más útil primero.</p>

        <div class="onboarding__role-options">
          <label
            v-for="role in profileRoleOptions"
            :key="role.value"
            class="onboarding__role-option"
            :class="{ 'is-selected': profileRoleDraft === role.value }"
          >
            <input v-model="profileRoleDraft" type="radio" name="profileRole" :value="role.value" />
            {{ role.label }}
          </label>
        </div>

        <button
          type="button"
          class="btn btn--primary onboarding__submit"
          :disabled="!profileRoleDraft"
          @click="step = 2"
        >
          Continuar
        </button>
      </template>

      <!-- Paso 2: términos + newsletter -->
      <template v-else-if="step === 2">
        <h1 class="onboarding__title">Ya casi</h1>
        <p class="onboarding__lead">Dos cositas más y terminamos.</p>

        <label class="onboarding__check">
          <input v-model="acceptedTerms" type="checkbox" />
          <span>
            Acepto los
            <RouterLink to="/terminos" target="_blank"
              >Términos de uso y la Política de privacidad</RouterLink
            >
            de NexoAT.
          </span>
        </label>

        <label class="onboarding__check">
          <input v-model="subscribeNewsletter" type="checkbox" />
          <span
            >Quiero recibir novedades del sitio por correo (podés darte de baja cuando
            quieras).</span
          >
        </label>

        <p v-if="errorMessage" class="onboarding__error" role="alert">{{ errorMessage }}</p>

        <div class="onboarding__actions">
          <button type="button" class="btn btn--ghost" @click="step = 1">Atrás</button>
          <button
            type="button"
            class="btn btn--primary onboarding__submit"
            :disabled="!acceptedTerms || isSubmitting"
            @click="onFinishStep2"
          >
            {{ isSubmitting ? 'Guardando…' : 'Finalizar' }}
          </button>
        </div>
      </template>

      <!-- Paso 3: perfil profesional, opcional, solo AT/Cuidador -->
      <template v-else>
        <h1 class="onboarding__title">Perfil profesional</h1>
        <p class="onboarding__lead">
          Opcional — un mini-currículum breve: en qué te especializás y tu trayectoria. Podés
          cargarlo ahora o más tarde desde tu perfil.
        </p>

        <label class="auth__field">
          <span class="auth__label">Área o especialización</span>
          <input
            v-model="specializationDraft"
            type="text"
            maxlength="160"
            placeholder="Ej.: Acompañamiento en primera infancia con TEA"
            class="auth__input"
            :disabled="isSavingProfessional"
          />
        </label>

        <label class="auth__field">
          <span class="auth__label">Años de experiencia</span>
          <input
            v-model.number="experienceYearsDraft"
            type="number"
            min="0"
            max="80"
            class="auth__input"
            :disabled="isSavingProfessional"
          />
        </label>

        <label class="auth__field">
          <span class="auth__label">Sobre mí</span>
          <textarea
            v-model="bioDraft"
            rows="4"
            maxlength="2000"
            placeholder="Formación, trayectoria, enfoque de trabajo…"
            class="auth__input onboarding__textarea"
            :disabled="isSavingProfessional"
          />
        </label>

        <p v-if="professionalError" class="onboarding__error" role="alert">
          {{ professionalError }}
        </p>

        <div class="onboarding__actions">
          <button
            type="button"
            class="btn btn--ghost"
            :disabled="isSavingProfessional"
            @click="onFinish"
          >
            Hacerlo más tarde
          </button>
          <button
            type="button"
            class="btn btn--primary onboarding__submit"
            :disabled="!specializationDraft || isSavingProfessional"
            @click="onSaveProfessionalAndFinish"
          >
            {{ isSavingProfessional ? 'Guardando…' : 'Guardar y continuar' }}
          </button>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { completeOnboarding } from '@/services/onboarding.api'
import { upsertProfessionalProfile } from '@/services/profile.api'
import { PROFESSIONAL_PROFILE_ROLES, PROFILE_ROLE_LABEL, type ProfileRole } from '@/types/auth'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const profileRoleOptions = (Object.keys(PROFILE_ROLE_LABEL) as ProfileRole[]).map((value) => ({
  value,
  label: PROFILE_ROLE_LABEL[value],
}))

const step = ref<1 | 2 | 3>(1)
const profileRoleDraft = ref<ProfileRole | null>(null)
const showsStep3 = computed(
  () =>
    profileRoleDraft.value !== null && PROFESSIONAL_PROFILE_ROLES.includes(profileRoleDraft.value)
)
const totalSteps = computed(() => (showsStep3.value ? 3 : 2))

// Paso 2
const acceptedTerms = ref(false)
const subscribeNewsletter = ref(false)
const isSubmitting = ref(false)
const errorMessage = ref('')

async function onFinishStep2() {
  if (!profileRoleDraft.value || !acceptedTerms.value) return
  isSubmitting.value = true
  errorMessage.value = ''
  try {
    const updated = await completeOnboarding({
      profileRole: profileRoleDraft.value,
      acceptedTerms: true,
      subscribeNewsletter: subscribeNewsletter.value,
    })
    authStore.updateLocalUser(updated)
    if (showsStep3.value) {
      step.value = 3
    } else {
      onFinish()
    }
  } catch {
    errorMessage.value = 'No pudimos guardar. Probá de nuevo.'
  } finally {
    isSubmitting.value = false
  }
}

// Paso 3
const specializationDraft = ref('')
const experienceYearsDraft = ref<number | null>(null)
const bioDraft = ref('')
const isSavingProfessional = ref(false)
const professionalError = ref('')

async function onSaveProfessionalAndFinish() {
  if (!specializationDraft.value) return
  isSavingProfessional.value = true
  professionalError.value = ''
  try {
    const updated = await upsertProfessionalProfile({
      specialization: specializationDraft.value,
      experienceYears: experienceYearsDraft.value ?? undefined,
      bio: bioDraft.value || undefined,
    })
    authStore.updateLocalUser(updated)
    onFinish()
  } catch {
    professionalError.value = 'No pudimos guardar tu perfil profesional. Podés cargarlo más tarde.'
  } finally {
    isSavingProfessional.value = false
  }
}

function onFinish() {
  const redirect = route.query.redirect
  router.push(typeof redirect === 'string' ? redirect : '/')
}
</script>

<style scoped>
.onboarding {
  min-height: 70vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding-block: 64px;
}

.onboarding__card {
  width: 100%;
  max-width: 460px;
  background: var(--color-surface);
  border: 1px solid var(--color-line-light);
  border-radius: var(--radius-2xl);
  box-shadow: var(--shadow-lg);
  padding: 40px 36px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.onboarding__step-label {
  font-size: 0.72rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--color-ink-faint);
}

.onboarding__title {
  font-size: 1.6rem;
  margin: 0;
}

.onboarding__lead {
  font-size: 0.92rem;
  color: var(--color-ink-secondary);
  line-height: 1.6;
  margin-bottom: 8px;
}

.onboarding__role-options {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.onboarding__role-option {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 0.92rem;
  font-weight: 600;
  color: var(--color-ink-secondary);
  border: 1.5px solid var(--color-line);
  border-radius: var(--radius-md);
  padding: 13px 16px;
  cursor: pointer;
  transition:
    border-color 0.2s ease,
    background 0.2s ease,
    color 0.2s ease;
}

.onboarding__role-option:hover {
  border-color: var(--color-primary);
}

.onboarding__role-option.is-selected {
  border-color: var(--color-primary);
  background: var(--color-primary-tint);
  color: var(--color-primary-dark);
}

.onboarding__role-option input {
  accent-color: var(--color-primary);
}

.onboarding__check {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  font-size: 0.88rem;
  line-height: 1.55;
  color: var(--color-ink-secondary);
  cursor: pointer;
}

.onboarding__check input {
  margin-top: 3px;
  flex-shrink: 0;
  accent-color: var(--color-primary);
}

.onboarding__check a {
  color: var(--color-primary-dark);
  text-decoration: underline;
  text-decoration-color: var(--color-line);
  text-underline-offset: 2px;
}

.onboarding__error {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--color-accent-dark);
  background: var(--color-accent-soft);
  border-radius: var(--radius-md);
  padding: 10px 14px;
}

.onboarding__actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 8px;
}

.onboarding__submit {
  flex: 1;
}

.onboarding__textarea {
  resize: vertical;
  line-height: 1.6;
  font-family: inherit;
}

/* Mismo lenguaje visual que los formularios de auth */
.auth__field {
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.auth__label {
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--color-ink-muted);
}

.auth__input {
  background: var(--color-canvas);
  border: 1.5px solid var(--color-line);
  border-radius: var(--radius-md);
  padding: 11px 14px;
  font-size: 0.95rem;
  transition: border-color 0.2s ease;
}

.auth__input:focus-visible {
  border-color: var(--color-primary);
}

.auth__input:disabled {
  opacity: 0.6;
}
</style>
