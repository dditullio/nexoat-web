// Mismo patrón que el `paginate` local de articles.service.ts — cada módulo
// tiene el suyo (no hay un util compartido en el proyecto todavía), se
// repite acá en vez de acoplar reader-library a articles por una función de
// 4 líneas.
export function paginate(
  page?: number,
  pageSize?: number,
  maxPageSize = 100,
  defaultPageSize = 20
) {
  const safePage = page && page > 0 ? page : 1
  const safePageSize = pageSize && pageSize > 0 ? Math.min(pageSize, maxPageSize) : defaultPageSize
  return { page: safePage, pageSize: safePageSize, skip: (safePage - 1) * safePageSize }
}
