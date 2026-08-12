<template>
  <div class="form-page">
    <div class="form-page__head">
      <RouterLink to="/nexoat-admin/articulos" class="form-page__back">← Artículos</RouterLink>
      <h1 v-if="isEditing" class="form-page__title">Editar artículo</h1>
      <h1 v-else class="form-page__title">Nuevo artículo</h1>
    </div>

    <p v-if="isLoading" class="section-lead">Cargando…</p>

    <form v-else class="form-page__grid" @submit.prevent="onSubmit">
      <div class="form-page__main">
        <div
          v-if="!isEditing"
          class="import-drop"
          :class="{ 'is-dragging': isDraggingImport }"
          @dragover.prevent="isDraggingImport = true"
          @dragleave.prevent="isDraggingImport = false"
          @drop.prevent="onDropImport"
          @click="importFileInput?.click()"
        >
          <p class="import-drop__text">
            Soltá acá el <strong>.md</strong> del artículo para autocompletar el formulario, o hacé
            clic para elegirlo
          </p>
          <input
            ref="importFileInput"
            type="file"
            accept=".md"
            class="import-drop__input"
            @change="onPickImportFile"
            @click.stop
          />
        </div>
        <ul v-if="importWarnings.length" class="import-warnings">
          <li v-for="warning in importWarnings" :key="warning">{{ warning }}</li>
        </ul>

        <label class="field">
          <span class="field__label">Título *</span>
          <input v-model="form.title" type="text" required class="field__input" />
        </label>

        <label class="field">
          <span class="field__label">Slug (opcional — se deriva del título si se deja vacío)</span>
          <input v-model="form.slug" type="text" class="field__input" placeholder="mi-articulo" />
        </label>

        <label class="field">
          <span class="field__label">Subtítulo</span>
          <input v-model="form.subtitle" type="text" class="field__input" />
        </label>

        <label class="field">
          <span class="field__label">Extracto (resumen corto para las tarjetas)</span>
          <textarea v-model="form.excerpt" rows="2" class="field__input field__textarea"></textarea>
        </label>

        <div class="field">
          <div class="field__label-row">
            <span class="field__label">Contenido (Markdown) *</span>
            <button type="button" class="field__preview-toggle" @click="showPreview = !showPreview">
              {{ showPreview ? 'Ver editor' : 'Ver preview' }}
            </button>
          </div>
          <textarea
            v-if="!showPreview"
            v-model="form.content"
            required
            rows="18"
            class="field__input field__textarea field__code"
          ></textarea>
          <div v-else class="prose field__preview" v-html="previewHtml"></div>
        </div>

        <div class="field">
          <div class="field__label-row">
            <span class="field__label">Fuentes</span>
            <button type="button" class="field__preview-toggle" @click="addSource">
              + Agregar fuente
            </button>
          </div>
          <p v-if="!form.sources?.length" class="side__empty-note">
            Sin fuentes cargadas — se completan al importar el .md o se pueden agregar a mano.
          </p>
          <div v-for="(source, idx) in form.sources" :key="idx" class="source-row">
            <input
              v-model="source.title"
              type="text"
              class="field__input"
              placeholder="Título de la fuente"
            />
            <input v-model="source.url" type="url" class="field__input" placeholder="https://…" />
            <textarea
              v-model="source.description"
              rows="2"
              class="field__input field__textarea"
              placeholder="Descripción (opcional)"
            ></textarea>
            <button type="button" class="source-row__remove" @click="removeSource(idx)">
              Quitar
            </button>
          </div>
        </div>
      </div>

      <aside class="form-page__side">
        <div class="side-block">
          <span class="field__label">Status</span>
          <select v-model="form.status" class="field__input">
            <option v-for="opt in STATUS_OPTIONS" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </option>
          </select>
        </div>

        <label class="side-block">
          <span class="field__label">Fecha de publicación</span>
          <input v-model="form.publishedAt" type="date" class="field__input" />
        </label>

        <div class="side-block">
          <span class="field__label">Alcance</span>
          <select v-model="form.scope" class="field__input">
            <option v-for="opt in SCOPE_OPTIONS" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </option>
          </select>
          <p class="side-block__hint">
            Clasificación de acceso — todavía sin recorte real de contenido, solo se usa para
            filtrar y ordenar.
          </p>
        </div>

        <div class="side-block">
          <span class="field__label">Nivel</span>
          <select v-model="form.level" class="field__input">
            <option v-for="opt in LEVEL_OPTIONS" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </option>
          </select>
        </div>

        <div class="side-block">
          <span class="field__label">Audiencia *</span>
          <div class="side-block__checks">
            <label v-for="opt in AUDIENCE_OPTIONS" :key="opt.value" class="check">
              <input
                type="checkbox"
                :checked="form.audience.includes(opt.value)"
                @change="toggleAudience(opt.value)"
              />
              {{ opt.label }}
            </label>
          </div>
        </div>

        <div class="side-block">
          <span class="field__label">Categorías *</span>
          <div class="side-block__checks">
            <label v-for="opt in categoryOptions" :key="opt.slug" class="check">
              <input
                type="checkbox"
                :checked="form.categorySlugs.includes(opt.slug)"
                @change="toggleCategory(opt.slug)"
              />
              {{ opt.name }}
            </label>
          </div>
        </div>

        <label class="side-block">
          <span class="field__label">Tags (separados por coma)</span>
          <input
            v-model="tagsInput"
            type="text"
            class="field__input"
            placeholder="AT, familia, duelo"
          />
        </label>

        <div class="side-block">
          <span class="field__label">Imagen de portada</span>

          <div v-if="form.coverImage" class="cover">
            <img :src="form.coverImage" alt="Portada del artículo" class="cover__img" />
            <button
              type="button"
              class="cover__remove"
              :disabled="isUploadingCover"
              @click="onRemoveCover"
            >
              Quitar imagen
            </button>
          </div>

          <label v-else class="cover-upload" :class="{ 'is-disabled': isUploadingCover }">
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              class="cover-upload__input"
              :disabled="isUploadingCover"
              @change="onSelectCoverFile"
            />
            {{ isUploadingCover ? 'Subiendo…' : 'Elegir imagen…' }}
          </label>

          <p v-if="coverError" class="cover-error" role="alert">{{ coverError }}</p>
        </div>

        <label class="side-block">
          <span class="field__label">Minutos de lectura</span>
          <input v-model.number="form.readingTime" type="number" min="1" class="field__input" />
        </label>

        <p v-if="errorMessage" class="form-page__error" role="alert">{{ errorMessage }}</p>

        <button type="submit" class="btn btn--primary form-page__submit" :disabled="isSaving">
          {{ isSaving ? 'Guardando…' : 'Guardar' }}
        </button>
      </aside>
    </form>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  createArticle,
  getAdminArticle,
  listCategoryOptions,
  updateArticle,
  type CategoryOption,
} from '@/services/admin/articles.api'
import { deleteMedia, uploadMedia } from '@/services/admin/media.api'
import { renderMarkdown } from '@/utils/markdown'
import { parseArticleMarkdown } from '@/utils/articleMarkdownImport'
import { ApiError } from '@/services/http'
import type { ArticleFormPayload, ArticleStatus } from '@/types/admin'
import type { Audience, ArticleScope, Level } from '@/types'

