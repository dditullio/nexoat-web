<template>
  <div class="gift-picker">
    <label
      v-for="ebook in ebooks"
      :key="ebook.id"
      class="gift-picker__option"
      :class="{ 'is-selected': modelValue === ebook.id }"
    >
      <input
        type="radio"
        name="welcomeEbook"
        :value="ebook.id"
        :checked="modelValue === ebook.id"
        :disabled="disabled"
        @change="$emit('update:modelValue', ebook.id)"
      />
      <span class="gift-picker__cover" aria-hidden="true">
        <img v-if="ebook.coverImage" :src="ebook.coverImage" :alt="ebook.title" />
        <span v-else class="gift-picker__cover-fallback">📖</span>
      </span>
      <span class="gift-picker__copy">
        <span class="gift-picker__title">{{ ebook.title }}</span>
        <span v-if="ebook.subtitle" class="gift-picker__subtitle">{{ ebook.subtitle }}</span>
        <span class="gift-picker__summary">{{ ebook.summary }}</span>
      </span>
    </label>
  </div>
</template>

<script setup lang="ts">
import type { WelcomeEbook } from '@/types/gifts'

defineProps<{
  ebooks: WelcomeEbook[]
  modelValue: string | null
  disabled?: boolean
}>()

defineEmits<{ (e: 'update:modelValue', value: string): void }>()
</script>

<style scoped>
.gift-picker {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.gift-picker__option {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  border: 1.5px solid var(--color-line);
  border-radius: var(--radius-md);
  padding: 13px 16px;
  cursor: pointer;
  transition:
    border-color 0.2s ease,
    background 0.2s ease;
}

.gift-picker__option:hover {
  border-color: var(--color-primary);
}

.gift-picker__option.is-selected {
  border-color: var(--color-primary);
  background: var(--color-primary-tint);
}

.gift-picker__option input {
  margin-top: 4px;
  flex-shrink: 0;
  accent-color: var(--color-primary);
}

.gift-picker__cover {
  flex-shrink: 0;
  width: 48px;
  height: 64px;
  border-radius: var(--radius-sm);
  overflow: hidden;
  background: var(--color-canvas-alt);
  display: flex;
  align-items: center;
  justify-content: center;
}

.gift-picker__cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.gift-picker__cover-fallback {
  font-size: 1.3rem;
}

.gift-picker__copy {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.gift-picker__title {
  font-family: var(--font-display);
  font-variation-settings: 'SOFT' 60;
  font-size: 0.96rem;
  font-weight: 700;
  color: var(--color-ink);
}

.gift-picker__subtitle {
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--color-ink-muted);
}

.gift-picker__summary {
  font-size: 0.84rem;
  line-height: 1.5;
  color: var(--color-ink-secondary);
  margin-top: 2px;
}
</style>
