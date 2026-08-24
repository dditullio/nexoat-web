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
    /** Rutas públicas (`layout` distinto de 'admin') que igual exigen sesión de lector, ej. "Mi perfil". */
    requiresAuth?: boolean
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
      // Landing "OAuth primero" — ver AuthEntryView.vue. El formulario de
      // email queda como alternativa secundaria en /ingresar/correo.
      path: '/ingresar',
      name: 'login',
      component: () => import('@/views/AuthEntryView.vue'),
      props: { mode: 'login' },
      meta: { title: 'Ingresar' },
    },
    {
      path: '/ingresar/correo',
      name: 'login-email',
      component: () => import('@/views/LoginView.vue'),
      meta: { title: 'Ingresar con correo' },
    },
    {
      path: '/registrarme',
      name: 'register',
      component: () => import('@/views/AuthEntryView.vue'),
      props: { mode: 'register' },
      meta: { title: 'Registrarme' },
    },
    {
      path: '/registrarme/correo',
      name: 'register-email',
      component: () => import('@/views/RegisterView.vue'),
      meta: { title: 'Registrarme con correo' },
    },
    {
      path: '/oauth-callback',
      name: 'oauth-callback',
      component: () => import('@/views/OAuthCallbackView.vue'),
      meta: { title: 'Ingresando…' },
    },
    {
      path: '/verificar-correo',
      name: 'verify-email',
      component: () => import('@/views/VerifyEmailView.vue'),
      meta: { title: 'Confirmar email' },
    },
    {
      path: '/recuperar-contrasena',
      name: 'forgot-password',
      component: () => import('@/views/ForgotPasswordView.vue'),
      meta: { title: 'Recuperar contraseña' },
    },
    {
      path: '/restablecer-contrasena',
      name: 'reset-password',
      component: () => import('@/views/ResetPasswordView.vue'),
      meta: { title: 'Elegir nueva contraseña' },
    },
    {
      path: '/planes',
      name: 'plans',
      component: () => import('@/views/PlansView.vue'),
      meta: { title: 'Planes de suscripción' },
    },
    {
      path: '/mi-cuenta/perfil',
      name: 'my-profile',
      component: () => import('@/views/ProfileView.vue'),
      meta: { title: 'Mi perfil', requiresAuth: true },
    },
    {
      path: '/mi-cuenta/historial',
      name: 'reading-history',
      component: () => import('@/views/ReadingHistoryView.vue'),
      meta: { title: 'Historial de lectura', requiresAuth: true },
    },
    {
      path: '/mi-cuenta/guardados',
      name: 'saved-articles',
      component: () => import('@/views/SavedArticlesView.vue'),
      meta: { title: 'Artículos guardados', requiresAuth: true },
    },
    {
      path: '/mi-cuenta/preferencias',
      name: 'preferences',
      component: () => import('@/views/PreferencesView.vue'),
      meta: { title: 'Preferencias de correo', requiresAuth: true },
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
            {
              path: 'configuracion',
              name: 'admin-settings',
              component: () => import('@/views/admin/AdminSettingsView.vue'),
              meta: { title: 'Configuración', minRole: ['ADMIN', 'SUPER_ADMIN'] },
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
  // Ramas separadas para el layout admin y para rutas públicas que igual
  // exigen sesión (ej. "Mi perfil") — distinto destino de login en cada
  // caso, así que no conviene fusionarlas en una sola condición.
  if (to.meta.layout === 'admin') {
    if (to.meta.public) return true

    const authStore = useAuthStore()
    await authStore.bootstrap()

    if (!authStore.isAuthenticated) {
      return { name: 'admin-login', query: { redirect: to.fullPath } }
    }

    if (to.meta.minRole && !authStore.hasRole(...to.meta.minRole)) {
      return { name: 'admin-dashboard' }
    }

    return true
  }

  if (to.meta.requiresAuth) {
    const authStore = useAuthStore()
    await authStore.bootstrap()

    if (!authStore.isAuthenticated) {
      return { name: 'login', query: { redirect: to.fullPath } }
    }
  }

  return true
})

router.afterEach((to) => {
  const baseTitle = 'NexoAT'
  document.title = to.meta.title ? `${to.meta.title} — ${baseTitle}` : baseTitle
})

export default router
