<template>
  <div class="gifts">
    <p class="gifts__lead">
      Títulos que se ofrecen como regalo de bienvenida al terminar el onboarding. Un título solo
      aparece para elegir cuando está <strong>activo</strong> y tiene contenido: o un
      <strong>PDF subido</strong>, o <strong>Markdown</strong> — con Markdown, cada persona recibe
      un PDF generado al momento con una dedicatoria a su nombre. Si cargás los dos, el Markdown
      manda.
    </p>

    <section class="gifts__new">
      <h2 class="gifts__new-title">Nuevo título</h2>
      <form class="gifts__form" @submit.prevent="onCreate">
        <label class="gifts__field">
          <span class="gifts__label">Título</span>
          <input v-model="draft.title" type="text" maxlength="160" required class="gifts__input" />
        </label>
        <label class="gifts__field">
          <span class="gifts__label">Subtítulo (opcional)</span>
          <input v-model="draft.subtitle" type="text" maxlength="200" class="gifts__input" />
        </label>
        <label class="gifts__field">
          <span class="gifts__label">Temática</span>
          <input
            v-model="draft.topic"
            type="text"
            maxlength="80"
            required
            placeholder="Ej.: Primeros pasos en AT"
            class="gifts__input"
          />
        </label>
        <label class="gifts__field gifts__field--full">
          <span class="gifts__label">Resumen breve</span>
          <textarea
            v-model="draft.summary"
            rows="3"
            maxlength="600"
            required
            placeholder="Lo que el usuario lee para decidir antes de elegir este título…"
            class="gifts__input"
          />
        </label>
        <div class="gifts__form-actions">
          <p v-if="createError" class="gifts__error" role="alert">{{ createError }}</p>
          <button type="submit" class="btn btn--primary" :disabled="isCreating">
            {{ isCreating ? 'Creando…' : 'Crear título' }}
          </button>
        </div>
      </form>
    </section>

    <p v-if="isLoading" class="section-lead">Cargando…</p>

    <div v-else class="gifts__grid">
      <article v-for="ebook in ebooks" :key="ebook.id" class="gift-item">
        <div class="gift-item__cover">
          <img
            v-if="ebook.coverImage"
            :src="ebook.coverImage"
            :alt="ebook.title"
            class="gift-item__img"
          />
          <label v-else class="gift-item__upload" :class="{ 'is-disabled': isBusy(ebook.id) }">
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              class="gift-item__hidden-input"
              :disabled="isBusy(ebook.id)"
              @change="onSelectCover($event, ebook)"
            />
            Elegir tapa…
          </label>
          <button
            v-if="ebook.coverImage"
            type="button"
            class="gift-item__remove-cover"
            :disabled="isBusy(ebook.id)"
            @click="onRemoveCover(ebook)"
          >
            Quitar tapa
          </button>

          <span class="pill gift-item__badge" :class="statusClass(ebook)">
            {{ statusLabel(ebook) }}
          </span>
        </div>

        <div class="gift-item__body">
          <label class="gifts__field">
            <span class="gifts__label">Título</span>
            <input
              v-model="edits[ebook.id].title"
              type="text"
              maxlength="160"
              class="gifts__input"
            />
          </label>
          <label class="gifts__field">
            <span class="gifts__label">Subtítulo</span>
            <input
              v-model="edits[ebook.id].subtitle"
              type="text"
              maxlength="200"
              class="gifts__input"
            />
          </label>
          <label class="gifts__field">
            <span class="gifts__label">Temática</span>
            <input
              v-model="edits[ebook.id].topic"
              type="text"
              maxlength="80"
              class="gifts__input"
            />
          </label>
          <label class="gifts__field">
            <span class="gifts__label">Resumen breve</span>
            <textarea
              v-model="edits[ebook.id].summary"
              rows="3"
              maxlength="600"
              class="gifts__input"
            />
          </label>

          <label class="gift-item__active">
            <input v-model="edits[ebook.id].active" type="checkbox" />
            Activo
          </label>

          <div class="gift-item__content">
            <div class="gifts__field-row">
              <span class="gifts__label">Contenido (Markdown) — opcional, manda sobre el PDF</span>
              <button
                type="button"
                class="gift-item__preview-toggle"
                @click="togglePreview(ebook.id)"
              >
                {{ showPreview[ebook.id] ? 'Ver editor' : 'Ver preview' }}
              </button>
            </div>
            <textarea
              v-if="!showPreview[ebook.id]"
              v-model="edits[ebook.id].content"
              rows="8"
              class="gifts__input gifts__input--code"
              placeholder="# Título del capítulo…"
            />
            <div v-else class="prose gift-item__preview" v-html="previewHtml(ebook.id)"></div>
          </div>

          <label class="gifts__field">
            <span class="gifts__label">Link a la ficha de compra (activa el QR final del PDF)</span>
            <input
              v-model="edits[ebook.id].storeUrl"
              type="text"
              maxlength="500"
              placeholder="https://nexoat.com/tienda/…"
              class="gifts__input"
            />
          </label>

          <div class="gift-item__file">
            <span v-if="ebook.fileName" class="gift-item__filename">📄 {{ ebook.fileName }}</span>
            <span v-else class="gift-item__filename gift-item__filename--empty"
              >Sin PDF subido</span
            >

            <div class="gift-item__file-actions">
              <label class="gift-item__file-btn" :class="{ 'is-disabled': isBusy(ebook.id) }">
                <input
                  type="file"
                  accept="application/pdf"
                  class="gift-item__hidden-input"
                  :disabled="isBusy(ebook.id)"
                  @change="onSelectFile($event, ebook)"
                />
                {{ ebook.fileName ? 'Reemplazar PDF…' : 'Subir PDF…' }}
              </label>
              <button
                v-if="ebook.fileName"
                type="button"
                class="gift-item__file-btn gift-item__file-btn--danger"
                :disabled="isBusy(ebook.id)"
                @click="onRemoveFile(ebook)"
              >
                Quitar
              </button>
            </div>
          </div>

          <p v-if="errors[ebook.id]" class="gifts__error" role="alert">{{ errors[ebook.id] }}</p>

          <button
            type="button"
            class="btn btn--ghost gift-item__save"
            :disabled="isBusy(ebook.id) || !isDirty(ebook)"
            @click="onSaveEdits(ebook)"
          >
            {{ isBusy(ebook.id) ? 'Guardando…' : 'Guardar cambios' }}
          </button>
        </div>
      </article>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import {
  createGift,
  listAdminGifts,
  removeGiftFile,
  updateGift,
  uploadGiftFile,
} from '@/services/admin/gifts.api'
import { deleteMedia, uploadMedia } from '@/services/admin/media.api'
import { ApiError } from '@/services/http'
import { renderMarkdown } from '@/utils/markdown'
import type { AdminWelcomeEbook } from '@/types/gifts'

