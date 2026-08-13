# Configuración del sitio: niveles de artículo visibles al público

**Estado:** implementado y verificado.

## Contexto

El sitio todavía no tiene forma de cobrar ni de asignar suscripciones pagas (`SubscriptionTier.nivel_2`/`nivel_3` existen en el schema pero nada los asigna, ver [`reader-accounts-and-paywall.md`](reader-accounts-and-paywall.md)). Mientras tanto, los artículos con `scope` `suscriptores_nivel_1/2/3` aparecían igual en los listados públicos y, al abrirlos, se mostraban recortados en el marcador `<!--corte-->` — dando la sensación de contenido roto/incompleto para cualquier visitante, ya que nadie puede todavía "desbloquearlos" pagando.

Se pidió una sección **Configuración** en el admin (`/nexoat-admin/configuracion`) para poder prender/apagar a voluntad, por nivel, si esos artículos se muestran en el sitio público — sin tocar código ni redeployar. `publico` no es togglable: siempre se muestra.

## Decisión de arquitectura: tabla singleton, no una fila por setting

Se evaluaron dos formas de guardar esta configuración:

1. **Key-value genérico** (`Setting { key, value: Json }`): máxima flexibilidad para settings futuros, pero sin tipado ni validación de schema — cualquier lectura necesita parsear/castear el JSON a mano.
2. **Fila única tipada** (elegida): un modelo `SiteSettings` con una sola fila de id fijo `"singleton"` (forzado en `SettingsService`, nunca se crea una segunda), con una columna por setting. Tipado end-to-end vía Prisma, cero parseo.

Se eligió la opción 2 porque hoy hay un solo setting real y la ganancia de flexibilidad del key-value no compensa perder el tipado — si en el futuro se suman más configuraciones de sitio, se agregan como columnas nuevas a la misma fila (una migración chica), o recién ahí se reconsidera un modelo key-value si la cantidad lo justifica.

## Schema (`backend/prisma/schema.prisma`)

```prisma
model SiteSettings {
  id                   String         @id @default("singleton")
  visibleArticleScopes ArticleScope[] @default([suscriptores_nivel_1])
  updatedAt            DateTime       @updatedAt

  @@map("site_settings")
}
```

- `visibleArticleScopes` guarda **solo** los niveles de suscripción prendidos (`suscriptores_nivel_1/2/3`) — `publico` nunca aparece en la lista porque no es togglable, siempre se lo suma en el borde (`SettingsService.getVisiblePublicScopes`).
- Default (`[suscriptores_nivel_1]`): nivel 1 visible (es al que ya accede cualquier cuenta gratuita registrada, así que no cambia el comportamiento para ese público), nivel 2 y 3 apagados — que es exactamente el pedido original ("evitar que se muestren los de nivel más elevado").
- Migración: `20260813220855_add_site_settings`.

## Backend (`backend/src/settings/`) — módulo nuevo

| Endpoint                | Qué hace                                                                                                                                        |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /admin/settings`   | `@Roles(ADMIN, SUPER_ADMIN)`. Devuelve la fila singleton (la crea con los defaults del schema si todavía no existe).                            |
| `PATCH /admin/settings` | `@Roles(ADMIN, SUPER_ADMIN)`. Body `{ visibleArticleScopes: ArticleScope[] }`. Guarda, audita `settings.update` y devuelve la fila actualizada. |

Solo `ADMIN`+ (no `EDITOR`): es configuración de todo el sitio público, no edición de contenido — misma franja de permisos que usuarios/auditoría, no la de artículos/categorías.

`SettingsService.getVisiblePublicScopes()` es el método que consume `ArticlesModule` — devuelve siempre `['publico', ...visibleArticleScopes]`. `ArticlesModule` importa `SettingsModule` para inyectarlo en `ArticlesService`.

## Enforcement en `ArticlesService` (el cambio de comportamiento real)

- **`findPublished` (listado público):** el `where.scope` ahora es `{ in: <scopes visibles> }` en vez del scope crudo del filtro. Si se pide explícitamente un `scope` que está apagado, el resultado es `{ in: [] }` (lista vacía, no se cae a mostrar otro scope que no se pidió).
- **`findPublishedBySlug` (detalle público):** si el artículo encontrado tiene un `scope` que no está en la lista visible, se lanza `NotFoundException` — **igual que si el artículo no existiera**. Es una decisión deliberada: no es un recorte adicional (`isTruncated`/`<!--corte-->`), es ocultamiento total, porque el pedido explícito era "evitar que se muestren", no "mostrar más recortado todavía".
- Estos dos métodos son los únicos que filtran por esta configuración — el admin (`findAllAdmin`/`findOneAdmin`, usados por `/nexoat-admin/articulos`) sigue viendo y editando todos los artículos sin importar la configuración, para que un `EDITOR`/`ADMIN` pueda seguir gestionando contenido de niveles apagados.

## Frontend

| Archivo                                       | Qué hace                                                                                                                                                                      |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `services/admin/settings.api.ts` (nuevo)      | `getSiteSettings()`, `updateVisibleArticleScopes(scopes)`.                                                                                                                    |
| `types/admin.ts`                              | Suma `SiteSettings`.                                                                                                                                                          |
| `views/admin/AdminSettingsView.vue` (nuevo)   | Un switch por nivel (1/2/3) con descripción corta, botón "Guardar cambios" habilitado solo si hay cambios sin guardar (comparación de sets).                                  |
| `layouts/AdminLayout.vue` + `router/index.ts` | Nuevo ítem "Configuración" en el nav (`/nexoat-admin/configuracion`), visible solo para `ADMIN`/`SUPER_ADMIN`, mismo patrón que el resto de las rutas admin (`meta.minRole`). |

## Plan de verificación

1. `pnpm --filter @nexoat/backend db:migrate` → confirmar la tabla `site_settings` con una fila default una vez que `GET /admin/settings` se llama por primera vez.
2. Con la config default (`[suscriptores_nivel_1]`): un artículo `nivel_2` publicado no aparece en `GET /articles` ni se puede abrir por `GET /articles/:slug` (404), pero sí sigue apareciendo en `GET /admin/articles`.
3. Desde `/nexoat-admin/configuracion`, prender "Nivel 2" y guardar → el mismo artículo vuelve a aparecer en el listado público (recortado en el marcador, como corresponde para un visitante sin acceso).
4. Confirmar que `EDITOR` no puede entrar a `/nexoat-admin/configuracion` ni pegarle a `GET/PATCH /admin/settings` (403).
5. Confirmar que el nav no muestra "Configuración" para roles debajo de `ADMIN`.