const route = useRoute()
const router = useRouter()

const articleId = computed(() => (typeof route.params.id === 'string' ? route.params.id : null))
const isEditing = computed(() => !!articleId.value)

const categoryOptions = ref<CategoryOption[]>([])
const isLoading = ref(false)
const isSaving = ref(false)
const errorMessage = ref('')
const showPreview = ref(false)
const tagsInput = ref('')
const isUploadingCover = ref(false)
const coverError = ref('')
const isDraggingImport = ref(false)
const importWarnings = ref<string[]>([])
const importFileInput = ref<HTMLInputElement | null>(null)

const form = ref<ArticleFormPayload>({
  title: '',
  slug: '',
  subtitle: '',
  excerpt: '',
  content: '',
  coverImage: '',
  coverImagePublicId: undefined,
  level: 'basico',
  audience: [],
  status: 'borrador',
  scope: 'publico',
  categorySlugs: [],
  tags: [],
  readingTime: undefined,
  publishedAt: '',
  sources: [],
  importMetadata: undefined,
})

function addSource() {
  form.value.sources = [...(form.value.sources ?? []), { title: '', url: '', description: '' }]
}

function removeSource(idx: number) {
  form.value.sources = (form.value.sources ?? []).filter((_, i) => i !== idx)
}

const previewHtml = computed(() => renderMarkdown(form.value.content))

