<template>
  <article class="ci" :class="{ 'ci--reply': isReply }">
    <span class="ci__avatar" aria-hidden="true">
      <img
        v-if="showAvatarImg"
        :src="comment.author!.avatarUrl!"
        alt=""
        @error="avatarError = true"
      />
      <span v-else class="ci__initials">{{ initials }}</span>
    </span>

    <div class="ci__body">
      <div class="ci__head">
        <span class="ci__name">
          {{ comment.isHidden ? hiddenLabel : comment.author?.name }}
        </span>
        <span v-if="replyToName" class="ci__replyto">en respuesta a {{ replyToName }}</span>
        <span class="ci__date">{{ relativeDate }}</span>
        <span v-if="comment.editedAt" class="ci__edited">(editado)</span>
      </div>

      <p v-if="comment.isHidden" class="ci__deleted">{{ hiddenText }}</p>

      <template v-else-if="editing">
        <textarea
          v-model="editBody"
          class="ci__edit-textarea"
          rows="3"
          maxlength="3000"
          :disabled="editBusy"
        ></textarea>
        <p v-if="editError" class="ci__error" role="alert">{{ editError }}</p>
        <div class="ci__edit-actions">
          <button
            type="button"
            class="btn btn--ghost ci__action-btn"
            :disabled="editBusy"
            @click="cancelEdit"
          >
            Cancelar
          </button>
          <button
            type="button"
            class="btn btn--primary ci__action-btn"
            :disabled="editBusy || !editBody.trim()"
            @click="saveEdit"
          >
            {{ editBusy ? 'Guardando…' : 'Guardar' }}
          </button>
        </div>
      </template>

      <p v-else class="ci__text">{{ comment.body }}</p>

      <div v-if="!comment.isHidden && !editing" class="ci__actions">
        <button
          type="button"
          class="ci__action"
          :class="{ 'is-active': comment.likedByMe }"
          :disabled="likeBusy || canEdit"
          :title="canEdit ? 'No podés darle like a tu propio comentario' : undefined"
          @click="onToggleLike"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 16 16"
            :fill="comment.likedByMe ? 'currentColor' : 'none'"
            stroke="currentColor"
            stroke-width="1.5"
            aria-hidden="true"
          >
            <path
              d="M8 13.8s-5.4-3.3-5.4-7.2A3 3 0 0 1 8 4.6a3 3 0 0 1 5.4 2c0 3.9-5.4 7.2-5.4 7.2z"
            />
          </svg>
          <span v-if="comment.likeCount">{{ comment.likeCount }}</span>
        </button>

        <button v-if="!replying" type="button" class="ci__action" @click="startReply">
          Responder
        </button>

        <button v-if="canEdit" type="button" class="ci__action" @click="startEdit">Editar</button>
        <button v-if="canDelete" type="button" class="ci__action" @click="$emit('delete', comment)">
          Borrar
        </button>
        <button
          v-if="!canEdit && authStore.isAuthenticated"
          type="button"
          class="ci__action"
          :disabled="reportBusy || reportSent"
          @click="confirmingReport = true"
        >
          {{ reportSent ? 'Reportado' : 'Reportar' }}
        </button>
      </div>

      <div v-if="replying" class="ci__reply-form">
        <CommentForm
          :slug="slug"
          :parent-id="comment.id"
          compact
          autofocus
          @posted="onReplyPosted"
          @cancel="replying = false"
        />
      </div>
    </div>

    <ConfirmDialog
      :open="confirmingReport"
      title="Reportar comentario"
      confirm-label="Reportar"
      busy-label="Reportando…"
      tone="danger"
      :busy="reportBusy"
      @confirm="onReport"
      @cancel="confirmingReport = false"
    >
      <p>
        Se lo va a marcar para que un moderador lo revise. Usalo si te parece inapropiado, no para
        desacuerdos de opinión — reportar no lo oculta al instante.
      </p>
    </ConfirmDialog>
  </article>
</template>

<script setup lang="ts">
import { computed, ref, toRefs } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { likeComment, unlikeComment, reportComment, updateComment } from '@/services/comments.api'
import { ApiError } from '@/services/http'
import CommentForm from './CommentForm.vue'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import type { Comment } from '@/types/comments'

const props = withDefaults(
  defineProps<{
    comment: Comment
    slug: string
    isReply?: boolean
    /** Nombre de a quién responde, si esta respuesta apunta a otra respuesta (no a la raíz). */
    replyToName?: string | null
  }>(),
  { isReply: false, replyToName: null }
)

const emit = defineEmits<{ delete: [Comment]; 'reply-posted': [Comment] }>()

const authStore = useAuthStore()

// `comment` es la misma referencia reactiva que el objeto que vive en el
// array del padre (CommentsSection.vue) — mutarlo acá (like, editar) se ve
// reflejado ahí también, sin necesidad de eventos de ida y vuelta para cada
// cambio chico. Solo el borrado emite evento: ese sí necesita coordinación
// con el padre (decide si queda como "eliminado" o se saca de la lista).
const { comment } = toRefs(props)

const avatarError = ref(false)
const showAvatarImg = computed(() => !!comment.value.author?.avatarUrl && !avatarError.value)
const initials = computed(() => {
  const name = comment.value.author?.name ?? ''
  return (
    name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join('') || '·'
  )
})

const canEdit = computed(
  () => authStore.isAuthenticated && authStore.user?.id === comment.value.author?.id
)
// Role de Prisma no viaja al frontend — se compara contra los strings que sí
// llegan en AuthUser.role (mismo criterio que el resto del sitio).
const MODERATOR_ROLES = ['EDITOR', 'ADMIN', 'SUPER_ADMIN']
const canDelete = computed(
  () => canEdit.value || (!!authStore.user && MODERATOR_ROLES.includes(authStore.user.role))
)

