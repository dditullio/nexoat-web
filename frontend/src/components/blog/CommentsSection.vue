<template>
  <section id="comentarios" class="cs">
    <h2 class="eyebrow cs__eyebrow">Comentarios{{ total ? ` (${total})` : '' }}</h2>

    <div v-if="isLoading" class="cs__loading">Cargando comentarios…</div>

    <template v-else>
      <div v-if="commentsEnabled" class="cs__form">
        <CommentForm :slug="slug" @posted="onPosted" />
      </div>
      <p v-else class="cs__closed">Los comentarios de este artículo están cerrados.</p>

      <div v-if="threads.length" class="cs__list">
        <div v-for="thread in threads" :key="thread.id" class="cs__thread">
          <CommentItem
            :comment="thread"
            :slug="slug"
            @delete="onDeleteRequest(thread, null)"
            @reply-posted="(c) => onReplyPosted(thread, c)"
          />

          <div v-if="thread.replies.length" class="cs__replies">
            <CommentItem
              v-for="reply in thread.replies"
              :key="reply.id"
              :comment="reply"
              :slug="slug"
              is-reply
              :reply-to-name="replyToNameFor(thread, reply)"
              @delete="onDeleteRequest(reply, thread)"
              @reply-posted="(c) => onReplyPosted(thread, c)"
            />
          </div>

          <button
            v-if="thread.replies.length < thread.replyCount"
            type="button"
            class="cs__more-replies"
            :disabled="loadingRepliesFor === thread.id"
            @click="loadMoreReplies(thread)"
          >
            {{
              loadingRepliesFor === thread.id
                ? 'Cargando…'
                : `Ver ${thread.replyCount - thread.replies.length} respuestas más`
            }}
          </button>
        </div>
      </div>

      <p v-else class="cs__empty">Todavía no hay comentarios. Escribí el primero.</p>

      <button
        v-if="threads.length && page * PAGE_SIZE < total"
        type="button"
        class="btn btn--ghost cs__load-more"
        :disabled="isLoadingMore"
        @click="loadMorePage"
      >
        {{ isLoadingMore ? 'Cargando…' : 'Cargar más comentarios' }}
      </button>
    </template>

    <ConfirmDialog
      :open="!!pendingDelete"
      title="Borrar comentario"
      confirm-label="Borrar"
      busy-label="Borrando…"
      tone="danger"
      :busy="deleteBusy"
      :error="deleteError"
      @confirm="confirmDelete"
      @cancel="pendingDelete = null"
    >
      <p>Esta acción no se puede deshacer.</p>
    </ConfirmDialog>
  </section>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { getComments, getMoreReplies, deleteComment } from '@/services/comments.api'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import CommentForm from './CommentForm.vue'
import CommentItem from './CommentItem.vue'
import type { Comment, CommentThread } from '@/types/comments'

const props = defineProps<{ slug: string }>()

const PAGE_SIZE = 10

const isLoading = ref(true)
const isLoadingMore = ref(false)
const threads = ref<CommentThread[]>([])
const total = ref(0)
const page = ref(1)
const commentsEnabled = ref(true)
const loadingRepliesFor = ref<string | null>(null)

async function load() {
  isLoading.value = true
  try {
    const res = await getComments(props.slug, 1, PAGE_SIZE)
    threads.value = res.items
    total.value = res.total
    page.value = res.page
    commentsEnabled.value = res.commentsEnabled
  } finally {
    isLoading.value = false
  }
}

onMounted(load)

async function loadMorePage() {
  if (isLoadingMore.value) return
  isLoadingMore.value = true
  try {
    const res = await getComments(props.slug, page.value + 1, PAGE_SIZE)
    threads.value = [...threads.value, ...res.items]
    page.value = res.page
  } finally {
    isLoadingMore.value = false
  }
}

async function loadMoreReplies(thread: CommentThread) {
  loadingRepliesFor.value = thread.id
  try {
    const more = await getMoreReplies(thread.id, thread.replies.length)
    thread.replies.push(...more)
  } finally {
    loadingRepliesFor.value = null
  }
}

function onPosted(comment: Comment) {
  threads.value.unshift({ ...comment, replies: [], replyCount: 0 })
  total.value += 1
}

