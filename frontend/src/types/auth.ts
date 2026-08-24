export type Role = 'SUPER_ADMIN' | 'ADMIN' | 'EDITOR' | 'USER'
// Nivel de suscripción de un lector — no confundir con Role. Toda cuenta
// nueva nace en "gratuito"; nivel_2/nivel_3 todavía no se pueden asignar
// (sin cobro real), ver docs/features/reader-accounts-and-paywall.md.
export type SubscriptionTier = 'gratuito' | 'nivel_2' | 'nivel_3'

// Quién es el lector dentro del público del sitio — no confundir con Role
// (permisos de admin) ni con SubscriptionTier (nivel de pago). `null` =
// todavía no elegido. Ver docs/features/reader-profile.md.
export type ProfileRole = 'acompanante_terapeutico' | 'cuidador' | 'familiar' | 'otro'

export const PROFILE_ROLE_LABEL: Record<ProfileRole, string> = {
  acompanante_terapeutico: 'Acompañante Terapéutico (o en formación)',
  cuidador: 'Cuidador/a',
  familiar: 'Familiar o allegado',
  otro: 'Otro',
}

// Solo estos dos ProfileRole pueden tener un ProfessionalProfile — mismo
// criterio que PROFESSIONAL_PROFILE_ROLES en el backend (profile.service.ts).
export const PROFESSIONAL_PROFILE_ROLES: ProfileRole[] = ['acompanante_terapeutico', 'cuidador']

// Mini-currículum opcional, solo para profileRole AT/Cuidador. `isPublic`
// está reservado para el futuro directorio de acompañantes — sin efecto
// visible hoy.
export interface ProfessionalProfile {
  id: string
  specialization: string
  experienceYears: number | null
  bio: string | null
  isPublic: boolean
}

export interface AuthUser {
  id: string
  email: string
  name: string | null
  avatarUrl: string | null
  role: Role
  subscriptionTier: SubscriptionTier
  profileRole: ProfileRole | null
  // Ausente (no `null`) en las respuestas de /auth/* (login, register,
  // refresh, me) — esas solo traen columnas propias de User, no la
  // relación. Se completa recién con GET /me/profile (ver profile.api.ts),
  // que sí la trae porque hace el include explícito.
  professionalProfile?: ProfessionalProfile | null
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
