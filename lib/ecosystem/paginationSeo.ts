export function normalizePage(page: unknown) {
  const n = typeof page === 'number' ? page : Number(page)
  if (!Number.isFinite(n) || n <= 1) return 1
  return Math.floor(n)
}

export function buildCategoryBaseUrl(slug: string) {
  return `https://millionflats.com/ecosystem-partners/${slug}`
}

export function buildCanonicalUrl(params: { slug: string; page: number }) {
  const base = buildCategoryBaseUrl(params.slug)
  return params.page <= 1 ? base : `${base}?page=${params.page}`
}

export function buildPrevNext(params: { slug: string; page: number; totalPages: number }) {
  const prevPage = params.page > 1 ? params.page - 1 : null
  const nextPage = params.page < params.totalPages ? params.page + 1 : null

  return {
    prev: prevPage ? buildCanonicalUrl({ slug: params.slug, page: prevPage }) : null,
    next: nextPage ? buildCanonicalUrl({ slug: params.slug, page: nextPage }) : null,
  }
}
