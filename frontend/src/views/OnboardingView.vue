<template>
  <div class="container onboarding">
    <div class="onboarding__card" :class="{ 'onboarding__card--wide': currentKind === 'gift' }">
      <p v-if="!claimedGift" class="onboarding__step-label">Paso {{ step }} de {{ totalSteps }}</p>

      <!-- Paso 1: tipo de usuario -->
      <template v-if="currentKind === 'role'">
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
          @click="step++"
        >
          Continuar
        </button>
      </template>

      <!-- Paso 2: términos + newsletter -->
      <template v-else-if="currentKind === 'terms'">
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
            >Quiero recibir nuevos artículos y otras novedades del sitio por correo (podés darte de
            baja cuando quieras).</span
          >
        </label>

        <p v-if="errorMessage" class="onboarding__error" role="alert">
          {{ errorMessage }}
        </p>

        <div class="onboarding__actions">
          <button type="button" class="btn btn--ghost" @click="step--">Atrás</button>
          <button
            type="button"
            class="btn btn--primary onboarding__submit"
            :disabled="isSubmitting"
            @click="onFinishStep2"
          >
            {{ isSubmitting ? 'Guardando…' : totalSteps > step ? 'Continuar' : 'Finalizar' }}
          </button>
        </div>
      </template>

      <!-- Paso 3: perfil profesional, opcional, solo AT/Cuidador -->
      <template v-else-if="currentKind === 'professional'">
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
            @click="advanceOrFinish"
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

      <!-- Paso 4: regalo de bienvenida — solo si hay al menos un ebook activo con PDF cargado -->
      <template v-else-if="currentKind === 'gift' && !claimedGift">
        <h1 class="onboarding__title">Elegí tu regalo de bienvenida 🎁</h1>
        <p class="onboarding__lead">
          Un ebook a elección, de yapa por sumarte. Podés descargarlo ahora o más tarde desde tu
          cuenta.
        </p>

        <GiftPicker v-model="giftSelectedId" :ebooks="availableGifts" :disabled="isClaimingGift" />

        <p v-if="giftError" class="onboarding__error" role="alert">{{ giftError }}</p>

        <div class="onboarding__actions">
          <button type="button" class="btn btn--ghost" :disabled="isClaimingGift" @click="onFinish">
            Ahora no
          </button>
          <button
            type="button"
            class="btn btn--primary onboarding__submit"
            :disabled="!giftSelectedId || isClaimingGift"
            @click="onClaimGiftAndFinish"
          >
            {{ isClaimingGift ? 'Guardando…' : 'Elegir y finalizar' }}
          </button>
        </div>
      </template>

      <!-- Paso 4b: confirmación — recién elegido, antes de cerrar el onboarding. Sin esto el
           diálogo se cerraba solo (onFinish() redirige) sin ninguna pista de dónde quedó el
           regalo — frustrante para el usuario, que recién eligió el título. -->
      <template v-else-if="currentKind === 'gift' && claimedGift">
        <p class="onboarding__step-label">Tu regalo de bienvenida</p>
        <img
          v-if="claimedGift.ebook.coverImage"
          :src="claimedGift.ebook.coverImage"
          :alt="`Portada de ${claimedGift.ebook.title}`"
          class="onboarding__gift-cover"
        />
        <h1 class="onboarding__title">{{ claimedGift.ebook.title }}</h1>
        <p v-if="claimedGift.ebook.subtitle" class="onboarding__gift-subtitle">
          {{ claimedGift.ebook.subtitle }}
        </p>

        <button
          type="button"
          class="btn btn--primary onboarding__submit"
          :disabled="isDownloadingGift"
          @click="onDownloadClaimedGift"
        >
          {{ isDownloadingGift ? 'Descargando…' : 'Descargar mi ebook' }}
        </button>

        <p v-if="downloadGiftError" class="onboarding__error" role="alert">
          {{ downloadGiftError }}
        </p>

        <p class="onboarding__gift-note">
          También podés descargarlo cuando quieras desde el menú de tu perfil, en
          <strong>"Tu regalo de bienvenida"</strong>.
        </p>

        <button type="button" class="btn btn--ghost onboarding__submit" @click="onFinish">
          Listo, continuar
        </button>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { completeOnboarding } from '@/services/onboarding.api'
import { upsertProfessionalProfile } from '@/services/profile.api'
import { claimGift, downloadMyGift, getAvailableGifts } from '@/services/gifts.api'
import GiftPicker from '@/components/gifts/GiftPicker.vue'
import { PROFESSIONAL_PROFILE_ROLES, PROFILE_ROLE_LABEL, type ProfileRole } from '@/types/auth'
import type { EbookClaim, WelcomeEbook } from '@/types/gifts'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const profileRoleOptions = (Object.keys(PROFILE_ROLE_LABEL) as ProfileRole[]).map((value) => ({
  value,
  label: PROFILE_ROLE_LABEL[value],
}))

const step = ref(1)
const profileRoleDraft = ref<ProfileRole | null>(null)
const showsStep3 = computed(
  () =>
    profileRoleDraft.value !== null && PROFESSIONAL_PROFILE_ROLES.includes(profileRoleDraft.value)
)

