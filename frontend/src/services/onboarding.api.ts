import { http } from '@/services/http'
import type { AuthUser, ProfileRole } from '@/types/auth'

export interface CompleteOnboardingPayload {
  profileRole: ProfileRole
  acceptedTerms: boolean
  subscribeNewsletter: boolean
}

export function completeOnboarding(payload: CompleteOnboardingPayload): Promise<AuthUser> {
  return http<AuthUser>('/me/onboarding/complete', { method: 'POST', body: payload })
}