// `oculto` (moderado) y `eliminado` (borrado) se muestran distinto — ver
// docs/features/article-comments.md, decisión 8 (extendida a `oculto`): un
// comentario puede sobrevivir como hueco vacío solo para no arrastrar las
// respuestas visibles de otros usuarios.
const hiddenLabel = computed(() =>
  comment.value.status === 'oculto' ? 'Comentario oculto' : 'Comentario eliminado'
)
const hiddenText = computed(() =>
  comment.value.status === 'oculto'
    ? 'Este comentario fue ocultado por moderación.'
    : 'Este comentario fue eliminado.'
)

function formatRelative(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(diffMs / 60_000)
  if (minutes < 1) return 'justo ahora'
  if (minutes < 60) return `hace ${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `hace ${hours} h`
  const days = Math.floor(hours / 24)
  if (days < 30) return `hace ${days} d`
  return new Date(iso).toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}
const relativeDate = computed(() => formatRelative(comment.value.createdAt))

// ── Like ──
const likeBusy = ref(false)
async function onToggleLike() {
  if (!authStore.isAuthenticated || likeBusy.value || canEdit.value) return
  likeBusy.value = true
  const wasLiked = comment.value.likedByMe
  try {
    const res = wasLiked
      ? await unlikeComment(comment.value.id)
      : await likeComment(comment.value.id)
    comment.value.likedByMe = !wasLiked
    comment.value.likeCount = res.likeCount
  } catch {
    // sin cambio visual si falla
  } finally {
    likeBusy.value = false
  }
}

// ── Responder ──
const replying = ref(false)
function startReply() {
  if (!authStore.isAuthenticated) return
  replying.value = true
}
function onReplyPosted(newComment: Comment) {
  replying.value = false
  emit('reply-posted', newComment)
}

// ── Editar ──
const editing = ref(false)
const editBody = ref('')
const editBusy = ref(false)
const editError = ref('')
function startEdit() {
  editBody.value = comment.value.body
  editError.value = ''
  editing.value = true
}
function cancelEdit() {
  editing.value = false
}
async function saveEdit() {
  if (!editBody.value.trim() || editBusy.value) return
  editBusy.value = true
  editError.value = ''
  try {
    const updated = await updateComment(comment.value.id, editBody.value.trim())
    comment.value.body = updated.body
    comment.value.editedAt = updated.editedAt
    editing.value = false
  } catch (err) {
    editError.value = err instanceof ApiError ? err.message : 'No pudimos guardar el cambio.'
  } finally {
    editBusy.value = false
  }
}

// ── Reportar ── (con confirmación previa, ver docs/features/article-comments.md)
const reportBusy = ref(false)
const reportSent = ref(false)
const confirmingReport = ref(false)
async function onReport() {
  if (reportBusy.value || reportSent.value) return
  reportBusy.value = true
  try {
    await reportComment(comment.value.id)
    reportSent.value = true
    confirmingReport.value = false
  } catch {
    // sin feedback especial si falla — el botón sigue disponible para reintentar
  } finally {
    reportBusy.value = false
  }
}
</script>

<style scoped>
.ci {
  display: flex;
  gap: 12px;
}

.ci--reply {
  margin-left: 44px;
  margin-top: 16px;
}

.ci__avatar {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  border-radius: var(--radius-full);
  overflow: hidden;
  background: var(--color-primary-tint);
  display: flex;
  align-items: center;
  justify-content: center;
}

.ci--reply .ci__avatar {
  width: 30px;
  height: 30px;
}

.ci__avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.ci__initials {
  font-family: var(--font-display);
  font-weight: 600;
  font-size: 0.8rem;
  color: var(--color-primary-dark);
}

.ci__body {
  flex: 1;
  min-width: 0;
}

.ci__head {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 4px;
}

.ci__name {
  font-family: var(--font-display);
  font-variation-settings:
    'SOFT' 60,
    'WONK' 1;
  font-weight: 600;
  font-size: 0.92rem;
  color: var(--color-ink);
}

.ci__replyto {
  font-size: 0.76rem;
  color: var(--color-primary-dark);
  font-weight: 600;
}

.ci__date,
.ci__edited {
  font-size: 0.76rem;
  color: var(--color-ink-faint);
}

.ci__text,
.ci__deleted {
  font-size: 0.92rem;
  line-height: 1.6;
  color: var(--color-ink-secondary);
  white-space: pre-line;
  overflow-wrap: anywhere;
}

.ci__deleted {
  font-style: italic;
  color: var(--color-ink-faint);
}

.ci__edit-textarea {
  width: 100%;
  resize: vertical;
  background: var(--color-canvas);
  border: 1.5px solid var(--color-line);
  border-radius: var(--radius-md);
  padding: 10px 12px;
  font-family: var(--font-sans);
  font-size: 0.9rem;
  line-height: 1.55;
  margin-bottom: 8px;
}

.ci__edit-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.ci__action-btn {
  font-size: 0.82rem;
  padding: 0.5rem 1rem;
}

.ci__error {
  font-size: 0.8rem;
  color: var(--color-accent-dark);
  margin-bottom: 8px;
}

.ci__actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 14px;
  margin-top: 8px;
}

.ci__action {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--color-ink-faint);
  transition: color 0.2s ease;
}

.ci__action:hover:not(:disabled) {
  color: var(--color-ink);
}

.ci__action.is-active {
  color: var(--color-accent-dark);
}

.ci__action:disabled {
  opacity: 0.6;
  pointer-events: none;
}

.ci__reply-form {
  margin-top: 12px;
}
</style>