const AUDIENCE_OPTIONS: { value: Audience; label: string }[] = [
  { value: 'cuidadores-familiares', label: 'Cuidadores / familias' },
  { value: 'profesionales', label: 'Profesionales' },
  { value: 'mixto', label: 'Mixto' },
]

const LEVEL_OPTIONS: { value: Level; label: string }[] = [
  { value: 'basico', label: 'Básico' },
  { value: 'intermedio', label: 'Intermedio' },
  { value: 'avanzado', label: 'Avanzado' },
]

const STATUS_OPTIONS: { value: ArticleStatus; label: string }[] = [
  { value: 'borrador', label: 'Borrador' },
  { value: 'publicado', label: 'Publicado' },
  { value: 'archivado', label: 'Archivado' },
]

const SCOPE_OPTIONS: { value: ArticleScope; label: string }[] = [
  { value: 'publico', label: 'Público' },
  { value: 'suscriptores_nivel_1', label: 'Registrados (nivel 1)' },
  { value: 'suscriptores_nivel_2', label: 'Suscriptores nivel 2' },
  { value: 'suscriptores_nivel_3', label: 'Suscriptores nivel 3' },
]

function toggleAudience(value: Audience) {
  const idx = form.value.audience.indexOf(value)
  if (idx === -1) form.value.audience.push(value)
  else form.value.audience.splice(idx, 1)
}

function toggleCategory(slug: string) {
  const idx = form.value.categorySlugs.indexOf(slug)
  if (idx === -1) form.value.categorySlugs.push(slug)
  else form.value.categorySlugs.splice(idx, 1)
}

async function onSelectCoverFile(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = '' // permite volver a elegir el mismo archivo más adelante si hace falta

  if (!file) return

  coverError.value = ''
  isUploadingCover.value = true
  const previousPublicId = form.value.coverImagePublicId

  try {
    const uploaded = await uploadMedia(file)
    form.value.coverImage = uploaded.url
    form.value.coverImagePublicId = uploaded.publicId

    // Recién se borra la vieja una vez que la nueva subió bien — si la
    // subida fallara, mejor quedarse con la imagen anterior que sin ninguna.
    if (previousPublicId) {
      await deleteMedia(previousPublicId).catch(() => {
        // Queda huérfana en Cloudinary — no es grave, no bloquea el flujo.
      })
    }
  } catch (err) {
    coverError.value = err instanceof ApiError ? err.message : 'No pudimos subir la imagen.'
  } finally {
    isUploadingCover.value = false
  }
}

async function onRemoveCover() {
  const publicId = form.value.coverImagePublicId
  form.value.coverImage = ''
  form.value.coverImagePublicId = undefined
  coverError.value = ''

  if (publicId) {
    await deleteMedia(publicId).catch(() => {
      coverError.value = 'La imagen se quitó del artículo, pero no pudimos borrarla de Cloudinary.'
    })
  }
}

function onDropImport(event: DragEvent) {
  isDraggingImport.value = false
  const file = event.dataTransfer?.files?.[0]
  if (file) importArticleFile(file)
}

