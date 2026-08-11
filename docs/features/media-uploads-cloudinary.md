# Subida de imágenes de portada vía Cloudinary

**Estado:** documentado e implementado en esta misma sesión.

## Contexto

`Article.coverImage` es un `String?` con una URL pegada a mano en el formulario del admin — quien escribe el artículo tiene que subir la imagen a algún lado por su cuenta y copiar el link. Se decidió usar [Cloudinary](https://cloudinary.com) (plan gratuito, ~25GB storage + bandwidth/mes) como hosting de imágenes, y automatizar subida/reemplazo/borrado directo desde `AdminArticleFormView.vue`.

Ver conversación previa en este chat para la comparación de alternativas (ImageKit, Cloudflare R2) — se eligió Cloudinary por la fricción cero de arranque (cuenta gratis, sin tarjeta) y porque el SDK server-side de Node es simple.

## Decisión de arquitectura: subida vía backend, no navegador→Cloudinary directo

Dos formas comunes de integrar Cloudinary:

1. **Upload preset "unsigned"**: el navegador sube directo a Cloudinary con un preset público, sin tocar el backend.
2. **Subida vía backend** (elegida acá): el navegador manda el archivo a un endpoint propio (`multipart/form-data`), el backend lo reenvía a Cloudinary usando el SDK server-side con el API secret.

Se eligió la opción 2 por dos razones:

- **Borrado real.** Borrar un asset en Cloudinary requiere el API secret (o una firma generada con él) — con un preset unsigned el navegador no puede borrar nada, solo subir. Como el requisito explícito era que "Borrar imagen" en el admin borre de verdad en Cloudinary (no solo desvincule la URL del artículo), el backend tiene que ser quien pida el borrado.
- **Control de acceso.** El endpoint de subida queda protegido igual que el resto del admin (`JwtAuthGuard` + `RolesGuard`, `EDITOR+`) — nadie fuera del admin puede subir a la cuenta de Cloudinary del proyecto.

## Cambios de schema (`backend/prisma/schema.prisma`)

Se agrega un campo al modelo `Article` ya existente:

```prisma
model Article {
  // ...campos existentes sin cambios...
  coverImage         String?
  coverImagePublicId String? // ID de Cloudinary — necesario para poder borrar esa imagen puntual
}
```

`coverImagePublicId` no se expone en la lectura pública del artículo (`toPublicArticleSummary`/`toPublicArticleFull`) — solo en la forma admin (`toAdminArticle`), porque el público no tiene por qué saber el ID interno de Cloudinary.

## Backend (`backend/src/media/`) — módulo nuevo

| Endpoint                           | Qué hace                                                                                                                                                                                                                                                           |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `POST /admin/media`                | `multipart/form-data`, campo `file`. `@Roles(EDITOR, ADMIN, SUPER_ADMIN)`. Valida MIME (`image/jpeg`, `image/png`, `image/webp`, `image/gif`) y tamaño (máx. 5MB) antes de subir. Sube a Cloudinary en la carpeta `nexoat/articles`, devuelve `{ url, publicId }`. |
| `DELETE /admin/media?publicId=...` | `@Roles(EDITOR, ADMIN, SUPER_ADMIN)`. Borra el asset de Cloudinary. `publicId` va en el querystring (no en el path) porque los public IDs de Cloudinary incluyen `/` por la carpeta (`nexoat/articles/xyz`), lo que rompería un param de ruta simple.              |

`MediaService` envuelve el SDK `cloudinary` (`v2.uploader.upload` con un data URI en base64 / `v2.uploader.destroy`). Config leída de `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` (ya en `.env` local, agregadas a `.env.example`).

**Por qué data URI y no `upload_stream`:** la primera implementación usaba `v2.uploader.upload_stream` (variante streaming del SDK). En este entorno de desarrollo esa variante se cuelga hasta hacer timeout del lado del SDK, incluso con credenciales correctas — se confirmó a mano probando ambos métodos contra la API real de Cloudinary desde un script standalone y desde el proceso del backend. El archivo ya está entero en memoria de todos modos (tope de 5MB), así que no hay ninguna ventaja real en streamearlo — se cambió a `v2.uploader.upload(dataUri, ...)`, que sube el buffer completo en un solo request.

`@fastify/multipart` se registra en `main.ts` para poder recibir el archivo.

No hay borrado automático server-side al reemplazar `coverImage` en `PATCH /admin/articles/:id` — el frontend es quien orquesta "subir la nueva → borrar la vieja" antes de guardar el artículo, para no acoplar `ArticlesService` a Cloudinary.

## Frontend (`frontend/src`) — archivos a tocar

| Archivo                                | Qué hace                                                                                                                                                                                                                                                                                                                                                 |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `services/admin/media.api.ts` (nuevo)  | `uploadMedia(file): Promise<{ url, publicId }>`, `deleteMedia(publicId): Promise<void>`.                                                                                                                                                                                                                                                                 |
| `types/admin.ts`                       | `AdminArticle`/`ArticleFormPayload` suman `coverImagePublicId?: string`.                                                                                                                                                                                                                                                                                 |
| `views/admin/AdminArticleFormView.vue` | El input de texto "Imagen de portada (URL)" se reemplaza por: preview de la imagen actual (si hay), file picker que sube apenas se elige un archivo, estado "Subiendo…", botón "Quitar imagen". Al reemplazar una imagen ya existente, primero sube la nueva y recién si eso sale bien borra la vieja (para no quedarse sin ninguna si la subida falla). |

## Plan de verificación

1. `pnpm --filter @nexoat/backend db:migrate` → confirmar columna `coverImagePublicId` en `articles`.
2. Subir una imagen desde el formulario → confirmar que aparece en el dashboard de Cloudinary (carpeta `nexoat/articles`) y que la URL devuelta se ve en el preview y en el artículo publicado.
3. Reemplazar la imagen por otra → confirmar que la vieja desaparece de Cloudinary y solo queda la nueva.
4. "Quitar imagen" → confirmar que se borra de Cloudinary y el artículo queda sin portada.
5. Confirmar que un archivo no-imagen o de más de 5MB es rechazado con un mensaje claro, sin llegar a pegarle a Cloudinary.
6. Confirmar que un usuario sin rol `EDITOR+` recibe 403 en ambos endpoints.
