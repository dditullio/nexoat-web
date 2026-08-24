import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { http } from '@/services/http'
import type { AuthUser, ProvidersResponse, Role, SessionResponse } from '@/types/auth'

export const useAuthStore = defineStore('auth', () => {
  // El access token vive solo en memoria (nunca localStorage) para reducir
  // superficie de robo por XSS — se pierde al recargar la página a propósito,
  // y se recupera vía refresh() usando la cookie httpOnly de refresh.
  const user = ref<AuthUser | null>(null)
  const accessToken = ref<string | null>(null)
  const providers = ref<ProvidersResponse>({ google: false, facebook: false })
  const isBootstrapped = ref(false)
  const isBootstrapping = ref(false)

  const isAuthenticated = computed(() => !!user.value)

  function hasRole(...roles: Role[]): boolean {
    return !!user.value && roles.includes(user.value.role)
  }

  function setSession(session: SessionResponse) {
    accessToken.value = session.accessToken
    user.value = session.user
  }

  function clearSession() {
    accessToken.value = null
    user.value = null
  }

  async function login(email: string, password: string) {
    const session = await http<SessionResponse>('/auth/login', {
      method: 'POST',
      body: { email, password },
      skipAuthRetry: true,
    })
    setSession(session)
  }

  /**
   * Paso 1 del alta por email — solo pide el email, manda un link de
   * activación. Siempre resuelve (ni siquiera revela si el email ya tiene
   * cuenta) — ver docs/features/email-first-signup-and-onboarding.md.
   */
  async function requestSignup(email: string) {
    await http('/auth/signup', { method: 'POST', body: { email }, skipAuthRetry: true })
  }

  /** Paso 2: consume el token de activación, crea contraseña/nombre y abre sesión de una. */
  async function completeSignup(
    token: string,
    name: string,
    password: string,
    passwordConfirm: string
  ) {
    const session = await http<SessionResponse>('/auth/signup/complete', {
      method: 'POST',
      body: { token, name, password, passwordConfirm },
      skipAuthRetry: true,
    })
    setSession(session)
  }

  async function logout() {
    try {
      await http('/auth/logout', { method: 'POST', skipAuthRetry: true })
    } finally {
      clearSession()
    }
  }

  async function fetchMe() {
    user.value = await http<AuthUser>('/auth/me')
  }

  /** Silent refresh vía la cookie httpOnly. `false` si no hay sesión válida. */
  async function refresh(): Promise<boolean> {
    try {
      const session = await http<SessionResponse>('/auth/refresh', {
        method: 'POST',
        skipAuthRetry: true,
      })
      setSession(session)
      return true
    } catch {
      clearSession()
      return false
    }
  }

  async function fetchProviders() {
    providers.value = await http<ProvidersResponse>('/auth/providers', { skipAuthRetry: true })
  }

  /** No lanza si el token es inválido/venció — el caller (VerifyEmailView) decide qué mostrar según el resultado. */
  async function verifyEmail(token: string): Promise<boolean> {
    try {
      await http('/auth/verify-email', { method: 'POST', body: { token }, skipAuthRetry: true })
      if (user.value) user.value = { ...user.value, emailVerified: new Date().toISOString() }
      return true
    } catch {
      return false
    }
  }

  /** Requiere sesión — reenvía al email de la cuenta logueada. */
  async function resendVerification() {
    await http('/auth/verify-email/resend', { method: 'POST' })
  }

  /** Siempre resuelve, exista o no la cuenta — el backend nunca revela si el email existe. */
  async function requestPasswordReset(email: string) {
    await http('/auth/forgot-password', { method: 'POST', body: { email }, skipAuthRetry: true })
  }

  async function resetPassword(token: string, password: string) {
    await http('/auth/reset-password', {
      method: 'POST',
      body: { token, password },
      skipAuthRetry: true,
    })
  }

  /** Se llama una vez al montar App.vue — idempotente, así el router guard puede repetirla sin costo. */
  async function bootstrap() {
    if (isBootstrapped.value) return
    if (isBootstrapping.value) {
      // Ya hay un bootstrap en curso (ej. guard de router + App.vue casi
      // simultáneos) — esperar a que termine en vez de duplicar el refresh.
      while (isBootstrapping.value) await new Promise((r) => setTimeout(r, 10))
      return
    }
    isBootstrapping.value = true
    await Promise.allSettled([refresh(), fetchProviders()])
    isBootstrapping.value = false
    isBootstrapped.value = true
  }

  /**
   * Refleja en el store el AuthUser que ya devolvió una llamada a
   * `services/profile.api.ts` (que siempre trae el registro completo) —
   * evita un `fetchMe()` extra de ida y vuelta al servidor después de cada
   * cambio de perfil.
   */
  function updateLocalUser(updated: AuthUser) {
    user.value = updated
  }

  return {
    user,
    accessToken,
    providers,
    isBootstrapped,
    isAuthenticated,
    hasRole,
    login,
    requestSignup,
    completeSignup,
    logout,
    fetchMe,
    refresh,
    fetchProviders,
    bootstrap,
    updateLocalUser,
    verifyEmail,
    resendVerification,
    requestPasswordReset,
    resetPassword,
  }
})
