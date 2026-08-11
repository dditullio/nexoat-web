import { Injectable } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'

/** Valida email+contraseña contra `LocalStrategy` y deja el user en `req.user`. */
@Injectable()
export class LocalAuthGuard extends AuthGuard('local') {}
