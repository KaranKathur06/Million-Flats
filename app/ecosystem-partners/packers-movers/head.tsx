import { prisma } from '@/lib/prisma'
import { buildCanonicalUrl, buildPrevNext, normalizePage } from '@/lib/ecosystem/paginationSeo'

export default async function Head({ searchParams }: { searchParams?: { page?: string } }) {
  const slug = 'packers-movers'
  const page = normalizePage(searchParams?.page)
  const take = 12

  const category = await prisma.ecosystemCategory.findUnique({ where: { slug }, select: { id: true } })
  if (!category) return null

  const total = await prisma.ecosystemPartner.count({ where: { categoryId: category.id, isActive: true } }).catch(() => 0)
  const totalPages = Math.max(1, Math.ceil(total / take))

  const canonical = buildCanonicalUrl({ slug, page })
  const { prev, next } = buildPrevNext({ slug, page, totalPages })

  return (
    <>
      <link rel="canonical" href={canonical} />
      {prev ? <link rel="prev" href={prev} /> : null}
      {next ? <link rel="next" href={next} /> : null}
    </>
  )
}
