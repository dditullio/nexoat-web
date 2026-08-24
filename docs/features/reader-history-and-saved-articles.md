# Historial de lectura y artículos guardados

**Estado:** implementado.

## Contexto

Continúa `reader-profile.md`: de los cuatro ítems mockeados en `UserMenu.vue`, este documento cubre los dos siguientes — **Artículos guardados** e **Historial de lectura**. "Preferencias de correo" sigue mockeado, es un plan aparte.

## Decisiones de diseño

### 1. Historial deduplicado por artículo, no un log de cada visita

"Historial de lectura" muestra **un ítem por artículo** (el más reciente arriba), no una fila nueva cada vez que se relee el mismo artículo — coincide con lo que espera un lector ("¿qué leí?", no "¿cuántas veces entré a cada cosa?") y evita que la lista crezca sin límite con reingresos al mismo artículo. Técnicamente: `@@unique([userId, articleId])` + upsert que actualiza `readAt` en cada visita.

### 2. Se registra automáticamente, sin acción explícita del lector

Igual que cualquier historial de navegación: visitar `GET /articles/:slug` ya autenticado deja el registro, sin botón ni opt-in. Se registra tanto si el artículo se ve completo como recortado (paywall) — "lo visitaste" es independiente de "tuviste acceso al contenido completo". Se engancha en `ArticlesService.findPublishedBySlug`, que ya resuelve el `viewer` vía `OptionalJwtAuthGuard` (ver `reader-accounts-and-paywall.md`) — sin viewer, no se registra nada.

### 3. Guardar SÍ es una acción explícita del lector

A diferencia del historial, "guardar" es un toggle que el lector dispara a mano — se agrega un botón en `ArticleView.vue` (junto a `ArticleShare`). Identificado por `slug` en la API (no por un id de entrada), porque es el dato que la vista de artículo ya tiene a mano: `POST/DELETE /me/saved-articles/:slug`, más `GET /me/saved-articles/:slug/status` para que el botón sepa su estado inicial al cargar la página.

### 4. Confirmación: vaciar historial completo, y quitar un guardado puntual

**"Vaciar historial completo" pide confirmación**, por ser irreversible y afectar todo de una vez. Quitar una entrada puntual del **historial** no se confirma — es de bajo costo (releer el artículo lo vuelve a dejar ahí) y perderla sin querer no tiene consecuencia real. Quitar un **guardado**, en cambio, **sí pide confirmación** — a diferencia del historial (un efecto secundario de navegar), un artículo guardado es una decisión activa del lector ("quiero volver a esto"); perderlo sin querer sí importa, porque puede no recordar cuál era ni cómo encontrarlo de nuevo. Las dos confirmaciones (vaciar historial, quitar un guardado) usan el mismo `ConfirmDialog.vue` reusable (ver punto 5). Guardados no tiene una acción de "vaciar todo" (no la pidió el alcance de este documento); si hace falta más adelante, reusa el mismo componente.

### 5. `ConfirmDialog.vue` deja de ser exclusivo del admin

Ya existía `components/admin/ConfirmDialog.vue` (`<dialog>` nativo, título + slot de contenido + tono `primary`/`danger` + estado `busy` + `error`), usado hasta ahora solo en `AdminBackupsView.vue`. Se movió a `components/ui/ConfirmDialog.vue` sin cambiar su API — es exactamente el diálogo parametrizable que pide esta funcionalidad (y cualquier confirmación futura en el sitio, admin o público).

### 6. Los ítems archivados no se muestran

Si un artículo se archiva después de haber sido leído/guardado, la fila de historial/guardados **no se muestra** (se filtra por `status: publicado` en las consultas) — evita links muertos, aunque el registro en DB no se borra (por si el artículo se vuelve a publicar).

## Schema (`backend/prisma/schema.prisma`)

```prisma
model ReadingHistoryEntry {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  articleId String
  article   Article  @relation("ReadingHistory", fields: [articleId], references: [id], onDelete: Cascade)
  readAt    DateTime @default(now())

  @@unique([userId, articleId])
  @@index([userId, readAt])
  @@map("reading_history_entries")
}

model SavedArticle {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  articleId String
  article   Article  @relation("SavedArticles", fields: [articleId], references: [id], onDelete: Cascade)
  savedAt   DateTime @default(now())

  @@unique([userId, articleId])
  @@index([userId, savedAt])
  @@map("saved_articles")
}
```

`User` suma `readingHistory ReadingHistoryEntry[]` y `savedArticles SavedArticle[]`; `Article` suma `readBy ReadingHistoryEntry[]` y `savedBy SavedArticle[]` (relaciones nombradas porque hay dos FK distintas apuntando a `Article`, Prisma exige el nombre explícito para desambiguar).

## Backend — módulo nuevo `backend/src/reader-library/`