interface EditableFields {
  title: string
  subtitle: string
  topic: string
  summary: string
  active: boolean
  content: string
  storeUrl: string
}

const ebooks = ref<AdminWelcomeEbook[]>([])
const isLoading = ref(false)
const pendingId = ref<string | null>(null)
const errors = reactive<Record<string, string>>({})
// Copia editable por ebook — se resetea cada vez que se recarga la lista,
// así "Guardar cambios" siempre compara contra lo último guardado (mismo
// criterio de :disabled que AdminSettingsView.vue con isDirty).
const edits = reactive<Record<string, EditableFields>>({})
// Toggle editor/preview del Markdown, por ebook — mismo patrón que
// AdminArticleFormView.vue.
const showPreview = reactive<Record<string, boolean>>({})

const draft = reactive({ title: '', subtitle: '', topic: '', summary: '' })
const isCreating = ref(false)
const createError = ref('')

function toEditable(ebook: AdminWelcomeEbook): EditableFields {
  return {
    title: ebook.title,
    subtitle: ebook.subtitle ?? '',
    topic: ebook.topic,
    summary: ebook.summary,
    active: ebook.active,
    content: ebook.content ?? '',
    storeUrl: ebook.storeUrl ?? '',
  }
}

function isDirty(ebook: AdminWelcomeEbook): boolean {
  const edit = edits[ebook.id]
  if (!edit) return false
  return (
    edit.title !== ebook.title ||
    edit.subtitle !== (ebook.subtitle ?? '') ||
    edit.topic !== ebook.topic ||
    edit.summary !== ebook.summary ||
    edit.active !== ebook.active ||
    edit.content !== (ebook.content ?? '') ||
    edit.storeUrl !== (ebook.storeUrl ?? '')
  )
}

function isBusy(id: string): boolean {
  return pendingId.value === id
}

function togglePreview(id: string) {
  showPreview[id] = !showPreview[id]
}

function previewHtml(id: string): string {
  return renderMarkdown(edits[id]?.content ?? '')
}

