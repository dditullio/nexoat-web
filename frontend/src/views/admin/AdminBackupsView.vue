<template>
  <div class="bk">
    <p class="bk__lead">
      Cada respaldo es un <code>.zip</code> con el contenido de la base (artículos, categorías,
      usuarios, auditoría y suscripciones) en formato JSONL, más un archivo de metadata con la fecha
      y el comentario. Sirve tanto para tener una copia de seguridad como para mover datos entre
      desarrollo y producción. Las imágenes no se copian: viven en Cloudinary y se comparten entre
      entornos.
    </p>

    <div class="bk__actions">
      <button type="button" class="btn btn--primary" @click="openCreateDialog">
        Crear respaldo
      </button>

      <label
        class="bk__upload"
        :class="{ 'is-dragging': isDraggingUpload }"
        @dragover.prevent="isDraggingUpload = true"
        @dragleave.prevent="isDraggingUpload = false"
        @drop.prevent="onDropUpload"
      >
        <input
          ref="uploadInput"
          type="file"
          accept=".zip"
          class="bk__upload-input"
          @change="onPickUpload"
        />
        Restaurar desde un archivo — soltá acá un <code>.zip</code> o hacé clic para elegirlo
      </label>
    </div>

    <p v-if="errorMessage" class="bk__banner bk__banner--error" role="alert">{{ errorMessage }}</p>
    <p v-if="successMessage" class="bk__banner bk__banner--ok" role="status">
      {{ successMessage }}
    </p>
    <p v-if="sessionLost" class="bk__banner bk__banner--warn" role="alert">
      La restauración cerró tu sesión porque tu usuario no existe en ese respaldo.
      <RouterLink to="/nexoat-admin/login">Volvé a ingresar</RouterLink> para seguir.
    </p>

    <div class="bk__table-wrap">
      <table class="bk__table">
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Comentario</th>
            <th>Contenido</th>
            <th>Origen</th>
            <th>Tamaño</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="isLoading">
            <td colspan="6" class="bk__empty">Cargando…</td>
          </tr>
          <tr v-else-if="!backups.length">
            <td colspan="6" class="bk__empty">Todavía no hay respaldos.</td>
          </tr>
          <tr v-for="backup in backups" v-else :key="backup.filename">
            <td>
              <span class="bk__date">{{ formatDate(backup.metadata.createdAt) }}</span>
              <span v-if="backup.metadata.kind === 'pre-restore'" class="pill bk__pill-auto">
                automático
              </span>
              <span class="bk__file">{{ backup.filename }}</span>
            </td>
            <td class="bk__comment">{{ backup.metadata.comment || '—' }}</td>
            <td class="bk__counts">{{ summarizeCounts(backup.metadata.counts) }}</td>
            <td class="bk__source">
              {{ backup.metadata.source.environment }}
              <span v-if="backup.metadata.source.database">
                · {{ backup.metadata.source.database }}
              </span>
            </td>
            <td class="bk__size">{{ formatSize(backup.sizeBytes) }}</td>
            <td class="bk__row-actions">
              <button
                type="button"
                class="bk__action"
                :disabled="pendingFile === backup.filename"
                @click="onDownload(backup)"
              >
                Descargar
              </button>
              <button
                type="button"
                class="bk__action bk__action--danger"
                @click="openRestoreDialog(backup)"
              >
                Restaurar
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Crear -->
    <ConfirmDialog
      :open="createDialog"
      title="Crear un respaldo"
      confirm-label="Crear respaldo"
      busy-label="Generando…"
      :busy="isWorking"
      :error="dialogError"
      @cancel="closeDialogs"
      @confirm="onCreate"
    >
      <p>
        Se va a generar un <code>.zip</code> con el estado actual de la base y quedará guardado en
        el servidor, listo para descargar.
      </p>
      <label class="bk__field">
        <span>Comentario (opcional)</span>
        <textarea
          v-model="comment"
          rows="2"
          maxlength="500"
          placeholder="Ej.: antes de importar los artículos de agosto"
          autofocus
        />
      </label>
    </ConfirmDialog>

    <!-- Restaurar -->
    <ConfirmDialog
      :open="restoreDialog"
      title="Restaurar la base"
      confirm-label="Sí, restaurar"
      busy-label="Restaurando…"
      tone="danger"
      :busy="isWorking"
      :error="dialogError"
      @cancel="closeDialogs"
      @confirm="onRestore"
    >
      <p>
        Vas a reemplazar <strong>todo el contenido actual</strong> por el de
        <strong>{{ restoreLabel }}</strong
        >. Los artículos, categorías, usuarios y suscriptores que existan hoy y no estén en ese
        respaldo se pierden.
      </p>
      <p>
        Antes de tocar nada se guarda automáticamente una copia del estado actual, así que se puede
        volver atrás desde esta misma lista.
      </p>
      <p>
        La restauración cierra todas las sesiones abiertas: si tu usuario no está en el respaldo,
        vas a tener que volver a ingresar.
      </p>
    </ConfirmDialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import ConfirmDialog from '@/components/admin/ConfirmDialog.vue'