Mismo criterio que `profile/`: rutas bajo `/me`, sin `RolesGuard`, todo colgado del `userId` del token.

| Archivo                         | Qué hace                                                                                                                                                   |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `reading-history.service.ts`    | `record(userId, articleId)` (upsert, llamado desde `ArticlesService`), `list(userId, query)` paginado, `removeOne(userId, entryId)`, `clear(userId)`.      |
| `reading-history.controller.ts` | `@Controller('me/history')`. `GET /`, `DELETE /` (vacía todo), `DELETE /:id` (una entrada).                                                                |
| `saved-articles.service.ts`     | `save(userId, slug)` (upsert, 404 si el slug no existe/no está publicado), `unsave(userId, slug)`, `status(userId, slug)`, `list(userId, query)` paginado. |
| `saved-articles.controller.ts`  | `@Controller('me/saved-articles')`. `GET /`, `GET /:slug/status`, `POST /:slug`, `DELETE /:slug`.                                                          |
| `reader-library.module.ts`      | Registra los dos controllers/services; exporta `ReadingHistoryService` (lo importa `ArticlesModule`).                                                      |

`articles/articles.service.ts` — `findPublishedBySlug` gana un parámetro más: si hay `viewer`, llama `this.readingHistory.record(viewer.id, article.id)` antes de devolver la respuesta (no bloquea la respuesta al lector si falla — se loguea y sigue).

## Frontend — archivos a crear/tocar

| Archivo                                                              | Cambio                                                                                                                                                                                    |
| -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `components/ui/ConfirmDialog.vue`                                    | Movido desde `components/admin/` (ver decisión 5), sin cambios de API. `AdminBackupsView.vue` actualiza su import.                                                                        |
| `services/history.api.ts`, `services/saved-articles.api.ts` (nuevos) | Wrappers sobre `http`.                                                                                                                                                                    |
| `types/reader-library.ts` (nuevo)                                    | `ReadingHistoryEntry`, `SavedArticleEntry` (ambos: `id`, timestamp, `article: Article` — reusa el tipo `Article` ya existente en `types/index.ts`).                                       |
| `views/ReadingHistoryView.vue` (nuevo)                               | Lista de tarjetas (reusa `ArticleCard.vue` si el layout encaja, si no una fila más compacta con fecha), botón "Quitar" por ítem (sin confirmar) y "Vaciar historial" con `ConfirmDialog`. |
| `views/SavedArticlesView.vue` (nuevo)                                | Lista de guardados, botón "Quitar" por ítem sin confirmar.                                                                                                                                |
| `views/ArticleView.vue`                                              | Botón de guardar (ícono, toggle) junto a `ArticleShare` — solo visible con sesión iniciada; `GET /me/saved-articles/:slug/status` al montar para el estado inicial.                       |
| `router/index.ts`                                                    | Rutas `/mi-cuenta/historial` y `/mi-cuenta/guardados`, `meta: { requiresAuth: true }` (mismo guard que `/mi-cuenta/perfil`).                                                              |
| `components/ui/UserMenu.vue`, `components/layout/AppHeader.vue`      | "Artículos guardados" e "Historial de lectura" dejan de estar mockeados (quedan como `RouterLink` reales); "Preferencias de correo" sigue "Pronto".                                       |

## Fuera de alcance

- "Vaciar todos los guardados" (solo se pidió para historial).
- Cualquier límite de retención automática del historial (borrado por antigüedad) — se guarda indefinidamente hasta que el lector lo vacíe a mano.

## Plan de verificación

1. Test de backend: `record()` en el mismo artículo dos veces → sigue habiendo una sola fila, con `readAt` actualizado (no duplica).
2. Test de backend: `save()` en un slug inexistente/no publicado → 404, sin crear fila.
3. Test de backend: `save()` dos veces sobre el mismo artículo → idempotente, sigue siendo una fila.
4. Manual: visitar 2-3 artículos con sesión iniciada → aparecen en `/mi-cuenta/historial`, más reciente primero; visitar un tercer artículo → se remueve un ítem individual y **no** desaparece el resto; "Vaciar historial" pide confirmación vía `ConfirmDialog` y, tras confirmar, la lista queda vacía.
5. Manual: guardar un artículo desde `ArticleView.vue` → aparece en `/mi-cuenta/guardados`; quitar el guardado desde `/mi-cuenta/guardados` pide confirmación (`ConfirmDialog`) y recién borra al confirmar; quitarlo directo desde el propio artículo (el botón toggle) no confirma; en ambos casos el estado del botón de `ArticleView.vue` refleja el cambio tras recargar.
6. Manual: sin sesión, visitar un artículo no deja rastro en el historial de nadie; los endpoints `/me/history` y `/me/saved-articles` devuelven 401.
