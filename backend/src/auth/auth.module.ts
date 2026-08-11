import { Module, type Provider, type Type } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'
import { PassportModule } from '@nestjs/passport'
import { AuthController } from './auth.controller'
import { AuthService } from './auth.service'
import { JwtStrategy } from './strategies/jwt.strategy'
import { LocalStrategy } from './strategies/local.strategy'
import { GoogleStrategy } from './strategies/google.strategy'
import { FacebookStrategy } from './strategies/facebook.strategy'
import { GoogleAuthController } from './google-auth.controller'
import { FacebookAuthController } from './facebook-auth.controller'
import { RefreshTokenGuard } from './guards/refresh-token.guard'

// Evaluado al importar este archivo (antes de que Nest instancie nada),
// por eso `main.ts` precarga `.env` con `import 'dotenv/config'` como su
// primerísima línea: sin eso, estas variables todavía no existirían acá.
const googleEnabled = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)
const facebookEnabled = Boolean(
  process.env.FACEBOOK_CLIENT_ID && process.env.FACEBOOK_CLIENT_SECRET
)

const oauthControllers: Type<unknown>[] = [
  ...(googleEnabled ? [GoogleAuthController] : []),
  ...(facebookEnabled ? [FacebookAuthController] : []),
]

const oauthProviders: Provider[] = [
  ...(googleEnabled ? [GoogleStrategy] : []),
  ...(facebookEnabled ? [FacebookStrategy] : []),
]

@Module({
  imports: [PassportModule, JwtModule.register({})],
  controllers: [AuthController, ...oauthControllers],
  providers: [AuthService, JwtStrategy, LocalStrategy, RefreshTokenGuard, ...oauthProviders],
  exports: [AuthService],
})
export class AuthModule {}
