<template>
  <div class="dash">
    <p class="dash__welcome">
      Hola{{ authStore.user?.name ? `, ${authStore.user.name}` : '' }} — accesos rápidos abajo.
    </p>

    <div class="dash__grid">
      <RouterLink
        v-if="authStore.hasRole('EDITOR', 'ADMIN', 'SUPER_ADMIN')"
        to="/nexoat-admin/articulos"
        class="dash__card"
      >
        <IconDocument />
        <h2>Artículos</h2>
        <p>Crear, editar y publicar el contenido del blog.</p>
      </RouterLink>

      <RouterLink
        v-if="authStore.hasRole('EDITOR', 'ADMIN', 'SUPER_ADMIN')"
        to="/nexoat-admin/categorias"
        class="dash__card"
      >
        <IconImage />
        <h2>Categorías</h2>
        <p>Subí o cambiá la imagen de portada de cada categoría.</p>
      </RouterLink>

      <RouterLink
        v-if="authStore.hasRole('ADMIN', 'SUPER_ADMIN')"
        to="/nexoat-admin/usuarios"
        class="dash__card"
      >
        <IconUsers />
        <h2>Usuarios</h2>
        <p>Ver cuentas registradas y gestionar roles.</p>
      </RouterLink>

      <RouterLink
        v-if="authStore.hasRole('ADMIN', 'SUPER_ADMIN')"
        to="/nexoat-admin/auditoria"
        class="dash__card"
      >
        <IconClock />
        <h2>Auditoría</h2>
        <p>Historial de cambios: quién hizo qué y cuándo.</p>
      </RouterLink>

      <RouterLink
        v-if="authStore.hasRole('ADMIN', 'SUPER_ADMIN')"
        to="/nexoat-admin/suscripciones"
        class="dash__card"
      >
        <IconMail />
        <h2>Suscripciones</h2>
        <p>Suscriptores al newsletter del sitio público.</p>
      </RouterLink>

      <RouterLink
        v-if="authStore.hasRole('SUPER_ADMIN')"
        to="/nexoat-admin/respaldos"
        class="dash__card"
      >
        <IconArchive />
        <h2>Respaldos</h2>
        <p>Copias de seguridad de la base: crear, descargar y restaurar.</p>
      </RouterLink>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'
import IconDocument from '@/components/admin/icons/IconDocument.vue'
import IconImage from '@/components/admin/icons/IconImage.vue'
import IconUsers from '@/components/admin/icons/IconUsers.vue'
import IconClock from '@/components/admin/icons/IconClock.vue'
import IconMail from '@/components/admin/icons/IconMail.vue'
import IconArchive from '@/components/admin/icons/IconArchive.vue'

const authStore = useAuthStore()
</script>

<style scoped>
.dash__welcome {
  color: var(--color-ink-secondary);
  margin-bottom: 28px;
}

.dash__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 18px;
}

.dash__card {
  background: var(--color-surface);
  border: 1px solid var(--color-line-light);
  border-radius: var(--radius-xl);
  padding: 26px;
  transition:
    transform 0.25s var(--ease-out-soft),
    box-shadow 0.25s var(--ease-out-soft),
    border-color 0.25s ease;
}

.dash__card:hover {
  transform: translateY(-3px);
  box-shadow: var(--shadow-md);
  border-color: var(--color-primary-soft);
}

.dash__card :deep(svg) {
  width: 26px;
  height: 26px;
  color: var(--color-primary-dark);
  margin-bottom: 14px;
}

.dash__card h2 {
  font-size: 1.05rem;
  margin-bottom: 6px;
}

.dash__card p {
  font-size: 0.86rem;
  color: var(--color-ink-muted);
  line-height: 1.5;
}
</style>
