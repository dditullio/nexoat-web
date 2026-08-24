<template>
  <div class="container profile">
    <p class="eyebrow profile__eyebrow">Mi cuenta</p>
    <h1 class="profile__title">Mi perfil</h1>
    <p class="profile__lead">
      Contanos quién sos para que el sitio te muestre lo más útil primero.
    </p>

    <div class="profile__grid">
      <!-- Avatar -->
      <section class="card profile__card profile__card--avatar">
        <span class="profile__avatar" :class="{ 'is-uploading': isUploadingAvatar }">
          <img
            v-if="showAvatarImg"
            :src="user!.avatarUrl!"
            alt=""
            @error="avatarImgFailed = true"
          />
          <span v-else class="profile__initials">{{ initials }}</span>
        </span>

        <div class="profile__avatar-actions">
          <label
            class="btn btn--ghost profile__avatar-btn"
            :class="{ 'is-disabled': isUploadingAvatar }"
          >
            {{ isUploadingAvatar ? 'Subiendo…' : user?.avatarUrl ? 'Cambiar foto' : 'Subir foto' }}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              class="profile__file-input"
              :disabled="isUploadingAvatar"
              @change="onAvatarSelected"
            />
          </label>
          <button
            v-if="user?.avatarUrl"
            type="button"
            class="profile__avatar-remove"
            :disabled="isUploadingAvatar"
            @click="onRemoveAvatar"
          >
            Quitar foto
          </button>
        </div>
        <p v-if="avatarError" class="auth__error" role="alert">{{ avatarError }}</p>
      </section>

      <!-- Datos básicos + tipo de usuario -->
      <section class="card profile__card">
        <h2 class="profile__section-title">Datos básicos</h2>

        <form class="auth__form" @submit.prevent="onSaveBasics">
          <label class="auth__field">
            <span class="auth__label">Nombre</span>
            <input
              v-model="nameDraft"
              type="text"
              autocomplete="name"
              class="auth__input"
              :disabled="isSavingBasics"
            />
          </label>

          <fieldset class="profile__role-field">
            <legend class="auth__label">¿Cómo te describirías?</legend>
            <div class="profile__role-options">
              <label
                v-for="role in profileRoleOptions"
                :key="role.value"
                class="profile__role-option"
                :class="{ 'is-selected': profileRoleDraft === role.value }"
              >
                <input
                  v-model="profileRoleDraft"
                  type="radio"
                  name="profileRole"
                  :value="role.value"
                  :disabled="isSavingBasics"
                />
                {{ role.label }}
              </label>
            </div>
          </fieldset>

          <p v-if="basicsError" class="auth__error" role="alert">{{ basicsError }}</p>
          <p v-if="basicsSaved" class="profile__saved">Guardado.</p>

          <button type="submit" class="btn btn--primary profile__submit" :disabled="isSavingBasics">
            {{ isSavingBasics ? 'Guardando…' : 'Guardar' }}
          </button>
        </form>
      </section>

      <!-- Perfil profesional — solo AT/Cuidador -->
      <section v-if="showsProfessionalProfile" class="card profile__card">
        <h2 class="profile__section-title">Perfil profesional</h2>
        <p class="profile__section-hint">
          Un mini-currículum breve: en qué te especializás y tu trayectoria.
        </p>

        <form class="auth__form" @submit.prevent="onSaveProfessional">
          <label class="auth__field">
            <span class="auth__label">Área o especialización</span>
            <input
              v-model="specializationDraft"
              type="text"
              required
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
              rows="5"
              maxlength="2000"
              placeholder="Formación, trayectoria, enfoque de trabajo…"
              class="auth__input profile__textarea"
              :disabled="isSavingProfessional"
            />
          </label>

          <p v-if="professionalError" class="auth__error" role="alert">{{ professionalError }}</p>
          <p v-if="professionalSaved" class="profile__saved">Guardado.</p>

          <button
            type="submit"
            class="btn btn--primary profile__submit"
            :disabled="isSavingProfessional"
          >
            {{ isSavingProfessional ? 'Guardando…' : 'Guardar perfil profesional' }}
          </button>
        </form>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { ApiError } from '@/services/http'
