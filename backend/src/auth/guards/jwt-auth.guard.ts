import { Injectable } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'

/** Exige un access token válido (`Authorization: Bearer ...`). */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
