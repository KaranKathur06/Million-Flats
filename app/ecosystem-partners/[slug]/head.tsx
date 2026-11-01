import { prisma } from '@/lib/prisma'
import { buildCanonicalUrl, buildPrevNext, normalizePage } from '@/lib/ecosystem/paginationSeo'
import { getAuthenticatedEcosystemUser } from '@/lib/ecosystem/auth'

export default async function Head({
  params,
  searchParams,
}: {
  params: { slug: string }
  searchParams?: { page?: string }
}) {
  const page = normalizePage(searchParams?.page)
  const take = 12

  const category = await (prisma as any).ecosystemCategory.findFirst({
    where: { slug: params.slug, isActive: true },
    select: { id: true },
  })
  if (!category) return null

  const user = await getAuthenticatedEcosystemUser()
  const total = user
    ? await (prisma as any).ecosystemPartner.count({
        where: { categoryId: category.id, status: 'APPROVED', isActive: true },
      })
    : 0
  const totalPages = Math.max(1, Math.ceil(total / take))

  const canonical = buildCanonicalUrl({ slug: params.slug, page })
  const { prev, next } = buildPrevNext({ slug: params.slug, page, totalPages })

  return (
    <>
      <link rel="canonical" href={canonical} />
      {prev ? <link rel="prev" href={prev} /> : null}
      {next ? <link rel="next" href={next} /> : null}
    </>
  )
}