import {
  createBackup,
  downloadBackup,
  listBackups,
  restoreBackup,
  restoreBackupFromFile,
} from '@/services/admin/backups.api'
import { ApiError } from '@/services/http'
import type { BackupSummary, RestoreResult } from '@/types/admin'

/** Etiquetas para el resumen de contenido; el orden manda en la fila. */
const COUNT_LABELS: [key: string, singular: string, plural: string][] = [
  ['articles', 'artículo', 'artículos'],
  ['categories', 'categoría', 'categorías'],
  ['users', 'usuario', 'usuarios'],
  ['newsletter_subscribers', 'suscriptor', 'suscriptores'],
  ['audit_logs', 'registro de auditoría', 'registros de auditoría'],
]

const backups = ref<BackupSummary[]>([])
const isLoading = ref(true)
const isWorking = ref(false)
const errorMessage = ref('')
const successMessage = ref('')
const dialogError = ref('')
const sessionLost = ref(false)
const pendingFile = ref<string | null>(null)

const createDialog = ref(false)
const comment = ref('')

const restoreDialog = ref(false)
/** Respaldo de la lista a restaurar, o archivo subido — nunca los dos a la vez. */
const restoreTarget = ref<BackupSummary | null>(null)
const restoreUploadFile = ref<File | null>(null)
const restoreLabel = computed(
  () => restoreUploadFile.value?.name ?? restoreTarget.value?.filename ?? ''
)

const isDraggingUpload = ref(false)
const uploadInput = ref<HTMLInputElement | null>(null)

async function loadBackups() {
  isLoading.value = true
  try {
    backups.value = await listBackups()
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) sessionLost.value = true
    else errorMessage.value = 'No pudimos cargar la lista de respaldos.'
  } finally {
    isLoading.value = false
  }
}

function resetBanners() {
  errorMessage.value = ''
  successMessage.value = ''
  dialogError.value = ''
}

function closeDialogs() {
  createDialog.value = false
  restoreDialog.value = false
  restoreTarget.value = null
  restoreUploadFile.value = null
  dialogError.value = ''
}

// ── Crear ──
function openCreateDialog() {
  resetBanners()
  comment.value = ''
  createDialog.value = true
}

async function onCreate() {
  isWorking.value = true
  dialogError.value = ''
  try {
    const created = await createBackup(comment.value)
    closeDialogs()
    successMessage.value = `Respaldo creado: ${created.filename}`
    await loadBackups()
  } catch (err) {
    dialogError.value = err instanceof ApiError ? err.message : 'No pudimos crear el respaldo.'
  } finally {
    isWorking.value = false
  }
}

// ── Descargar ──
async function onDownload(backup: BackupSummary) {
  resetBanners()
  pendingFile.value = backup.filename
  try {
    await downloadBackup(backup.filename)
  } catch {
    errorMessage.value = 'No pudimos descargar el respaldo.'
  } finally {
    pendingFile.value = null
  }
}

// ── Restaurar ──
function openRestoreDialog(backup: BackupSummary) {
  resetBanners()
  restoreUploadFile.value = null
  restoreTarget.value = backup
  restoreDialog.value = true
}

function onDropUpload(event: DragEvent) {
  isDraggingUpload.value = false
  const file = event.dataTransfer?.files?.[0]
  if (file) queueUploadRestore(file)
}

function onPickUpload(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = '' // permite volver a elegir el mismo archivo
  if (file) queueUploadRestore(file)
}

function queueUploadRestore(file: File) {
  resetBanners()
  if (!file.name.toLowerCase().endsWith('.zip')) {
    errorMessage.value = 'El respaldo tiene que ser un archivo .zip.'
    return
  }
  restoreTarget.value = null
  restoreUploadFile.value = file
  restoreDialog.value = true
}

async function onRestore() {
  isWorking.value = true
  dialogError.value = ''
  const file = restoreUploadFile.value
  const target = restoreTarget.value

  try {
    const result: RestoreResult = file
      ? await restoreBackupFromFile(file)
      : await restoreBackup(target!.filename)

    closeDialogs()
    successMessage.value =
      `Restauración completa desde ${result.filename} — ` +
      `${summarizeCounts(result.counts)}. ` +
      `El estado anterior quedó guardado en ${result.safetyBackup}.`
    await loadBackups()
  } catch (err) {
    dialogError.value = err instanceof ApiError ? err.message : 'No pudimos restaurar el respaldo.'
  } finally {
    isWorking.value = false
  }
}