import {
  deleteAvatar,
  getProfile,
  updateProfile,
  uploadAvatar,
  upsertProfessionalProfile,
} from '@/services/profile.api'
import { PROFESSIONAL_PROFILE_ROLES, PROFILE_ROLE_LABEL, type ProfileRole } from '@/types/auth'

const authStore = useAuthStore()
const user = computed(() => authStore.user)

const initials = computed(() => {
  const base = user.value?.name?.trim() || user.value?.email || '?'
  const parts = base.split(/[\s.@_-]+/).filter(Boolean)
  return (parts[0]?.[0] ?? '?').concat(parts[1]?.[0] ?? '').toUpperCase()
})

const profileRoleOptions = (Object.keys(PROFILE_ROLE_LABEL) as ProfileRole[]).map((value) => ({
  value,
  label: PROFILE_ROLE_LABEL[value],
}))

// Avatar
const isUploadingAvatar = ref(false)
const avatarError = ref('')
// Si la URL de la foto (típicamente de Google/Facebook) no carga, cae a las
// iniciales en vez del ícono de imagen rota del navegador.
const avatarImgFailed = ref(false)
const showAvatarImg = computed(() => !!user.value?.avatarUrl && !avatarImgFailed.value)
watch(
  () => user.value?.avatarUrl,
  () => {
    avatarImgFailed.value = false
  }
)

async function onAvatarSelected(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = '' // permite re-seleccionar el mismo archivo después
  if (!file) return

  avatarError.value = ''
  isUploadingAvatar.value = true
  try {
    const updated = await uploadAvatar(file)
    authStore.updateLocalUser(updated)
  } catch (err) {
    avatarError.value =
      err instanceof ApiError ? err.message : 'No pudimos subir la imagen. Probá de nuevo.'
  } finally {
    isUploadingAvatar.value = false
  }
}

async function onRemoveAvatar() {
  avatarError.value = ''
  isUploadingAvatar.value = true
  try {
    const updated = await deleteAvatar()
    authStore.updateLocalUser(updated)
  } catch {
    avatarError.value = 'No pudimos quitar la foto. Probá de nuevo.'
  } finally {
    isUploadingAvatar.value = false
  }
}

// Datos básicos
const nameDraft = ref('')
const profileRoleDraft = ref<ProfileRole | null>(null)
const isSavingBasics = ref(false)
const basicsError = ref('')
const basicsSaved = ref(false)

const showsProfessionalProfile = computed(
  () =>
    profileRoleDraft.value !== null && PROFESSIONAL_PROFILE_ROLES.includes(profileRoleDraft.value)
)

async function onSaveBasics() {
  basicsError.value = ''
  basicsSaved.value = false
  isSavingBasics.value = true
  try {
    const updated = await updateProfile({
      name: nameDraft.value || undefined,
      profileRole: profileRoleDraft.value,
    })
    authStore.updateLocalUser(updated)
    basicsSaved.value = true
  } catch {
    basicsError.value = 'No pudimos guardar los cambios. Probá de nuevo.'
  } finally {
    isSavingBasics.value = false
  }
}

// Perfil profesional
const specializationDraft = ref('')
const experienceYearsDraft = ref<number | null>(null)
const bioDraft = ref('')
const isSavingProfessional = ref(false)
const professionalError = ref('')
const professionalSaved = ref(false)

async function onSaveProfessional() {
  professionalError.value = ''
  professionalSaved.value = false
  isSavingProfessional.value = true
  try {
    const updated = await upsertProfessionalProfile({
      specialization: specializationDraft.value,
      experienceYears: experienceYearsDraft.value ?? undefined,
      bio: bioDraft.value || undefined,
    })
    authStore.updateLocalUser(updated)
    professionalSaved.value = true
  } catch (err) {
    professionalError.value =
      err instanceof ApiError ? err.message : 'No pudimos guardar tu perfil profesional.'
  } finally {
    isSavingProfessional.value = false
  }
}

// Al elegir/guardar un ProfileRole nuevo se resetea el aviso "Guardado" del
// bloque profesional — evita que quede un "Guardado" viejo de un tipo de
// usuario distinto.
watch(profileRoleDraft, () => {
  professionalSaved.value = false
})

