import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '@/views/HomeView.vue'
import { useAuthStore } from '@/stores/auth'
import type { Role } from '@/types/auth'

declare module 'vue-router' {
  interface RouteMeta {
    title?: string
    /** 'admin' = sin AppHeader/AppFooter público (ver App.vue). */
    layout?: 'admin'
    /** Rutas admin sin sesión, ej. login. */
    public?: boolean
    /** Si falta, cualquier rol autenticado entra — solo el guard de admin lo mira. */
    minRole?: Role[]
  }
}

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  scrollBehavior(to, _from, savedPosition) {
    if (savedPosition) return savedPosition
    if (to.hash) return { el: to.hash, behavior: 'smooth' }
    return { top: 0, behavior: 'smooth' }
  },
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
      meta: { title: 'Inicio' },
    },
    {
      path: '/categoria/:slug',
      name: 'category',
      component: () => import('@/views/CategoryView.vue'),
      meta: { title: 'Categoría' },
    },
    {
      path: '/articulo/:slug',
      name: 'article',
      component: () => import('@/views/ArticleView.vue'),
      meta: { title: 'Artículo' },
    },
    {
      path: '/buscar',
      name: 'search',
      component: () => import('@/views/SearchView.vue'),
      meta: { title: 'Buscar' },
    },
    {
      path: '/acerca-de',
      name: 'about',
      component: () => import('@/views/AboutView.vue'),
      meta: { title: 'Acerca de' },
    },
    {
      path: '/ingresar',
      name: 'login',
      component: () => import('@/views/LoginView.vue'),
      meta: { title: 'Ingresar' },
    },
    {
      path: '/registrarme',
      name: 'register',
      component: () => import('@/views/RegisterView.vue'),
      meta: { title: 'Registrarme' },
    },
    {
      path: '/planes',
      name: 'plans',
      component: () => import('@/views/PlansView.vue'),
      meta: { title: 'Planes de suscripción' },
    },
    {
      path: '/nexoat-admin',
      meta: { layout: 'admin' },
      children: [
        {
          path: 'login',
          name: 'admin-login',
          component: () => import('@/views/admin/AdminLoginView.vue'),
          meta: { title: 'Ingresar', public: true },
        },
        {
          path: 'oauth-callback',
          name: 'admin-oauth-callback',
          component: () => import('@/views/admin/AdminOAuthCallbackView.vue'),
          meta: { title: 'Ingresando…', public: true },
        },
        {
          path: '',
          component: () => import('@/layouts/AdminLayout.vue'),
          children: [
            {
              path: '',
              name: 'admin-dashboard',
              component: () => import('@/views/admin/AdminDashboardView.vue'),
              meta: { title: 'Panel' },
            },
            {
              path: 'articulos',
              name: 'admin-articles',
              component: () => import('@/views/admin/AdminArticlesView.vue'),
              meta: { title: 'Artículos', minRole: ['EDITOR', 'ADMIN', 'SUPER_ADMIN'] },
            },
            {
              path: 'articulos/nuevo',
              name: 'admin-article-new',
              component: () => import('@/views/admin/AdminArticleFormView.vue'),
              meta: { title: 'Nuevo artículo', minRole: ['EDITOR', 'ADMIN', 'SUPER_ADMIN'] },
            },
            {
              path: 'articulos/:id',
              name: 'admin-article-edit',
              component: () => import('@/views/admin/AdminArticleFormView.vue'),
              meta: { title: 'Editar artículo', minRole: ['EDITOR', 'ADMIN', 'SUPER_ADMIN'] },
            },
            {
              path: 'categorias',
              name: 'admin-categories',
              component: () => import('@/views/admin/AdminCategoriesView.vue'),
              meta: { title: 'Categorías', minRole: ['EDITOR', 'ADMIN', 'SUPER_ADMIN'] },
            },
            {
              path: 'usuarios',
              name: 'admin-users',
              component: () => import('@/views/admin/AdminUsersView.vue'),
              meta: { title: 'Usuarios', minRole: ['ADMIN', 'SUPER_ADMIN'] },
            },
            {
              path: 'auditoria',
              name: 'admin-audit',
              component: () => import('@/views/admin/AdminAuditView.vue'),
              meta: { title: 'Auditoría', minRole: ['ADMIN', 'SUPER_ADMIN'] },
            },
            {
              path: 'suscripciones',
              name: 'admin-subscribers',
              component: () => import('@/views/admin/AdminSubscribersView.vue'),
              meta: { title: 'Suscripciones', minRole: ['ADMIN', 'SUPER_ADMIN'] },
            },
            {
              path: 'respaldos',
              name: 'admin-backups',
              component: () => import('@/views/admin/AdminBackupsView.vue'),
              // Solo SUPER_ADMIN: restaurar reemplaza el estado completo del
              // sitio, usuarios incluidos (ver docs/features/database-backups.md).
              meta: { title: 'Respaldos', minRole: ['SUPER_ADMIN'] },
            },
          ],
        },
      ],
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: () => import('@/views/NotFoundView.vue'),
      meta: { title: 'Página no encontrada' },
    },
  ],
})

router.beforeEach(async (to) => {
  if (to.meta.layout !== 'admin' || to.meta.public) return true

  const authStore = useAuthStore()
  await authStore.bootstrap()

  if (!authStore.isAuthenticated) {
    return { name: 'admin-login', query: { redirect: to.fullPath } }
  }

  if (to.meta.minRole && !authStore.hasRole(...to.meta.minRole)) {
    return { name: 'admin-dashboard' }
  }

  return true
})

router.afterEach((to) => {
  const baseTitle = 'NexoAT'
  document.title = to.meta.title ? `${to.meta.title} — ${baseTitle}` : baseTitle
})

export default router
