export type Role = 'SUPER_ADMIN' | 'ADMIN' | 'EDITOR' | 'USER'
// Nivel de suscripción de un lector — no confundir con Role. Toda cuenta
// nueva nace en "gratuito"; nivel_2/nivel_3 todavía no se pueden asignar
// (sin cobro real), ver docs/features/reader-accounts-and-paywall.md.
export type SubscriptionTier = 'gratuito' | 'nivel_2' | 'nivel_3'

export interface AuthUser {
  id: string
  email: string
  name: string | null
  avatarUrl: string | null
  role: Role
  subscriptionTier: SubscriptionTier
  isActive: boolean
  emailVerified: string | null
  createdAt: string
  updatedAt: string
}

export interface SessionResponse {
  accessToken: string
  user: AuthUser
}

export interface ProvidersResponse {
  google: boolean
  facebook: boolean
}