function loadDrafts() {
  nameDraft.value = user.value?.name ?? ''
  profileRoleDraft.value = user.value?.profileRole ?? null
  const pro = user.value?.professionalProfile
  specializationDraft.value = pro?.specialization ?? ''
  experienceYearsDraft.value = pro?.experienceYears ?? null
  bioDraft.value = pro?.bio ?? ''
}

onMounted(async () => {
  // GET /me/profile trae el `professionalProfile` completo — a diferencia
  // de la sesión abierta al hacer login (ver types/auth.ts), que no lo
  // incluye.
  const fresh = await getProfile()
  authStore.updateLocalUser(fresh)
  loadDrafts()
})
</script>

<style scoped>
.profile {
  padding-block: 48px 80px;
  max-width: 720px;
}

.profile__eyebrow {
  margin-bottom: 8px;
}

.profile__title {
  font-size: 2rem;
  margin-bottom: 10px;
}

.profile__lead {
  font-size: 0.95rem;
  color: var(--color-ink-secondary);
  line-height: 1.6;
  margin-bottom: 36px;
}

.profile__grid {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.card {
  background: var(--color-surface);
  border: 1px solid var(--color-line-light);
  border-radius: var(--radius-2xl);
  box-shadow: var(--shadow-sm);
}

.profile__card {
  padding: 32px 36px;
}

.profile__card--avatar {
  display: flex;
  align-items: center;
  gap: 22px;
  flex-wrap: wrap;
}

.profile__section-title {
  font-family: var(--font-display);
  font-size: 1.25rem;
  margin-bottom: 6px;
}

.profile__section-hint {
  font-size: 0.85rem;
  color: var(--color-ink-faint);
  margin-bottom: 22px;
}

/* Avatar */
.profile__avatar {
  width: 84px;
  height: 84px;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-primary-tint);
  color: var(--color-primary-dark);
  transition: opacity 0.2s ease;
}

.profile__avatar.is-uploading {
  opacity: 0.6;
}

.profile__avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.profile__initials {
  font-family: var(--font-display);
  font-variation-settings: 'SOFT' 60;
  font-size: 1.6rem;
  font-weight: 700;
}

.profile__avatar-actions {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
}

.profile__avatar-btn {
  position: relative;
  cursor: pointer;
}

.profile__avatar-btn.is-disabled {
  opacity: 0.6;
  pointer-events: none;
}

.profile__file-input {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
}

.profile__avatar-remove {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--color-ink-faint);
  text-decoration: underline;
  text-decoration-color: var(--color-line);
  text-underline-offset: 3px;
  transition: color 0.2s ease;
}

.profile__avatar-remove:hover {
  color: var(--color-ink);
}

/* Tipo de usuario */
.profile__role-field {
  border: none;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.profile__role-options {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 10px;
}

.profile__role-option {
  display: flex;
  align-items: center;
  gap: 9px;
  font-size: 0.88rem;
  font-weight: 600;
  color: var(--color-ink-secondary);
  border: 1.5px solid var(--color-line);
  border-radius: var(--radius-md);
  padding: 11px 14px;
  cursor: pointer;
  transition:
    border-color 0.2s ease,
    background 0.2s ease,
    color 0.2s ease;
}

.profile__role-option:hover {
  border-color: var(--color-primary);
}

.profile__role-option.is-selected {
  border-color: var(--color-primary);
  background: var(--color-primary-tint);
  color: var(--color-primary-dark);
}

.profile__role-option input {
  accent-color: var(--color-primary);
}

.profile__textarea {
  resize: vertical;
  line-height: 1.6;
  font-family: inherit;
}

.profile__submit {
  align-self: flex-start;
  margin-top: 4px;
}

.profile__saved {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--color-primary-dark);
}

/* Reusa el lenguaje visual de los formularios de auth (RegisterView.vue) */
.auth__form {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

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

.auth__error {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--color-accent-dark);
  background: var(--color-accent-soft);
  border-radius: var(--radius-md);
  padding: 10px 14px;
}
</style>
