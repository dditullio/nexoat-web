import { Injectable, UnauthorizedException } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { Strategy, type Profile } from 'passport-facebook'
import { AuthProvider } from '@prisma/client'
import { AuthService } from '../auth.service'

// Solo se instancia (vía DI) si AuthModule decidió registrarla, es decir,
// si FACEBOOK_CLIENT_ID/SECRET ya están seteadas — ver auth.module.ts.
@Injectable()
export class FacebookStrategy extends PassportStrategy(Strategy, 'facebook') {
  constructor(private readonly authService: AuthService) {
    super({
      clientID: process.env.FACEBOOK_CLIENT_ID!,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET!,
      callbackURL:
        process.env.FACEBOOK_CALLBACK_URL ?? 'http://localhost:3001/v1/auth/facebook/callback',
      profileFields: ['id', 'emails', 'name', 'displayName', 'photos'],
    })
  }

  async validate(_accessToken: string, _refreshToken: string, profile: Profile) {
    const email = profile.emails?.[0]?.value
    if (!email) throw new UnauthorizedException('La cuenta de Facebook no expuso un email')

    return this.authService.validateOAuthLogin(AuthProvider.FACEBOOK, profile.id, {
      email,
      name: profile.displayName,
      avatarUrl: profile.photos?.[0]?.value,
    })
  }
}
