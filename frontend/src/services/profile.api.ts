import { http } from '@/services/http'
import type { AuthUser, ProfileRole } from '@/types/auth'

export interface UpdateProfilePayload {
  name?: string
  profileRole?: ProfileRole | null
}

export interface UpdateProfessionalProfilePayload {
  specialization: string
  experienceYears?: number
  bio?: string
  isPublic?: boolean
}

export function getProfile(): Promise<AuthUser> {
  return http<AuthUser>('/me/profile')
}

export function updateProfile(payload: UpdateProfilePayload): Promise<AuthUser> {
  return http<AuthUser>('/me/profile', { method: 'PATCH', body: payload })
}

export function uploadAvatar(file: File): Promise<AuthUser> {
  const formData = new FormData()
  formData.append('file', file)
  return http<AuthUser>('/me/profile/avatar', { method: 'POST', body: formData })
}

export function deleteAvatar(): Promise<AuthUser> {
  return http<AuthUser>('/me/profile/avatar', { method: 'DELETE' })
}

export function upsertProfessionalProfile(
  payload: UpdateProfessionalProfilePayload
): Promise<AuthUser> {
  return http<AuthUser>('/me/profile/professional', { method: 'PUT', body: payload })
}

export function deleteProfessionalProfile(): Promise<AuthUser> {
  return http<AuthUser>('/me/profile/professional', { method: 'DELETE' })
}
