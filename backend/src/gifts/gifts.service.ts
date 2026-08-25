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
import type { User, WelcomeEbook } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import { AuditService } from '../audit/audit.service'
import { MailService } from '../mail/mail.service'
import { welcomeGiftEmailHtml } from '../mail/templates/welcome-gift.template'
import { slugify } from '../common/slugify'
import { PdfRenderService } from './pdf-render.service'
import { buildEbookDocx } from './ebook-docx.builder'
import { parseBookChapters } from './markdown-book'
import { locateChapterPages } from './pdf-chapter-locator'
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
  // No es sensible (es el nombre del archivo que subió un admin) — el frontend lo usa para
  // nombrar la descarga con su nombre real en vez de "{slug}.pdf" (ver ProfileGiftView.vue).
  fileName: true,
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
    private readonly mail: MailService,
    private readonly pdfRender: PdfRenderService
  ) {}

  // ─── Lado del usuario ──────────────────────────────────────────────────────

  /**
   * Solo títulos activos con contenido listo — `content` (Markdown, se
   * genera al reclamar, fase 2) o `fileKey` (PDF subido a mano, fase 1).
   * Visibilidad por datos: si esto devuelve `[]`, el onboarding no muestra
   * el paso y UserMenu.vue no muestra el ítem (ver
   * docs/features/welcome-ebook-gift.md).
   */
  async available() {
    return this.prisma.welcomeEbook.findMany({
      where: { active: true, OR: [{ fileKey: { not: null } }, { content: { not: null } }] },
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
    if (!ebook || !ebook.active || (!ebook.fileKey && !ebook.content)) {
      throw new NotFoundException('Ese título no está disponible')
    }

    const existing = await this.prisma.ebookClaim.findUnique({ where: { userId } })
    if (existing) throw new ConflictException('Ya elegiste tu regalo de bienvenida')

    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } })

    let claim = await this.prisma.ebookClaim.create({
      data: { userId, ebookId },
      include: { ebook: { select: AVAILABLE_SELECT } },
    })

    // `content` manda por sobre `fileKey` (ver schema) — genera un PDF
    // personalizado con dedicatoria vía Gotenberg. Si falla (Gotenberg
    // caído, etc.) el claim queda igual creado, sin `generatedFileKey`; se
    // puede reintentar con regenerate(). Nunca bloquea el regalo por un
    // proveedor externo, mismo criterio que MailService.
    if (ebook.content) {
      const generated = await this.generatePdf(ebook, user).catch((error) => {
        this.logger.error(`No se pudo generar el PDF del regalo: ${String(error)}`)
        return null
      })
      if (generated) {
        claim = await this.prisma.ebookClaim.update({
          where: { id: claim.id },
          data: generated,
          include: { ebook: { select: AVAILABLE_SELECT } },
        })
      }
    }

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

  /**
   * Arma el `.docx` del libro (`ebook-docx.builder.ts`) y lo convierte a PDF vía Gotenberg
   * (`PdfRenderService`, `forms/libreoffice/convert`), guardando el resultado en
   * storage/ebooks/generated/. Header/footer y el arranque de los capítulos en página impar los
   * resuelve Word/LibreOffice nativos al convertir (`SectionType.ODD_PAGE`) — a diferencia de la
   * Fase 2 (HTML + Chromium), no hace falta renderizar dos PDFs, unirlos con `pdf-lib`, ni contar
   * páginas a mano para decidir si insertar una hoja en blanco.
   *
   * El índice sí necesita **dos pasadas de render**: el campo `TableOfContents` nativo de `docx`
   * no se recalcula al convertir con LibreOffice headless (se probó contra Gotenberg real — a
   * diferencia de Word de escritorio, que sí lo actualiza al abrirse, queda con el título y sin
   * entradas). Por eso el índice se arma con párrafos propios y números baked-in (ver
   * `buildEbookDocx`): la primera pasada renderiza sin esos números para poder ubicar en qué
   * página cae cada capítulo (`locateChapterPages`, con matching de palabra completa — evita que
   * "Referencias" matchee dentro de "preferencias"), la segunda ya los incluye. Ver
   * docs/features/welcome-ebook-gift.md, Fase 3.
   *
   * Si Gotenberg no responde en cualquiera de las dos pasadas, devuelve `null` sin lanzar (mismo
   * criterio que el resto de la generación).
   */
  private async generatePdf(
    ebook: WelcomeEbook,
    user: User
  ): Promise<{ generatedFileKey: string; generatedFileName: string } | null> {
    const content = ebook.content ?? ''
    const docxData = {
      title: ebook.title,
      subtitle: ebook.subtitle,
      coverImage: ebook.coverImage,
      content,
      recipientName: user.name || 'nuevo miembro de NexoAT',
      recipientEmail: user.email,
      recipientProfileRole: user.profileRole,
      storeUrl: ebook.storeUrl,
    }
    const chapterTitles = parseBookChapters(content).map((c) => c.title)

    const firstPassDocx = await buildEbookDocx({ ...docxData, tocPageNumbers: null })
    const firstPassPdf = await this.pdfRender.render(firstPassDocx)
    if (!firstPassPdf) return null

    const tocPageNumbers = await locateChapterPages(firstPassPdf, chapterTitles).catch((error) => {
      this.logger.error(`No se pudo indexar las páginas del PDF: ${String(error)}`)
      return chapterTitles.map(() => null)
    })

    const finalDocx = await buildEbookDocx({ ...docxData, tocPageNumbers })
    const buffer = await this.pdfRender.render(finalDocx)
    if (!buffer) return null

    const generatedDir = join(this.dir, 'generated')
    await mkdir(generatedDir, { recursive: true })
    const generatedFileKey = `${ebook.id}-${user.id}.pdf`
    await writeFile(join(generatedDir, generatedFileKey), buffer)

    this.logger.log(`PDF generado para el regalo de ${user.email} (${buffer.length} bytes)`)
    // `generatedFileName` queda guardado a título informativo (ej. para inspeccionar el claim a
    // mano) — `openForDownload()` ya NO lo usa para nombrar la descarga, lo recalcula del título
    // actual del ebook en cada request. Guardarlo acá con el título del momento del claim y
    // servirlo tal cual más adelante hacía que la descarga quedara con el nombre del título
    // viejo si el admin editaba el ebook después (reportado por el usuario) — ver
    // docs/features/welcome-ebook-gift.md, Fase 3.
    return { generatedFileKey, generatedFileName: `${slugify(ebook.title) || ebook.slug}.pdf` }
  }

  /**
   * Reintenta la generación de un claim que se quedó sin `generatedFileKey`
   * (ej. Gotenberg estaba caído al momento del `claim()` original). No hace
   * nada si el ebook no usa `content` — ese claim nunca tuvo nada que generar.
   */
  async regenerate(claimId: string, actorId: string) {
    const claim = await this.prisma.ebookClaim.findUnique({
      where: { id: claimId },
      include: { ebook: true, user: true },
    })
    if (!claim) throw new NotFoundException('Claim no encontrado')
    if (!claim.ebook.content) {
      throw new BadRequestException(
        'Este ebook no usa contenido generado — no hay nada que rehacer'
      )
    }

    const generated = await this.generatePdf(claim.ebook, claim.user)
    if (!generated) {
      throw new BadRequestException(
        'No se pudo generar el PDF — revisá que Gotenberg esté disponible'
      )
    }

    const updated = await this.prisma.ebookClaim.update({
      where: { id: claimId },
      data: generated,
    })

    await this.audit.record({
      actorId,
      action: 'gift.claim.regenerate',
      entityType: 'EbookClaim',
      entityId: claimId,
    })

    return updated
  }

  /** Stream + nombre para la descarga; valida que el usuario haya reclamado un ebook. */
  async openForDownload(userId: string) {
    const claim = await this.prisma.ebookClaim.findUnique({
      where: { userId },
      include: { ebook: true },
    })
    if (!claim) {
      throw new NotFoundException('Todavía no elegiste tu regalo de bienvenida')
    }

    // El PDF generado (con dedicatoria) manda; si no existe, cae al PDF
    // subido a mano del ebook (fase 1) — nunca los dos a la vez.
    if (claim.generatedFileKey) {
      return {
        stream: createReadStream(join(this.dir, 'generated', claim.generatedFileKey)),
        // Nombre calculado del título ACTUAL del ebook, no `claim.generatedFileName` guardado:
        // ese campo se fija en el momento del claim()/regenerate() y queda desactualizado si el
        // admin edita el título después sin volver a regenerar — el usuario reportó justo este
        // caso (editó título/contenido de un ebook ya reclamado por otra persona y la descarga
        // seguía con el nombre del título viejo). Recalcularlo acá, en cada descarga, evita que
        // vuelva a desincronizarse pase lo que pase con el ciclo de vida del claim.
        filename: `${slugify(claim.ebook.title) || claim.ebook.slug}.pdf`,
      }
    }

    if (claim.ebook.fileKey) {
      return {
        stream: createReadStream(join(this.dir, claim.ebook.fileKey)),
        filename: claim.ebook.fileName ?? `${claim.ebook.slug}.pdf`,
      }
    }

    // El ebook usa `content` pero la generación falló y todavía no se
    // reintentó — no hay ningún archivo que servir.
    throw new NotFoundException('Tu regalo todavía se está preparando — probá de nuevo en un rato.')
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
        content: dto.content,
        storeUrl: dto.storeUrl,
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
        content: dto.content !== undefined ? dto.content || null : undefined,
        storeUrl: dto.storeUrl !== undefined ? dto.storeUrl || null : undefined,
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