function onReplyPosted(thread: CommentThread, comment: Comment) {
  thread.replies.push(comment)
  thread.replyCount += 1
}

/**
 * "En respuesta a X" solo se muestra cuando la respuesta apunta a otra
 * respuesta (no a la raíz del hilo) — ver docs/features/article-comments.md,
 * decisión 2. Solo busca entre las respuestas ya cargadas de ese hilo (las
 * más allá de "ver más respuestas" no se resuelven con nombre, caso borde
 * aceptado).
 */
function replyToNameFor(thread: CommentThread, reply: Comment): string | undefined {
  if (!reply.parentId || reply.parentId === thread.id) return undefined
  const parent = thread.replies.find((r) => r.id === reply.parentId)
  return parent?.author?.name
}

// ── Borrado ──
const pendingDelete = ref<{ comment: Comment; thread: CommentThread | null } | null>(null)
const deleteBusy = ref(false)
const deleteError = ref('')

function onDeleteRequest(comment: Comment, thread: CommentThread | null) {
  deleteError.value = ''
  pendingDelete.value = { comment, thread }
}

/** ¿Alguna otra respuesta visible cuelga de esta respuesta? Si sí, no se saca de la lista al borrar — queda el hueco "Comentario eliminado" (decisión 8). */
function hasVisibleReplyChildren(comment: Comment, thread: CommentThread): boolean {
  return thread.replies.some((r) => r.parentId === comment.id)
}

async function confirmDelete() {
  if (!pendingDelete.value || deleteBusy.value) return
  const { comment, thread } = pendingDelete.value
  deleteBusy.value = true
  deleteError.value = ''
  try {
    await deleteComment(comment.id)
    if (thread) {
      // Es una respuesta (onDeleteRequest pasa `thread` solo para respuestas, ver template).
      if (hasVisibleReplyChildren(comment, thread)) {
        const target = thread.replies.find((r) => r.id === comment.id)
        if (target) markDeleted(target)
      } else {
        thread.replies = thread.replies.filter((r) => r.id !== comment.id)
        thread.replyCount = Math.max(0, thread.replyCount - 1)
      }
    } else {
      // Es una raíz (thread es null, ver onDeleteRequest para roots).
      const root = threads.value.find((t) => t.id === comment.id)
      if (root && hasRootChildren(root)) {
        markDeleted(root)
      } else {
        threads.value = threads.value.filter((t) => t.id !== comment.id)
        total.value = Math.max(0, total.value - 1)
      }
    }
    pendingDelete.value = null
  } catch {
    deleteError.value = 'No pudimos borrar el comentario. Probá de nuevo.'
  } finally {
    deleteBusy.value = false
  }
}

function hasRootChildren(root: CommentThread): boolean {
  return root.replyCount > 0
}

function markDeleted(comment: Comment): void {
  comment.isDeleted = true
  comment.isHidden = true
  comment.status = 'eliminado'
  comment.body = ''
  comment.author = null
}
</script>

<style scoped>
.cs {
  margin-top: 64px;
  padding-top: 40px;
  border-top: 1px solid var(--color-line-light);
  max-width: var(--container-prose);
}

.cs__eyebrow {
  margin-bottom: 20px;
}

.cs__loading,
.cs__closed,
.cs__empty {
  font-size: 0.92rem;
  color: var(--color-ink-muted);
  font-style: italic;
}

.cs__closed,
.cs__empty {
  background: var(--color-surface-sunken);
  border-radius: var(--radius-lg);
  padding: 24px 22px;
  text-align: center;
}

.cs__form {
  background: var(--color-surface);
  border: 1px solid var(--color-line-light);
  border-radius: var(--radius-xl);
  padding: 20px;
  margin-bottom: 32px;
}

.cs__list {
  display: flex;
  flex-direction: column;
  gap: 28px;
}

.cs__thread {
  padding-bottom: 4px;
}

.cs__replies {
  display: flex;
  flex-direction: column;
}

.cs__more-replies {
  margin-left: 44px;
  margin-top: 12px;
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--color-primary-dark);
}

.cs__more-replies:disabled {
  opacity: 0.6;
}

.cs__load-more {
  display: block;
  margin: 32px auto 0;
  font-size: 0.86rem;
}
</style>
