# Imagen de portada por categoría

**Estado:** documentado e implementado en esta misma sesión.

## Contexto

Las tarjetas de categoría (home, grilla de 10 temas) y el encabezado de `CategoryView.vue` mostraban siempre el mismo patrón: un glifo con las iniciales sobre un degradado de color por categoría (`CATEGORY_THEMES`, en `frontend/src/utils/theme.ts`). Se pidió poder poner una foto real por categoría, con el mismo criterio ya usado para portadas de artículo: foto si existe, degradado como fallback si no.

A diferencia de los artículos, las categorías **no tenían ninguna pantalla de administración** — son un set fijo (10 al momento de esta feature, 13 desde `new-categories-batch-1.md`), cargadas una sola vez por `backend/prisma/seed.ts`, y el modelo `Category` no tenía campo de imagen. Se decidió el alcance completo (recomendado, confirmado por el usuario): agregar el campo, un endpoint admin para editarlo, y una pantalla nueva en `/nexoat-admin/categorias` — sin agregar alta/baja de categorías, que sigue sin existir y está fuera de alcance de este pedido.

## Cambios de schema (`backend/prisma/schema.prisma`)

```prisma
model Category {
  // ...campos existentes sin cambios...
  coverImage         String?
  coverImagePublicId String? // ID de Cloudinary — necesario para poder borrar esa imagen puntual
}
```

Mismo patrón que `Article.coverImage`/`coverImagePublicId` (ver `docs/features/media-uploads-cloudinary.md`). Migración: `prisma/migrations/20260812004152_add_category_cover_image/`.

## Cloudinary: una carpeta por tipo de imagen

`MediaService` (antes hardcodeado a `nexoat/articles`) ahora acepta un `folder: 'articles' | 'categories'` en `upload()`, y `delete()` valida el publicId contra cualquiera de las carpetas del proyecto (`nexoat/articles/…` o `nexoat/categories/…`), no solo una. `POST /admin/media?folder=categories` selecciona la carpeta; el default sin el query param sigue siendo `articles`, así que el flujo de portada de artículo no cambió.

`MediaController` valida `folder` contra la lista blanca (`MEDIA_FOLDERS`) y rechaza cualquier otro valor con 400.

## Backend — `AdminCategoriesController` (`backend/src/articles/admin-categories.controller.ts`)

Vive junto a `CategoriesController` público (mismo módulo, mismo patrón liviano sin service propio — acceso directo a Prisma, como ya hacía el controller público).

| Endpoint                      | Qué hace                                                                                                                                                                                                                                                                                                               |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /admin/categories`       | Listado con `coverImage`/`coverImagePublicId` incluidos (el público no los expone salvo `coverImage`, ver abajo). `EDITOR+`.                                                                                                                                                                                           |
| `PATCH /admin/categories/:id` | Solo acepta `coverImage`/`coverImagePublicId` (`UpdateCategoryDto`) — no hay edición de nombre/slug/descripción todavía. `EDITOR+`. Un string vacío limpia el campo (`null` en la base); omitir la clave no la toca — así el frontend puede limpiar solo `coverImage` sin tocar `coverImagePublicId` si hiciera falta. |

`GET /categories` (público) ahora también selecciona `coverImage` — sigue sin exponer `coverImagePublicId` (privado, solo para poder borrar desde el admin).

Cada `PATCH` deja un `AuditLog` (`category.update`), igual que las mutaciones de artículos.

## Frontend

| Archivo                                                                            | Qué hace                                                                                                                                                                                                                                                                                                                                                        |
| ---------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `types/index.ts` (`Category`), `stores/blog.ts`                                    | Suman `coverImage?: string`. El store ya mergea `CategoryMeta` (viene de `GET /categories`) con `CATEGORY_THEMES` — no hizo falta tocar la lógica de merge, `coverImage` viaja solo.                                                                                                                                                                            |
| `services/admin/media.api.ts`                                                      | `uploadMedia(file, folder = 'articles')` — nuevo segundo parámetro opcional, retrocompatible con el flujo de portada de artículo.                                                                                                                                                                                                                               |
| `services/admin/categories.api.ts` (nuevo)                                         | `listAdminCategories()`, `updateCategoryImage(id, { coverImage, coverImagePublicId })`.                                                                                                                                                                                                                                                                         |
| `types/admin.ts` (`AdminCategory`)                                                 | Forma de `GET /admin/categories`.                                                                                                                                                                                                                                                                                                                               |
| `views/admin/AdminCategoriesView.vue` (nuevo)                                      | Grilla de las 10 categorías con preview/upload/quitar por cada una — mismo patrón visual que el file picker de portada de artículo. Sube primero, recién si sale bien hace el `PATCH`; "Quitar" hace `PATCH` con strings vacíos y después borra de Cloudinary (mismo orden que el flujo de artículo: nunca te quedás sin nada si algo falla a mitad de camino). |
| `router/index.ts`, `layouts/AdminLayout.vue`, `views/admin/AdminDashboardView.vue` | Ruta `/nexoat-admin/categorias` (`EDITOR+`, mismo rol que artículos), link de nav y tarjeta de acceso rápido. Ícono nuevo `components/admin/icons/IconImage.vue`.                                                                                                                                                                                               |
| `components/blog/CategoryCard.vue`                                                 | Si `category.coverImage` existe, la tarjeta pasa a foto de fondo (con scrim inferior, texto claro) en vez de glifo+color; si no, layout idéntico al de antes.                                                                                                                                                                                                   |
| `views/CategoryView.vue`                                                           | Mismo criterio en el encabezado: banner con la foto + scrim en vez del blob de color difuso, cuando la categoría tiene `coverImage`.                                                                                                                                                                                                                            |

## Plan de verificación

1. `GET /admin/categories` devuelve las 10 categorías con `coverImage`/`coverImagePublicId` (`undefined` hasta que se cargue alguna).
2. Subir una imagen desde `/nexoat-admin/categorias` → aparece en Cloudinary bajo `nexoat/categories/`, se refleja en la tarjeta de esa categoría en la home y en el encabezado de su página de listado.
3. "Quitar imagen" → desaparece de Cloudinary y la categoría vuelve al fallback de degradado + glifo en todos lados.
4. Categorías sin imagen cargada siguen mostrando el fallback sin cambios visuales respecto a antes de esta feature.
5. Verificado en esta sesión con una subida y un borrado reales contra Cloudinary (no solo mock) — confirmado por DOM en home, `CategoryView` y la pantalla admin.