// Regalo de bienvenida (ver docs/features/welcome-ebook-gift.md) — se
// consulta apenas se monta la vista (no hace falta esperar al paso 3/4
// para saberlo) para que totalSteps sea correcto desde el principio. Si no
// hay ningún ebook disponible, el paso ni se arma — visibilidad por datos.
const availableGifts = ref<WelcomeEbook[]>([])
const showsGiftStep = computed(() => availableGifts.value.length > 0)

// Orden dinámico de pasos: el perfil profesional y el regalo son
// opcionales según el rol elegido / si hay ebooks cargados — el número de
// paso que ve el usuario depende de cuáles apliquen.
type StepKind = 'role' | 'terms' | 'professional' | 'gift'
const stepOrder = computed<StepKind[]>(() => {
  const order: StepKind[] = ['role', 'terms']
  if (showsStep3.value) order.push('professional')
  if (showsGiftStep.value) order.push('gift')
  return order
})
const totalSteps = computed(() => stepOrder.value.length)
const currentKind = computed<StepKind>(() => stepOrder.value[step.value - 1] ?? 'role')

function advanceOrFinish() {
  if (step.value < totalSteps.value) {
    step.value++
  } else {
    onFinish()
  }
}

onMounted(async () => {
  availableGifts.value = await getAvailableGifts().catch(() => [])
})

// Paso 2
const acceptedTerms = ref(false)
const subscribeNewsletter = ref(false)
const isSubmitting = ref(false)
const errorMessage = ref('')
// Saca el aviso apenas tilda el checkbox, para no dejarlo pegado si ya
// resolvió lo que lo disparó.
watch(acceptedTerms, (accepted) => {
  if (accepted) errorMessage.value = ''
})

async function onFinishStep2() {
  if (!profileRoleDraft.value) return
  if (!acceptedTerms.value) {
    errorMessage.value =
      'Tenés que aceptar los Términos de uso y la Política de privacidad para continuar.'
    return
  }
  isSubmitting.value = true
  errorMessage.value = ''
  try {
    const updated = await completeOnboarding({
      profileRole: profileRoleDraft.value,
      acceptedTerms: true,
      subscribeNewsletter: subscribeNewsletter.value,
    })
    authStore.updateLocalUser(updated)
    advanceOrFinish()
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
    advanceOrFinish()
  } catch {
    professionalError.value = 'No pudimos guardar tu perfil profesional. Podés cargarlo más tarde.'
  } finally {
    isSavingProfessional.value = false
  }
}

// Paso 4
const giftSelectedId = ref<string | null>(null)
const isClaimingGift = ref(false)
const giftError = ref('')
// Paso 4b (confirmación) — ver template: no cierra el onboarding apenas se elige, primero
// muestra de dónde descargar (y que también queda disponible desde el menú de perfil).
const claimedGift = ref<EbookClaim | null>(null)
const isDownloadingGift = ref(false)
const downloadGiftError = ref('')

async function onClaimGiftAndFinish() {
  if (!giftSelectedId.value) return
  isClaimingGift.value = true
  giftError.value = ''
  try {
    claimedGift.value = await claimGift(giftSelectedId.value)
    // La confirmación reemplaza al picker en el mismo lugar del DOM, pero si el usuario venía
    // scrolleado (esperable — el picker es largo) la tarjeta seguía arrancando fuera de vista.
    // `nextTick` no alcanza acá porque el scroll debe pasar después de que Vue reemplace el
    // contenido del paso, así que se espera al siguiente frame de pintado.
    requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'smooth' }))
  } catch {
    giftError.value = 'No pudimos guardar tu elección. Probá de nuevo.'
  } finally {
    isClaimingGift.value = false
  }
}

async function onDownloadClaimedGift() {
  if (!claimedGift.value) return
  downloadGiftError.value = ''
  isDownloadingGift.value = true
  try {
    const ebook = claimedGift.value.ebook
    await downloadMyGift(ebook.fileName ?? `${ebook.slug}.pdf`)
  } catch {
    downloadGiftError.value =
      'No pudimos descargar el archivo. Podés intentarlo de nuevo desde tu perfil.'
  } finally {
    isDownloadingGift.value = false
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
  transition: max-width 0.2s ease;
}

/* Paso del regalo (elección + confirmación de descarga): las tarjetas de GiftPicker con el
   ancho angosto de siempre estiraban mucho la descripción verticalmente y obligaban a scrollear
   para llegar al botón — con más ancho, GiftPicker pasa a 2 columnas (ver gift-picker.css) y todo
   el paso entra sin scroll en la mayoría de las pantallas. */
.onboarding__card--wide {
  max-width: 760px;
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

.onboarding__gift-cover {
  width: 140px;
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-md);
  align-self: center;
}

.onboarding__gift-subtitle {
  font-size: 0.92rem;
  font-weight: 600;
  color: var(--color-ink-muted);
  margin: -8px 0 0;
}

.onboarding__gift-note {
  font-size: 0.85rem;
  color: var(--color-ink-secondary);
  line-height: 1.55;
  background: var(--color-canvas);
  border-radius: var(--radius-md);
  padding: 12px 14px;
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