function onPickImportFile(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = '' // permite volver a elegir el mismo archivo más adelante si hace falta
  if (file) importArticleFile(file)
}

async function importArticleFile(file: File) {
  if (!file.name.toLowerCase().endsWith('.md')) {
    importWarnings.value = ['Solo se aceptan archivos .md.']
    return
  }

  const raw = await file.text()
  const knownCategorySlugs = categoryOptions.value.map((c) => c.slug)
  const { data, warnings } = parseArticleMarkdown(raw, knownCategorySlugs, file.name)
  const { tagsInput: parsedTagsInput, ...formData } = data

  form.value = { ...form.value, ...formData }
  if (parsedTagsInput) tagsInput.value = parsedTagsInput

  importWarnings.value = warnings
}

async function loadArticle(id: string) {
  isLoading.value = true
  errorMessage.value = ''
  try {
    const article = await getAdminArticle(id)
    form.value = {
      title: article.title,
      slug: article.slug,
      subtitle: article.subtitle,
      excerpt: article.excerpt,
      content: article.content,
      coverImage: article.coverImage ?? '',
      coverImagePublicId: article.coverImagePublicId,
      level: article.level,
      audience: [...article.audience],
      status: article.status,
      scope: article.scope,
      categorySlugs: [...article.categorySlugs],
      tags: [...article.keywords],
      readingTime: article.readingTimeMinutes,
      publishedAt: article.publishedAt ? article.publishedAt.slice(0, 10) : '',
      sources: article.sources.map((s) => ({ ...s })),
      importMetadata: article.importMetadata ?? undefined,
    }
    tagsInput.value = article.keywords.join(', ')
  } catch {
    errorMessage.value = 'No pudimos cargar el artículo.'
  } finally {
    isLoading.value = false
  }
}

onMounted(async () => {
  try {
    categoryOptions.value = await listCategoryOptions()
  } catch {
    // el selector de categorías queda vacío — no bloquea el resto del formulario
  }
  if (articleId.value) await loadArticle(articleId.value)
})

async function onSubmit() {
  errorMessage.value = ''
  if (!form.value.audience.length) {
    errorMessage.value = 'Elegí al menos una audiencia.'
    return
  }
  if (!form.value.categorySlugs.length) {
    errorMessage.value = 'Elegí al menos una categoría.'
    return
  }

  isSaving.value = true
  const payload: ArticleFormPayload = {
    ...form.value,
    slug: form.value.slug?.trim() || undefined,
    tags: tagsInput.value
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean),
    readingTime: form.value.readingTime || undefined,
    publishedAt: form.value.publishedAt?.trim() || undefined,
    // Se descartan filas de fuente cargadas a medias (sin título o URL) —
    // no tiene sentido mandarlas al backend, que además las rechazaría.
    sources: (form.value.sources ?? [])
      .filter((s) => s.title.trim() && s.url.trim())
      .map((s) => ({
        title: s.title.trim(),
        url: s.url.trim(),
        description: s.description?.trim(),
      })),
  }

  try {
    if (isEditing.value && articleId.value) {
      await updateArticle(articleId.value, payload)
      router.push('/nexoat-admin/articulos')
    } else {
      const created = await createArticle(payload)
      router.push(`/nexoat-admin/articulos/${created.id}`)
    }
  } catch (err) {
    errorMessage.value = err instanceof ApiError ? err.message : 'No pudimos guardar el artículo.'
  } finally {
    isSaving.value = false
  }
}
</script>

<style scoped>
.form-page__head {
  display: flex;
  align-items: center;
  gap: 18px;
  margin-bottom: 22px;
}

.form-page__back {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--color-ink-muted);
}

.form-page__back:hover {
  color: var(--color-primary-dark);
}

.form-page__title {
  font-size: 1.3rem;
  margin: 0;
}

.form-page__grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 300px;
  gap: 28px;
  align-items: start;
}