// "Disponible" = tiene contenido (Markdown, se genera al reclamar) o un PDF
// subido a mano — mismo criterio que GiftsService.available() en el backend.
function statusLabel(ebook: AdminWelcomeEbook): string {
  if (!ebook.active) return 'Inactivo'
  return ebook.content || ebook.fileKey ? 'Disponible' : 'Sin contenido'
}

function statusClass(ebook: AdminWelcomeEbook): string {
  if (!ebook.active) return 'gift-item__badge--off'
  return ebook.content || ebook.fileKey ? 'gift-item__badge--ok' : 'gift-item__badge--pending'
}

async function loadGifts() {
  isLoading.value = true
  try {
    ebooks.value = await listAdminGifts()
    for (const ebook of ebooks.value) {
      edits[ebook.id] = toEditable(ebook)
    }
  } finally {
    isLoading.value = false
  }
}

async function onCreate() {
  createError.value = ''
  isCreating.value = true
  try {
    const created = await createGift({
      title: draft.title,
      subtitle: draft.subtitle || undefined,
      topic: draft.topic,
      summary: draft.summary,
    })
    ebooks.value.push(created)
    edits[created.id] = toEditable(created)
    draft.title = ''
    draft.subtitle = ''
    draft.topic = ''
    draft.summary = ''
  } catch (err) {
    createError.value = err instanceof ApiError ? err.message : 'No pudimos crear el título.'
  } finally {
    isCreating.value = false
  }
}

async function onSaveEdits(ebook: AdminWelcomeEbook) {
  delete errors[ebook.id]
  pendingId.value = ebook.id
  const edit = edits[ebook.id]
  try {
    const updated = await updateGift(ebook.id, {
      title: edit.title,
      subtitle: edit.subtitle || undefined,
      topic: edit.topic,
      summary: edit.summary,
      active: edit.active,
      content: edit.content || '',
      storeUrl: edit.storeUrl || '',
    })
    replaceEbook(updated)
  } catch (err) {
    errors[ebook.id] = err instanceof ApiError ? err.message : 'No pudimos guardar los cambios.'
  } finally {
    pendingId.value = null
  }
}

async function onSelectCover(event: Event, ebook: AdminWelcomeEbook) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return

  delete errors[ebook.id]
  pendingId.value = ebook.id
  try {
    const uploaded = await uploadMedia(file, 'ebook-covers')
    const updated = await updateGift(ebook.id, {
      coverImage: uploaded.url,
      coverImagePublicId: uploaded.publicId,
    })
    replaceEbook(updated)
  } catch (err) {
    errors[ebook.id] = err instanceof ApiError ? err.message : 'No pudimos subir la tapa.'
  } finally {
    pendingId.value = null
  }
}

async function onRemoveCover(ebook: AdminWelcomeEbook) {
  delete errors[ebook.id]
  pendingId.value = ebook.id
  const publicId = ebook.coverImagePublicId
  try {
    const updated = await updateGift(ebook.id, { coverImage: '', coverImagePublicId: '' })
    replaceEbook(updated)
    if (publicId) await deleteMedia(publicId).catch(() => undefined)
  } catch {
    errors[ebook.id] = 'No pudimos quitar la tapa.'
  } finally {
    pendingId.value = null
  }
}

async function onSelectFile(event: Event, ebook: AdminWelcomeEbook) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return

  delete errors[ebook.id]
  pendingId.value = ebook.id
  try {
    const updated = await uploadGiftFile(ebook.id, file)
    replaceEbook(updated)
  } catch (err) {
    errors[ebook.id] = err instanceof ApiError ? err.message : 'No pudimos subir el PDF.'
  } finally {
    pendingId.value = null
  }
}

async function onRemoveFile(ebook: AdminWelcomeEbook) {
  delete errors[ebook.id]
  pendingId.value = ebook.id
  try {
    const updated = await removeGiftFile(ebook.id)
    replaceEbook(updated)
  } catch {
    errors[ebook.id] = 'No pudimos quitar el PDF.'
  } finally {
    pendingId.value = null
  }
}

function replaceEbook(updated: AdminWelcomeEbook) {
  const idx = ebooks.value.findIndex((e) => e.id === updated.id)
  if (idx !== -1) ebooks.value[idx] = updated
  edits[updated.id] = toEditable(updated)
}

onMounted(loadGifts)
</script>

<style scoped>
.gifts__lead {
  color: var(--color-ink-secondary);
  max-width: 72ch;
  line-height: 1.6;
  margin-bottom: 28px;
}

