<template>
  <form class="cf" :class="{ 'cf--compact': compact }" @submit.prevent="onSubmit">
    <label v-if="needsSignature" class="cf__field">
      <span class="cf__label">¿Cómo querés firmar?</span>
      <input
        v-model="signature"
        type="text"
        placeholder="Tu nombre"
        maxlength="80"
        class="cf__signature"
        :disabled="isSubmitting"
      />
    </label>

    <textarea
      ref="textareaEl"
      v-model="body"
      class="cf__textarea"
      :rows="compact ? 2 : 3"
      :maxlength="MAX_LENGTH"
      :placeholder="placeholder"
      :disabled="isSubmitting"
    ></textarea>

    <div class="cf__foot">
      <span class="cf__notice">
        Tu nombre y tu foto de perfil serán visibles junto a tu comentario.
      </span>
      <span v-if="body.length > WARN_LENGTH" class="cf__count">
        {{ body.length }}/{{ MAX_LENGTH }}
      </span>
    </div>

    <p v-if="errorMessage" class="cf__error" role="alert">{{ errorMessage }}</p>

    <div class="cf__actions">
      <button
        v-if="compact"
        type="button"
        class="btn btn--ghost cf__cancel"
        :disabled="isSubmitting"
        @click="$emit('cancel')"
      >
        Cancelar
      </button>

      <!-- rel="nofollow": sin esto, Google seguía este link desde
           cualquier artículo con comentarios y encadenaba hacia el resto
           del flujo de auth (/ingresar, /registrarme/correo) — todo
           noindex igual, pero gastaba rastreo en páginas que nunca van a
           indexarse. Ver docs/features/seo.md, sección "Long tail". -->
      <RouterLink
        v-if="!authStore.isAuthenticated"
        :to="ctaTarget"
        rel="nofollow"
        class="btn btn--primary cf__submit"
        @click="onCtaClick"
      >
        Accedé con una cuenta gratuita para comentar
      </RouterLink>
      <button
        v-else
        type="submit"
        class="btn btn--primary cf__submit"
        :disabled="isSubmitting || !body.trim()"
      >
        {{ isSubmitting ? 'Publicando…' : submitLabel }}
      </button>
    </div>
  </form>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { ApiError } from '@/services/http'
import { postComment } from '@/services/comments.api'
import { updateProfile } from '@/services/profile.api'
import {
  saveCommentDraft,
  readCommentDraft,
  clearCommentDraft,
} from '@/composables/useCommentDraft'
import type { Comment } from '@/types/comments'

const props = withDefaults(
  defineProps<{
    slug: string
    /** Si está seteado, este formulario publica una respuesta (2° nivel del hilo). */
    parentId?: string
    /** Formularios de respuesta: más chicos, con "Cancelar". El principal no. */
    compact?: boolean
    autofocus?: boolean
  }>(),
  { parentId: undefined, compact: false, autofocus: false }
)

const emit = defineEmits<{ posted: [Comment]; cancel: [] }>()

const MAX_LENGTH = 3000
const WARN_LENGTH = 2700

const route = useRoute()
const authStore = useAuthStore()

const body = ref('')
const signature = ref('')
const isSubmitting = ref(false)
const errorMessage = ref('')
const textareaEl = ref<HTMLTextAreaElement | null>(null)

const placeholder = computed(() =>
  props.compact ? 'Escribí tu respuesta…' : 'Sumá tu comentario…'
)
const submitLabel = computed(() => (props.compact ? 'Responder' : 'Publicar comentario'))

// Ver docs/features/article-comments.md, decisión 6: cuentas sin `name`
// (viejas, o altas por OAuth sin nombre) eligen cómo firmar antes de su
// primer comentario.
const needsSignature = computed(() => authStore.isAuthenticated && !authStore.user?.name)

// Vuelve exactamente a este artículo, en el ancla de comentarios, tras
// registrarse — ver decisión 4 (borrador en localStorage) y
// CompleteSignupView.vue / OAuthCallbackView.vue, que ya leen `redirect`.
const ctaTarget = computed(() => ({
  name: 'register',
  query: { redirect: `${route.path}#comentarios` },
}))

function onCtaClick() {
  // Solo el composer principal persiste borrador (ver comentario en
  // CommentsSection.vue sobre la simplificación de no rehidratar
  // respuestas puntuales) — igual guardamos parentId si lo hay, por si en
  // el futuro se decide reabrir la respuesta exacta.
  if (body.value.trim()) saveCommentDraft(props.slug, body.value, props.parentId)
}

onMounted(() => {
  if (!props.compact && !authStore.isAuthenticated) {
    const draft = readCommentDraft(props.slug)
    if (draft) body.value = draft.body
  }
  if (props.autofocus) {
    nextTick(() => textareaEl.value?.focus())
  }
})

async function onSubmit() {
  if (!body.value.trim() || isSubmitting.value) return
  isSubmitting.value = true
  errorMessage.value = ''
  try {
    if (needsSignature.value && signature.value.trim()) {
      const updated = await updateProfile({ name: signature.value.trim() })
      authStore.updateLocalUser(updated)
    }
    const comment = await postComment(props.slug, body.value.trim(), props.parentId)
    clearCommentDraft(props.slug)
    body.value = ''
    emit('posted', comment)
  } catch (err) {
    errorMessage.value =
      err instanceof ApiError ? err.message : 'No pudimos publicar el comentario. Probá de nuevo.'
  } finally {
    isSubmitting.value = false
  }
}
</script>

<style scoped>
.cf {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.cf__field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.cf__label {
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--color-ink-muted);
}

.cf__signature {
  background: var(--color-canvas);
  border: 1.5px solid var(--color-line);
  border-radius: var(--radius-md);
  padding: 9px 12px;
  font-size: 0.9rem;
  transition: border-color 0.2s ease;
}

.cf__signature:focus-visible {
  border-color: var(--color-primary);
}

.cf__textarea {
  width: 100%;
  resize: vertical;
  background: var(--color-canvas);
  border: 1.5px solid var(--color-line);
  border-radius: var(--radius-lg);
  padding: 12px 14px;
  font-family: var(--font-sans);
  font-size: 0.92rem;
  line-height: 1.55;
  color: var(--color-ink);
  transition: border-color 0.2s ease;
}

.cf__textarea:focus-visible {
  border-color: var(--color-primary);
}

.cf__textarea:disabled {
  opacity: 0.6;
}

.cf--compact .cf__textarea {
  border-radius: var(--radius-md);
}

.cf__foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.cf__notice {
  font-size: 0.74rem;
  color: var(--color-ink-faint);
  line-height: 1.4;
}

.cf__count {
  flex-shrink: 0;
  font-size: 0.74rem;
  font-weight: 600;
  color: var(--color-ochre);
}

.cf__error {
  font-size: 0.84rem;
  font-weight: 600;
  color: var(--color-accent-dark);
  background: var(--color-accent-soft);
  border-radius: var(--radius-md);
  padding: 9px 13px;
}

.cf__actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
}

.cf__submit {
  font-size: 0.88rem;
  padding: 0.65rem 1.3rem;
}

.cf__cancel {
  font-size: 0.85rem;
  padding: 0.6rem 1rem;
}
</style>
