import EcosystemPartnerDirectoryClient, {
  type EcosystemPartnerCard,
} from '@/components/ecosystem/EcosystemPartnerDirectoryClient'
import { getEcosystemCategoryConfig } from '@/lib/ecosystem/categoryConfig'
import { fetchPublicPartners } from '@/lib/ecosystem/fetchPublicPartners'
import type { EcosystemCategorySlug } from '@/lib/ecosystemPartners'

function safeNumber(v: unknown) {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  return null
}

type Props = {
  categorySlug: EcosystemCategorySlug
  page?: number
  take?: number
  featuredOnly?: boolean
  /** Wrap in custom section shell — when false, only the client directory renders */
  showShell?: boolean
  title?: string
  subtitle?: string
  className?: string
  id?: string
}

/** CMS-driven partner directory — inject into bespoke category pages without replacing page design. */
export default async function EcosystemPartnerDirectorySection({
  categorySlug,
  page = 1,
  take = 12,
  featuredOnly,
  showShell = true,
  title,
  subtitle,
  className = 'bg-white py-24 border-y border-slate-200',
  id = 'directory',
}: Props) {
  const cfg = getEcosystemCategoryConfig(categorySlug)
  if (!cfg) return null

  const pageSafe = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1

  const { items, total, hasMore } = await fetchPublicPartners({
    categorySlug,
    page: pageSafe,
    take,
    featuredOnly,
  })

  const partners: EcosystemPartnerCard[] = items.map((p) => ({
    id: String(p.id),
    name: String(p.name),
    slug: p.slug ?? null,
    logo: p.logo ?? null,
    coverImage: p.coverImage ?? null,
    shortDescription: p.shortDescription ?? null,
    rating: safeNumber(p.rating),
    yearsExperience: safeNumber(p.yearsExperience),
    projectsCompleted: safeNumber(p.projectsCompleted),
    locationCoverage: p.locationCoverage ?? null,
    pricingRange: p.pricingRange ?? null,
    isFeatured: Boolean(p.isFeatured),
    isVerified: Boolean(p.isVerified),
  }))

  const directory = (
    <EcosystemPartnerDirectoryClient
      partners={partners}
      slug={cfg.slug}
      categoryTitle={cfg.title}
      initialPage={pageSafe}
      take={take}
      total={total}
      hasMore={hasMore}
    />
  )

  if (!showShell) return directory

  return (
    <section id={id} className={className}>
      <div className="mx-auto max-w-[1240px] px-4 sm:px-6 lg:px-8">
        {(title || subtitle) && (
          <div className="mb-8">
            {title ? (
              <h2 className="text-3xl font-sans font-extrabold text-[#111827] tracking-tight">{title}</h2>
            ) : null}
            {subtitle ? <p className="text-slate-500 font-medium mt-2">{subtitle}</p> : null}
          </div>
        )}
        {directory}
      </div>
    </section>
  )
}