.form-page__main {
  display: flex;
  flex-direction: column;
  gap: 20px;
  background: var(--color-surface);
  border: 1px solid var(--color-line-light);
  border-radius: var(--radius-xl);
  padding: 26px;
}

.form-page__side {
  display: flex;
  flex-direction: column;
  gap: 20px;
  background: var(--color-surface);
  border: 1px solid var(--color-line-light);
  border-radius: var(--radius-xl);
  padding: 22px;
  position: sticky;
  top: 96px;
}

.side-block {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.side-block__checks {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 200px;
  overflow-y: auto;
}

.check {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.86rem;
  color: var(--color-ink-secondary);
}

.cover {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.cover__img {
  width: 100%;
  aspect-ratio: 16 / 9;
  object-fit: cover;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-line);
}

.cover__remove {
  align-self: flex-start;
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--color-accent-dark);
}

.cover__remove:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.cover-upload {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 1.5px dashed var(--color-line);
  border-radius: var(--radius-md);
  padding: 22px 14px;
  font-size: 0.86rem;
  font-weight: 600;
  color: var(--color-ink-muted);
  cursor: pointer;
  transition:
    border-color 0.2s ease,
    color 0.2s ease;
}

.cover-upload:hover {
  border-color: var(--color-primary);
  color: var(--color-primary-dark);
}

.cover-upload.is-disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.cover-upload__input {
  /* Input real oculto, el <label> hace de botón — patrón estándar de file picker estilizado */
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  opacity: 0;
}

.cover-error {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--color-accent-dark);
}

.import-drop {
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  border: 1.5px dashed var(--color-line);
  border-radius: var(--radius-lg);
  padding: 22px 18px;
  cursor: pointer;
  transition:
    border-color 0.2s ease,
    background 0.2s ease;
}

.import-drop:hover,
.import-drop.is-dragging {
  border-color: var(--color-primary);
  background: var(--color-surface-sunken);
}

.import-drop__text {
  font-size: 0.86rem;
  color: var(--color-ink-muted);
  margin: 0;
}

.import-drop__input {
  display: none;
}

.import-warnings {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 4px;
  background: var(--color-ochre-soft);
  border-radius: var(--radius-md);
  padding: 12px 14px;
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--color-ink-secondary);
}

.field {
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.field__label {
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--color-ink-muted);
}

.field__label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.field__preview-toggle {
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--color-primary-dark);
}

.field__input {
  background: var(--color-canvas);
  border: 1.5px solid var(--color-line);
  border-radius: var(--radius-md);
  padding: 10px 13px;
  font-size: 0.92rem;
  width: 100%;
  transition: border-color 0.2s ease;
}

.field__input:focus-visible {
  border-color: var(--color-primary);
}

.field__textarea {
  resize: vertical;
  line-height: 1.6;
}

.field__code {
  font-family: ui-monospace, 'SFMono-Regular', Menlo, monospace;
  font-size: 0.85rem;
}

.side__empty-note {
  font-size: 0.84rem;
  color: var(--color-ink-faint);
  font-style: italic;
}

.source-row {
  display: grid;
  gap: 8px;
  padding: 14px;
  background: var(--color-canvas);
  border: 1.5px solid var(--color-line);
  border-radius: var(--radius-md);
  margin-bottom: 10px;
}

.source-row__remove {
  justify-self: flex-start;
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--color-accent-dark);
}

.field__preview {
  background: var(--color-canvas);
  border: 1.5px solid var(--color-line);
  border-radius: var(--radius-md);
  padding: 20px;
  min-height: 320px;
  max-width: none;
}

.form-page__error {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--color-accent-dark);
  background: var(--color-accent-soft);
  border-radius: var(--radius-md);
  padding: 10px 14px;
}

.form-page__submit {
  width: 100%;
}

@media (max-width: 1024px) {
  .form-page__grid {
    grid-template-columns: 1fr;
  }

  .form-page__side {
    position: static;
  }
}
</style>
