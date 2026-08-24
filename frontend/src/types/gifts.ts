// Regalo de bienvenida (ebook a elección) — ver docs/features/welcome-ebook-gift.md.

/** Lo que devuelve GET /gifts/available y GET /gifts/my-claim (dato "ebook") — nunca trae fileKey. */
export interface WelcomeEbook {
  id: string
  title: string
  subtitle: string | null
  slug: string
  topic: string
  summary: string
  coverImage: string | null
}

export interface EbookClaim {
  id: string
  ebookId: string
  claimedAt: string
  ebook: WelcomeEbook
}

/** Respuesta de GET/POST /admin/gifts — superset con los campos de gestión. */
export interface AdminWelcomeEbook {
  id: string
  title: string
  subtitle: string | null
  slug: string
  topic: string
  summary: string
  coverImage: string | null
  coverImagePublicId: string | null
  fileKey: string | null
  fileName: string | null
  active: boolean
  createdAt: string
  updatedAt: string
}

export interface GiftFormPayload {
  title: string
  subtitle?: string
  topic: string
  summary: string
  active?: boolean
  coverImage?: string
  coverImagePublicId?: string
}