// ── Formato ──
function summarizeCounts(counts: Record<string, number>) {
  const parts = COUNT_LABELS.map(([key, singular, plural]) => {
    const n = counts[key] ?? 0
    return `${n} ${n === 1 ? singular : plural}`
  })
  return parts.join(' · ')
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('es-AR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

onMounted(loadBackups)
</script>

<style scoped>
.bk__lead {
  color: var(--color-ink-secondary);
  max-width: 72ch;
  line-height: 1.7;
  margin-bottom: 22px;
}

.bk__lead code,
.bk__upload code {
  font-size: 0.86em;
  background: var(--color-surface-sunken);
  border-radius: var(--radius-sm);
  padding: 1px 5px;
}

.bk__actions {
  display: flex;
  align-items: stretch;
  gap: 14px;
  flex-wrap: wrap;
  margin-bottom: 20px;
}

.bk__actions .btn {
  align-self: center;
}

.bk__upload {
  flex: 1;
  min-width: 280px;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  gap: 6px;
  padding: 14px 20px;
  background: var(--color-canvas-alt);
  border: 1.5px dashed var(--color-line);
  border-radius: var(--radius-lg);
  font-size: 0.84rem;
  font-weight: 600;
  color: var(--color-ink-muted);
  cursor: pointer;
  transition:
    background 0.2s ease,
    border-color 0.2s ease,
    color 0.2s ease;
}

.bk__upload:hover,
.bk__upload.is-dragging {
  background: var(--color-surface-sunken);
  border-color: var(--color-primary);
  color: var(--color-primary-dark);
}

.bk__upload-input {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  opacity: 0;
}

.bk__banner {
  font-size: 0.85rem;
  font-weight: 600;
  line-height: 1.6;
  border-radius: var(--radius-md);
  padding: 11px 15px;
  margin-bottom: 16px;
}

.bk__banner--error {
  color: var(--color-accent-dark);
  background: var(--color-accent-soft);
}

.bk__banner--ok {
  color: var(--color-primary-dark);
  background: var(--color-primary-soft);
}

.bk__banner--warn {
  color: var(--color-ochre);
  background: var(--color-ochre-soft);
}

.bk__banner--warn a {
  color: inherit;
  text-decoration: underline;
}

.bk__table-wrap {
  background: var(--color-surface);
  border: 1px solid var(--color-line-light);
  border-radius: var(--radius-xl);
  overflow: auto;
}

.bk__table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.86rem;
}

.bk__table th {
  text-align: left;
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--color-ink-faint);
  padding: 14px 18px;
  border-bottom: 1px solid var(--color-line-light);
  white-space: nowrap;
}

.bk__table td {
  padding: 14px 18px;
  border-bottom: 1px solid var(--color-line-faint);
  vertical-align: top;
}

.bk__table tr:last-child td {
  border-bottom: none;
}

.bk__date {
  font-weight: 700;
  white-space: nowrap;
  margin-right: 8px;
}

.bk__pill-auto {
  background: var(--color-ochre-soft);
  color: var(--color-ochre);
}

.bk__file {
  display: block;
  margin-top: 3px;
  font-size: 0.72rem;
  color: var(--color-ink-faint);
}

.bk__comment {
  color: var(--color-ink-secondary);
  min-width: 18ch;
}

.bk__counts,
.bk__source {
  color: var(--color-ink-muted);
  font-size: 0.8rem;
}

.bk__size {
  color: var(--color-ink-muted);
  white-space: nowrap;
}

.bk__empty {
  text-align: center;
  padding: 40px;
  color: var(--color-ink-faint);
  font-style: italic;
}

.bk__row-actions {
  display: flex;
  gap: 14px;
  white-space: nowrap;
}

.bk__action {
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--color-primary-dark);
}

.bk__action--danger {
  color: var(--color-accent-dark);
}

.bk__action:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.bk__field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--color-ink-secondary);
}

.bk__field textarea {
  font-family: var(--font-sans);
  font-size: 0.88rem;
  font-weight: 400;
  color: var(--color-ink);
  background: var(--color-canvas-alt);
  border: 1.5px solid var(--color-line);
  border-radius: var(--radius-md);
  padding: 10px 13px;
  resize: vertical;
}

.bk__field textarea:focus {
  outline: none;
  border-color: var(--color-primary);
}
</style>
