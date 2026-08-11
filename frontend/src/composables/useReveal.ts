import { onMounted, onBeforeUnmount } from 'vue'

/**
 * Revela con un fade-up los elementos `.reveal` a medida que entran en
 * viewport. Escalona los hermanos de un mismo contenedor para que la
 * entrada se lea como una secuencia y no como un salto.
 *
 * Los elementos ya visibles al cargar se revelan de inmediato, de modo
 * que nada queda invisible si IntersectionObserver no está disponible.
 */
export function useReveal(options: { stagger?: number; threshold?: number } = {}) {
  const { stagger = 90, threshold = 0.12 } = options
  let observer: IntersectionObserver | null = null

  onMounted(() => {
    const targets = Array.from(document.querySelectorAll<HTMLElement>('.reveal'))
    if (!targets.length) return

    // Sin soporte: mostrar todo antes que dejarlo invisible.
    if (!('IntersectionObserver' in window)) {
      targets.forEach((el) => el.classList.add('is-visible'))
      return
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

    targets.forEach((el) => observer!.observe(el))
  })

  onBeforeUnmount(() => {
    observer?.disconnect()
    observer = null
  })
}
