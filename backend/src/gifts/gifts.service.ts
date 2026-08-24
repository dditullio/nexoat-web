import { createReadStream } from 'node:fs'
import { mkdir, unlink, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { AuditService } from '../audit/audit.service'
import { MailService } from '../mail/mail.service'
import { welcomeGiftEmailHtml } from '../mail/templates/welcome-gift.template'
import { slugify } from '../common/slugify'
import type { CreateGiftDto } from './dto/create-gift.dto'
import type { UpdateGiftDto } from './dto/update-gift.dto'

/** 25MB — un ebook con tapa e imágenes livianas entra de sobra. */
export const MAX_EBOOK_FILE_SIZE_BYTES = 25 * 1024 * 1024
export const ALLOWED_EBOOK_MIME_TYPES = new Set(['application/pdf'])

const AVAILABLE_SELECT = {
  id: true,
  title: true,
  subtitle: true,
  slug: true,
  topic: true,
  summary: true,
  coverImage: true,
} as const

function frontendUrl(): string {
  return process.env.FRONTEND_URL ?? 'http://localhost:3000'
}

@Injectable()
export class GiftsService {
  private readonly logger = new Logger(GiftsService.name)
  /** `process.cwd()` es `backend/` — mismo criterio que BackupService. */
  private readonly dir = process.env.EBOOKS_DIR
    ? resolve(process.env.EBOOKS_DIR)
    : resolve(process.cwd(), 'storage', 'ebooks')

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly mail: MailService
  ) {}

  // ─── Lado del usuario ──────────────────────────────────────────────────────

  /**
   * Solo títulos activos y con PDF ya cargado — visibilidad por datos: si
   * esto devuelve `[]`, el onboarding no muestra el paso y UserMenu.vue no
   * muestra el ítem (ver docs/features/welcome-ebook-gift.md).
   */
  async available() {
    return this.prisma.welcomeEbook.findMany({
      where: { active: true, fileKey: { not: null } },
      select: AVAILABLE_SELECT,
      orderBy: { createdAt: 'asc' },
    })
  }

  async myClaim(userId: string) {
    const claim = await this.prisma.ebookClaim.findUnique({
      where: { userId },
      include: { ebook: { select: AVAILABLE_SELECT } },
    })
    return claim
  }

  /** Un usuario reclama un solo ebook — segundo intento devuelve 409, no lo pisa. */
  async claim(userId: string, ebookId: string) {
    const ebook = await this.prisma.welcomeEbook.findUnique({ where: { id: ebookId } })
    if (!ebook || !ebook.active || !ebook.fileKey) {
      throw new NotFoundException('Ese título no está disponible')
    }

    const existing = await this.prisma.ebookClaim.findUnique({ where: { userId } })
    if (existing) throw new ConflictException('Ya elegiste tu regalo de bienvenida')

    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } })

    const claim = await this.prisma.ebookClaim.create({
      data: { userId, ebookId },
      include: { ebook: { select: AVAILABLE_SELECT } },
    })

    // No bloquea el claim si Resend falla — mismo criterio que
    // NewsletterService.subscribe(): el usuario ya puede descargar desde
    // /mi-cuenta/regalo aunque el correo no haya salido.
    await this.mail
      .send(
        user.email,
        'Tu regalo de bienvenida está listo 🎁',
        welcomeGiftEmailHtml(ebook.title, `${frontendUrl()}/mi-cuenta/regalo`)
      )
      .catch((error) => this.logger.error(`No se pudo enviar el email de regalo: ${String(error)}`))

    return claim
  }

  /** Stream + nombre para la descarga; valida que el usuario haya reclamado un ebook. */
  async openForDownload(userId: string) {
    const claim = await this.prisma.ebookClaim.findUnique({
      where: { userId },
      include: { ebook: true },
    })
    if (!claim || !claim.ebook.fileKey) {
      throw new NotFoundException('Todavía no elegiste tu regalo de bienvenida')
    }

    const path = join(this.dir, claim.ebook.fileKey)
    return {
      stream: createReadStream(path),
      filename: claim.ebook.fileName ?? `${claim.ebook.slug}.pdf`,
    }
  }

  // ─── Admin ──────────────────────────────────────────────────────────────

  async findAllAdmin() {
    return this.prisma.welcomeEbook.findMany({ orderBy: { createdAt: 'asc' } })
  }

  private async findOneOrThrow(id: string) {
    const ebook = await this.prisma.welcomeEbook.findUnique({ where: { id } })
    if (!ebook) throw new NotFoundException('Ebook no encontrado')
    return ebook
  }

  async create(dto: CreateGiftDto, actorId: string) {
    const slug = slugify(dto.title)
    if (!slug) throw new BadRequestException('No se pudo derivar un slug válido del título')

    const clash = await this.prisma.welcomeEbook.findUnique({ where: { slug } })
    if (clash) throw new ConflictException(`Ya existe un ebook con el slug "${slug}"`)

    const ebook = await this.prisma.welcomeEbook.create({
      data: {
        slug,
        title: dto.title,
        subtitle: dto.subtitle,
        topic: dto.topic,
        summary: dto.summary,
        active: dto.active ?? true,
      },
    })

    await this.audit.record({
      actorId,
      action: 'gift.create',
      entityType: 'WelcomeEbook',
      entityId: ebook.id,
    })

    return ebook
  }

  /**
   * `coverImage`/`coverImagePublicId` siguen el mismo contrato que
   * UpdateCategoryDto: el frontend sube la imagen aparte contra el
   * endpoint genérico `/admin/media?folder=ebook-covers` (ver
   * AdminCategoriesView.vue) y manda acá la URL/publicId resultantes —
   * `undefined` no toca el campo, `''` lo limpia.
   */
  async update(id: string, dto: UpdateGiftDto, actorId: string) {
    await this.findOneOrThrow(id)

    const ebook = await this.prisma.welcomeEbook.update({
      where: { id },
      data: {
        title: dto.title,
        subtitle: dto.subtitle,
        topic: dto.topic,
        summary: dto.summary,
        active: dto.active,
        coverImage: dto.coverImage !== undefined ? dto.coverImage || null : undefined,
        coverImagePublicId:
          dto.coverImagePublicId !== undefined ? dto.coverImagePublicId || null : undefined,
      },
    })

    await this.audit.record({
      actorId,
      action: 'gift.update',
      entityType: 'WelcomeEbook',
      entityId: id,
    })

    return ebook
  }

  async uploadFile(id: string, buffer: Buffer, originalFilename: string, actorId: string) {
    await this.findOneOrThrow(id)

    await mkdir(this.dir, { recursive: true })
    const fileKey = `${id}.pdf`
    await writeFile(join(this.dir, fileKey), buffer)

    const ebook = await this.prisma.welcomeEbook.update({
      where: { id },
      data: { fileKey, fileName: originalFilename },
    })

    this.logger.log(`PDF cargado para el ebook ${id} (${buffer.length} bytes)`)

    await this.audit.record({
      actorId,
      action: 'gift.file.upload',
      entityType: 'WelcomeEbook',
      entityId: id,
      metadata: { originalFilename, sizeBytes: buffer.length },
    })

    return ebook
  }

  /**
   * Quita el PDF sin borrar el título (vuelve a "cargado pero sin archivo" —
   * lo saca de la lista de disponibles hasta que se suba uno nuevo). No
   * afecta a `EbookClaim` existentes, que quedarían sin poder descargar
   * hasta que se resuba — pensado para corregir un archivo mal cargado, no
   * para uso rutinario.
   */
  async removeFile(id: string, actorId: string) {
    const existing = await this.findOneOrThrow(id)
    if (existing.fileKey) {
      await unlink(join(this.dir, existing.fileKey)).catch(() => undefined)
    }

    const ebook = await this.prisma.welcomeEbook.update({
      where: { id },
      data: { fileKey: null, fileName: null },
    })

    await this.audit.record({
      actorId,
      action: 'gift.file.remove',
      entityType: 'WelcomeEbook',
      entityId: id,
    })

    return ebook
  }
}
