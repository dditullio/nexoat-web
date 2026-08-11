import { Injectable, UnauthorizedException } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { Strategy, type Profile } from 'passport-google-oauth20'
import { AuthProvider } from '@prisma/client'
import { AuthService } from '../auth.service'

// Solo se instancia (vía DI) si AuthModule decidió registrarla, es decir,
// si GOOGLE_CLIENT_ID/SECRET ya están seteadas — ver auth.module.ts.
@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(private readonly authService: AuthService) {
    super({
      clientID: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      callbackURL:
        process.env.GOOGLE_CALLBACK_URL ?? 'http://localhost:3001/v1/auth/google/callback',
      scope: ['email', 'profile'],
    })
  }

  async validate(_accessToken: string, _refreshToken: string, profile: Profile) {
    const email = profile.emails?.[0]?.value
    if (!email) throw new UnauthorizedException('La cuenta de Google no expuso un email')

    return this.authService.validateOAuthLogin(AuthProvider.GOOGLE, profile.id, {
      email,
      name: profile.displayName,
      avatarUrl: profile.photos?.[0]?.value,
    })
  }
}
