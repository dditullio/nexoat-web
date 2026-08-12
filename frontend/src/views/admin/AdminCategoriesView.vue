<template>
  <div class="cats">
    <p class="cats__lead">
      Las 15 categorías son un set fijo — acá solo se sube o se cambia la imagen de portada de cada
      una. Se usa como fondo de su tarjeta en la home y en el encabezado de su página de listado.
    </p>

    <p v-if="isLoading" class="section-lead">Cargando…</p>

    <div v-else class="cats__grid">
      <div v-for="category in categories" :key="category.id" class="cat-item">
        <div v-if="category.coverImage" class="cat-item__preview">
          <img :src="category.coverImage" :alt="category.name" class="cat-item__img" />
          <button
            type="button"
            class="cat-item__remove"
            :disabled="pendingId === category.id"
            @click="onRemove(category)"
          >
            Quitar imagen
          </button>
        </div>

        <label
          v-else
          class="cat-item__upload"
          :class="{ 'is-disabled': pendingId === category.id }"
        >
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            class="cat-item__upload-input"
            :disabled="pendingId === category.id"
            @change="onSelectFile($event, category)"
          />
          {{ pendingId === category.id ? 'Subiendo…' : 'Elegir imagen…' }}
        </label>

        <div class="cat-item__body">
          <span class="cat-item__name">{{ category.name }}</span>
          <p v-if="category.description" class="cat-item__desc">{{ category.description }}</p>
          <p v-if="errors[category.id]" class="cat-item__error" role="alert">
            {{ errors[category.id] }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { listAdminCategories, updateCategoryImage } from '@/services/admin/categories.api'
import { deleteMedia, uploadMedia } from '@/services/admin/media.api'
import { ApiError } from '@/services/http'
import type { AdminCategory } from '@/types/admin'

const categories = ref<AdminCategory[]>([])
const isLoading = ref(false)
const pendingId = ref<string | null>(null)
const errors = reactive<Record<string, string>>({})

async function loadCategories() {
  isLoading.value = true
  try {
    categories.value = await listAdminCategories()
  } finally {
    isLoading.value = false
  }
}

async function onSelectFile(event: Event, category: AdminCategory) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = '' // permite volver a elegir el mismo archivo más adelante si hace falta
  if (!file) return

  delete errors[category.id]
  pendingId.value = category.id

  try {
    const uploaded = await uploadMedia(file, 'categories')
    const updated = await updateCategoryImage(category.id, {
      coverImage: uploaded.url,
      coverImagePublicId: uploaded.publicId,
    })
    const idx = categories.value.findIndex((c) => c.id === category.id)
    if (idx !== -1) categories.value[idx] = updated
  } catch (err) {
    errors[category.id] = err instanceof ApiError ? err.message : 'No pudimos subir la imagen.'
  } finally {
    pendingId.value = null
  }
}

async function onRemove(category: AdminCategory) {
  delete errors[category.id]
  pendingId.value = category.id
  const publicId = category.coverImagePublicId

  try {
    const updated = await updateCategoryImage(category.id, {
      coverImage: '',
      coverImagePublicId: '',
    })
    const idx = categories.value.findIndex((c) => c.id === category.id)
    if (idx !== -1) categories.value[idx] = updated

    if (publicId) {
      await deleteMedia(publicId).catch(() => {
        // Queda huérfana en Cloudinary — no es grave, no bloquea el flujo.
      })
    }
  } catch {
    errors[category.id] = 'No pudimos quitar la imagen.'
  } finally {
    pendingId.value = null
  }
}

onMounted(loadCategories)
</script>

<style scoped>
.cats__lead {
  color: var(--color-ink-secondary);
  max-width: 68ch;
  line-height: 1.6;
  margin-bottom: 28px;
}

.cats__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 18px;
}

.cat-item {
  background: var(--color-surface);
  border: 1px solid var(--color-line-light);
  border-radius: var(--radius-xl);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.cat-item__preview {
  position: relative;
}

.cat-item__img {
  width: 100%;
  aspect-ratio: 16 / 9;
  object-fit: cover;
  display: block;
}

.cat-item__remove {
  position: absolute;
  bottom: 10px;
  right: 10px;
  background: rgba(20, 16, 12, 0.65);
  color: #f7f2e9;
  font-size: 0.76rem;
  font-weight: 700;
  padding: 6px 12px;
  border-radius: var(--radius-full);
  transition: background 0.2s ease;
}

.cat-item__remove:hover {
  background: rgba(20, 16, 12, 0.85);
}

.cat-item__remove:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.cat-item__upload {
  aspect-ratio: 16 / 9;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-canvas-alt);
  border-bottom: 1.5px dashed var(--color-line);
  font-size: 0.86rem;
  font-weight: 600;
  color: var(--color-ink-muted);
  cursor: pointer;
  transition:
    background 0.2s ease,
    color 0.2s ease;
}

.cat-item__upload:hover {
  background: var(--color-surface-sunken);
  color: var(--color-primary-dark);
}

.cat-item__upload.is-disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.cat-item__upload-input {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  opacity: 0;
}

.cat-item__body {
  padding: 14px 16px 16px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.cat-item__name {
  font-family: var(--font-display);
  font-variation-settings:
    'SOFT' 60,
    'WONK' 1;
  font-size: 1rem;
  font-weight: 600;
}

.cat-item__desc {
  font-size: 0.8rem;
  color: var(--color-ink-muted);
  line-height: 1.5;
}

.cat-item__error {
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--color-accent-dark);
}
</style>
