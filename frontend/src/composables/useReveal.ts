import { onMounted, onBeforeUnmount } from 'vue'

/**
 * Revela con un fade-up los elementos `.reveal` a medida que entran en
 * viewport. Escalona los hermanos de un mismo contenedor para que la
 * entrada se lea como una secuencia y no como un salto.
 *
 * Los elementos ya visibles al cargar se revelan de inmediato, de modo
 * que nada queda invisible si IntersectionObserver no está disponible.
 *
 * El escaneo inicial de `.reveal` no alcanza: secciones como "De esta
 * semana" o "Lo más reciente" dependen de un fetch async (fetchArticles),
 * así que sus `.reveal` todavía no existen en el DOM cuando corre el
 * onMounted de esta vista — quedaban en opacity:0 para siempre hasta que
 * se remontaba la vista con el store ya poblado (ej. navegando y volviendo).
 * Un MutationObserver cubre ese caso: cualquier `.reveal` que aparezca
 * después también se observa.
 */
export function useReveal(options: { stagger?: number; threshold?: number } = {}) {
  const { stagger = 90, threshold = 0.12 } = options
  let observer: IntersectionObserver | null = null
  let mutationObserver: MutationObserver | null = null

  onMounted(() => {
    const reducedMotion =
      'matchMedia' in window && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const hasIO = 'IntersectionObserver' in window

    // Sin soporte (o el usuario pide menos movimiento): mostrar todo antes
    // que dejarlo invisible — no hace falta observar nada.
    if (!hasIO || reducedMotion) {
      const reveal = (el: HTMLElement) => el.classList.add('is-visible')
      document.querySelectorAll<HTMLElement>('.reveal').forEach(reveal)
      if (!hasIO) return
    }

    observer = new IntersectionObserver(
      (entries, obs) => {
        // Agrupa por contenedor para escalonar sólo entre hermanos.
        const byParent = new Map<Element, IntersectionObserverEntry[]>()

        entries
          .filter((entry) => entry.isIntersecting)
          .forEach((entry) => {
            const parent = entry.target.parentElement ?? document.body
            const group = byParent.get(parent) ?? []
            group.push(entry)
            byParent.set(parent, group)
          })

        byParent.forEach((group) => {
          group.forEach((entry, i) => {
            const el = entry.target as HTMLElement
            el.style.transitionDelay = `${i * stagger}ms`
            el.classList.add('is-visible')
            obs.unobserve(el)
          })
        })
      },
      { threshold, rootMargin: '0px 0px -8% 0px' }
    )

    const observeIfPending = (el: HTMLElement) => {
      if (!el.classList.contains('is-visible')) observer!.observe(el)
    }

    document.querySelectorAll<HTMLElement>('.reveal').forEach(observeIfPending)

    mutationObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        mutation.addedNodes.forEach((node) => {
          if (!(node instanceof HTMLElement)) return
          if (node.matches('.reveal')) observeIfPending(node)
          node.querySelectorAll<HTMLElement>('.reveal').forEach(observeIfPending)
        })
      }
    })
    mutationObserver.observe(document.body, { childList: true, subtree: true })
  })

  onBeforeUnmount(() => {
    observer?.disconnect()
    observer = null
    mutationObserver?.disconnect()
    mutationObserver = null
  })
}
