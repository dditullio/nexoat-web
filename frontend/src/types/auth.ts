export type Role = 'SUPER_ADMIN' | 'ADMIN' | 'EDITOR' | 'USER'

export interface AuthUser {
  id: string
  email: string
  name: string | null
  avatarUrl: string | null
  role: Role
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
