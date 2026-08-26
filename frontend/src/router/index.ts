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
      path: '/completar-registro',
      name: 'complete-signup',
      component: () => import('@/views/CompleteSignupView.vue'),
      meta: { title: 'Terminar de crear tu cuenta' },
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
      path: '/terminos',
      name: 'terms',
      component: () => import('@/views/TermsView.vue'),
      meta: { title: 'Términos y privacidad' },
    },
    {
      path: '/bienvenida',
      name: 'onboarding',
      component: () => import('@/views/OnboardingView.vue'),
      meta: { title: 'Bienvenido/a', requiresAuth: true },
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
      path: '/mi-cuenta/comentarios',
      name: 'my-comments',
      component: () => import('@/views/MyCommentsView.vue'),
      meta: { title: 'Mis comentarios', requiresAuth: true },
    },
    {
      path: '/mi-cuenta/preferencias',
      name: 'preferences',
      component: () => import('@/views/PreferencesView.vue'),
      meta: { title: 'Preferencias de correo', requiresAuth: true },
    },
    {
      path: '/mi-cuenta/regalo',
      name: 'welcome-gift',
      component: () => import('@/views/ProfileGiftView.vue'),
      meta: { title: 'Tu regalo de bienvenida', requiresAuth: true },
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
              path: 'comentarios',
              name: 'admin-comments',
              component: () => import('@/views/admin/AdminCommentsView.vue'),
              meta: { title: 'Comentarios', minRole: ['EDITOR', 'ADMIN', 'SUPER_ADMIN'] },
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
              path: 'regalo-bienvenida',
              name: 'admin-gifts',
              component: () => import('@/views/admin/AdminGiftsView.vue'),
              meta: { title: 'Regalo de bienvenida', minRole: ['ADMIN', 'SUPER_ADMIN'] },
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

// Rutas del propio flujo de auth/onboarding — exentas del gate de
// onboarding obligatorio de más abajo (si no, alguien navegando /ingresar
// con sesión y onboarding incompleto rebotaría de un lado a otro). Ver
// docs/features/email-first-signup-and-onboarding.md, decisión 6.
const ONBOARDING_EXEMPT_ROUTE_NAMES = new Set([
  'login',
  'login-email',
  'register',
  'register-email',
  'complete-signup',
  'oauth-callback',
  'verify-email',
  'forgot-password',
  'reset-password',
  'onboarding',
  'terms',
])

router.beforeEach(async (to) => {
  // Rama aparte para el layout admin — distinto destino de login, y el
  // gate de onboarding de lectores no le aplica en absoluto.
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

  const authStore = useAuthStore()
  await authStore.bootstrap()

  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }

  // Onboarding obligatorio (pasos 1+2, ver OnboardingView.vue) — aplica a
  // cualquier página pública, no solo a las que ya exigían sesión, mientras
  // `onboardingCompletedAt` siga en null.
  if (
    authStore.isAuthenticated &&
    !authStore.user?.onboardingCompletedAt &&
    !ONBOARDING_EXEMPT_ROUTE_NAMES.has(String(to.name))
  ) {
    return { name: 'onboarding', query: { redirect: to.fullPath } }
  }

  return true
})

// Fallback de <title> para rutas que no llaman a `useSeoMeta` (admin,
// mi-cuenta, flujos de auth) — las públicas sí lo hacen, de forma reactiva
// vía `useHead` (ver docs/features/seo.md, Fase 1). Ese manejo reactivo
// flushea después de este hook síncrono, así que en las rutas públicas el
// título de `useSeoMeta` termina pisando a este; acá simplemente no hay
// nada que lo pise en las privadas.
router.afterEach((to) => {
  const baseTitle = 'NexoAT'
  document.title = to.meta.title ? `${to.meta.title} — ${baseTitle}` : baseTitle
})

export default router
