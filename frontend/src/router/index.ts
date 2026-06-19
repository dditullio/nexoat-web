import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '@/views/HomeView.vue'

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
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: () => import('@/views/NotFoundView.vue'),
      meta: { title: 'Página no encontrada' },
    },
  ],
})

router.afterEach((to) => {
  const baseTitle = 'NexoAT'
  document.title = to.meta.title ? `${to.meta.title} — ${baseTitle}` : baseTitle
})

export default router
