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
import {
  BOOK_PAPER_HEIGHT_IN,
  BOOK_PAPER_WIDTH_IN,
  buildContentFooterHtml,
  buildContentHeaderHtml,
  buildContentHtml,
  buildFrontMatterHtml,
} from './ebook-pdf.template'
import { parseBookChapters } from './markdown-book'
import { locateChapterPages } from './pdf-page-index'
import { countPdfPages, mergePdfs, trimTrailingBlankPage } from './pdf-merge'
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
   * Arma el PDF y guarda el resultado en storage/ebooks/generated/ (ver
   * docs/features/welcome-ebook-gift.md, sección "índice con números de
   * página reales"). El frente del libro (portada/ficha/dedicatoria/índice)
   * y el contenido (capítulos + QR) se renderizan como **dos PDFs
   * separados** y se unen al final — necesario porque el contenido lleva
   * encabezado/pie con numeración propia (arranca sola en 1, mecanismo
   * nativo de Chromium vía Gotenberg) y el frente no lleva ninguno; un
   * único documento no puede aplicar header/footer distinto por página.
   *
   * 1. Renderiza el contenido (sin depender de nada del frente).
   * 2. Busca en qué página cayó cada capítulo — esos son los números reales
   *    del índice, porque son internos al PDF de contenido mismo.
   * 3. Renderiza el frente con esos números — si el frente da un número de
   *    páginas impar (el capítulo 1 quedaría en página par al unir), se
   *    agrega una hoja en blanco y se corrige el índice sumando 1 a cada
   *    entrada (convención editorial: los capítulos arrancan en impar).
   * 4. Une frente + contenido en un solo PDF.
   *
   * Si Gotenberg no responde en cualquiera de las dos renderizaciones,
   * devuelve `null` sin lanzar (mismo criterio que el resto de la
   * generación).
   */
  private async generatePdf(
    ebook: WelcomeEbook,
    user: User
  ): Promise<{ generatedFileKey: string; generatedFileName: string } | null> {
    const pdfData = {
      title: ebook.title,
      subtitle: ebook.subtitle,
      coverImage: ebook.coverImage,
      content: ebook.content ?? '',
      recipientName: user.name || 'nuevo miembro de NexoAT',
      recipientEmail: user.email,
      storeUrl: ebook.storeUrl,
    }
    const chapterTitles = parseBookChapters(pdfData.content).map((c) => c.title)
    const paperSize = { paperWidth: BOOK_PAPER_WIDTH_IN, paperHeight: BOOK_PAPER_HEIGHT_IN }
    // Reserva espacio para encabezado/pie sin imponerle además un margen lateral —
    // ese ya lo da el padding de .page en el propio HTML.
    const pageMargins = { marginTop: 0.35, marginBottom: 0.35 }

    const contentHtml = await buildContentHtml(pdfData)
    let contentBuffer = await this.pdfRender.render(contentHtml, {
      headerHtml: buildContentHeaderHtml(ebook.title),
      footerHtml: buildContentFooterHtml(),
      ...paperSize,
      ...pageMargins,
    })
    if (!contentBuffer) return null
    contentBuffer = await trimTrailingBlankPage(contentBuffer).catch((error) => {
      this.logger.warn(`No se pudo revisar la última página del PDF: ${String(error)}`)
      return contentBuffer as Buffer
    })

    let chapterPages = await locateChapterPages(contentBuffer, chapterTitles).catch((error) => {
      this.logger.error(`No se pudo indexar las páginas del PDF: ${String(error)}`)
      return chapterTitles.map(() => null)
    })

    let frontBuffer = await this.pdfRender.render(buildFrontMatterHtml(pdfData, chapterPages), {
      ...paperSize,
    })
    if (!frontBuffer) return null
    // Mismo artefacto de Chromium que en el contenido (una página casi vacía sobrante) puede
    // pasar acá por el desborde del índice — se recorta antes de contar, para no confundirla
    // con la hoja en blanco *intencional* que se agrega más abajo por la convención de página
    // impar (esa si se deja, adrede).
    frontBuffer = await trimTrailingBlankPage(frontBuffer).catch((error) => {
      this.logger.warn(`No se pudo revisar la última página del frente del PDF: ${String(error)}`)
      return frontBuffer as Buffer
    })

    // Convención editorial: los capítulos arrancan en página impar. Si el frente mide una
    // cantidad impar de páginas, el capítulo 1 (primera página del PDF de contenido) caería
    // en página par al unir los dos — se agrega una hoja en blanco y se corrige el índice.
    const frontPageCount = await countPdfPages(frontBuffer).catch(() => null)
    if (frontPageCount != null && frontPageCount % 2 !== 0) {
      chapterPages = chapterPages.map((page) => (page == null ? null : page + 1))
      frontBuffer = await this.pdfRender.render(buildFrontMatterHtml(pdfData, chapterPages, true), {
        ...paperSize,
      })
      if (!frontBuffer) return null
    }

    const buffer = await mergePdfs([frontBuffer, contentBuffer]).catch((error) => {
      this.logger.error(`No se pudo unir el frente con el contenido del PDF: ${String(error)}`)
      return null
    })
    if (!buffer) return null

    const generatedDir = join(this.dir, 'generated')
    await mkdir(generatedDir, { recursive: true })
    const generatedFileKey = `${ebook.id}-${user.id}.pdf`
    await writeFile(join(generatedDir, generatedFileKey), buffer)

    this.logger.log(`PDF generado para el regalo de ${user.email} (${buffer.length} bytes)`)
    return { generatedFileKey, generatedFileName: `${ebook.slug}.pdf` }
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
        filename: claim.generatedFileName ?? `${claim.ebook.slug}.pdf`,
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
