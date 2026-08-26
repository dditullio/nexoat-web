// Borrador del comentario que un visitante sin sesión estaba escribiendo —
// ver docs/features/article-comments.md, decisión 4. Vive en localStorage
// (no en el backend: no hay a quién atribuirle el borrador sin sesión) con
// un TTL de 7 días. Se limpia solo cuando el envío sale bien.

const TTL_MS = 7 * 24 * 60 * 60 * 1000

interface StoredDraft {
  body: string
  parentId?: string
  savedAt: number
}

function key(slug: string): string {
  return `nexoat:comment-draft:${slug}`
}

export function saveCommentDraft(slug: string, body: string, parentId?: string): void {
  try {
    const draft: StoredDraft = { body, parentId, savedAt: Date.now() }
    window.localStorage.setItem(key(slug), JSON.stringify(draft))
  } catch {
    // localStorage no disponible (privado, cuota, etc.) — el borrador
    // simplemente no persiste, no es un error que deba interrumpir nada.
  }
}

export function readCommentDraft(slug: string): { body: string; parentId?: string } | null {
  try {
    const raw = window.localStorage.getItem(key(slug))
    if (!raw) return null
    const draft = JSON.parse(raw) as StoredDraft
    if (!draft.body || Date.now() - draft.savedAt > TTL_MS) {
      window.localStorage.removeItem(key(slug))
      return null
    }
    return { body: draft.body, parentId: draft.parentId }
  } catch {
    return null
  }
}

export function clearCommentDraft(slug: string): void {
  try {
    window.localStorage.removeItem(key(slug))
  } catch {
    // idéntico criterio que arriba: si no se puede limpiar, no es fatal.
  }
}