.gifts__new {
  background: var(--color-surface);
  border: 1px solid var(--color-line-light);
  border-radius: var(--radius-xl);
  padding: 20px 22px;
  margin-bottom: 28px;
}

.gifts__new-title {
  font-size: 1rem;
  margin: 0 0 14px;
}

.gifts__form {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}

.gifts__field--full {
  grid-column: 1 / -1;
}

.gifts__form-actions {
  grid-column: 1 / -1;
  display: flex;
  align-items: center;
  gap: 14px;
}

.gifts__field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.gifts__label {
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--color-ink-muted);
}

.gifts__input {
  background: var(--color-canvas);
  border: 1.5px solid var(--color-line);
  border-radius: var(--radius-md);
  padding: 9px 12px;
  font-size: 0.9rem;
  font-family: inherit;
  transition: border-color 0.2s ease;
}

.gifts__input:focus-visible {
  border-color: var(--color-primary);
}

.gifts__error {
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--color-accent-dark);
}

.gifts__input--code {
  font-family: ui-monospace, 'SFMono-Regular', Menlo, monospace;
  font-size: 0.82rem;
  resize: vertical;
  line-height: 1.6;
}

.gifts__field-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.gifts__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 18px;
}

.gift-item {
  background: var(--color-surface);
  border: 1px solid var(--color-line-light);
  border-radius: var(--radius-xl);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.gift-item__cover {
  position: relative;
}

.gift-item__img {
  width: 100%;
  aspect-ratio: 3 / 4;
  object-fit: cover;
  display: block;
}

.gift-item__upload {
  aspect-ratio: 3 / 4;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-canvas-alt);
  border-bottom: 1.5px dashed var(--color-line);
  font-size: 0.86rem;
  font-weight: 600;
  color: var(--color-ink-muted);
  cursor: pointer;
}

.gift-item__upload.is-disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.gift-item__hidden-input {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  opacity: 0;
}

.gift-item__remove-cover {
  position: absolute;
  bottom: 10px;
  right: 10px;
  background: rgba(20, 16, 12, 0.65);
  color: #f7f2e9;
  font-size: 0.74rem;
  font-weight: 700;
  padding: 5px 11px;
  border-radius: var(--radius-full);
}

.gift-item__badge {
  position: absolute;
  top: 10px;
  left: 10px;
}

.gift-item__badge--ok {
  background: var(--color-primary-soft);
  color: var(--color-primary-dark);
}

.gift-item__badge--pending {
  background: var(--color-ochre-soft);
  color: var(--color-ochre);
}

.gift-item__badge--off {
  background: var(--color-canvas-sunken, var(--color-canvas-alt));
  color: var(--color-ink-faint);
}

.gift-item__body {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.gift-item__active {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.86rem;
  font-weight: 600;
  color: var(--color-ink-secondary);
  cursor: pointer;
}

.gift-item__active input {
  accent-color: var(--color-primary);
}

.gift-item__content {
  display: flex;
  flex-direction: column;
  gap: 6px;
  border-top: 1px solid var(--color-line-faint);
  padding-top: 12px;
}

.gift-item__preview-toggle {
  font-size: 0.76rem;
  font-weight: 700;
  color: var(--color-primary-dark);
  flex-shrink: 0;
}

.gift-item__preview {
  background: var(--color-canvas);
  border: 1.5px solid var(--color-line);
  border-radius: var(--radius-md);
  padding: 14px;
  max-height: 220px;
  overflow-y: auto;
  max-width: none;
  font-size: 0.86rem;
}

.gift-item__file {
  border-top: 1px solid var(--color-line-faint);
  padding-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.gift-item__filename {
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--color-ink-secondary);
  overflow-wrap: anywhere;
}

.gift-item__filename--empty {
  color: var(--color-ink-faint);
  font-style: italic;
  font-weight: 500;
}

.gift-item__file-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.gift-item__file-btn {
  position: relative;
  font-size: 0.78rem;
  font-weight: 700;
  padding: 6px 12px;
  border-radius: var(--radius-full);
  border: 1px solid var(--color-line);
  color: var(--color-ink-secondary);
  cursor: pointer;
  transition:
    border-color 0.16s ease,
    color 0.16s ease;
}

.gift-item__file-btn:hover {
  border-color: var(--color-primary);
  color: var(--color-primary-dark);
}

.gift-item__file-btn.is-disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.gift-item__file-btn--danger:hover {
  border-color: var(--color-accent);
  color: var(--color-accent-dark);
}

.gift-item__save {
  align-self: flex-start;
}
</style>
