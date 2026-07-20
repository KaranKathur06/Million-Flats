import { notFound } from 'next/navigation'
import Script from 'next/script'
import { existsSync } from 'fs'
import { join } from 'path'
import EcosystemPartnerDirectoryClient, {
  type EcosystemPartnerCard,
} from '@/components/ecosystem/EcosystemPartnerDirectoryClient'
import EcosystemFeaturedPartnersSection from '@/components/ecosystem/EcosystemFeaturedPartnersSection'
import EcosystemToolSection from '@/components/ecosystem/EcosystemToolSection'
import EcosystemFAQ, { buildFaqSchema } from '@/components/ecosystem/EcosystemFAQ'
import FinalCTA from '@/app/ecosystem-partners/_components/FinalCTA'
import MillionFlatsButton from '@/components/ui/MillionFlatsButton'
import { getEcosystemCategoryConfig, type EcosystemSectionItem } from '@/lib/ecosystem/categoryConfig'
import { fetchPublicPartners } from '@/lib/ecosystem/fetchPublicPartners'
import { categoryHref, type EcosystemCategorySlug } from '@/lib/ecosystemPartners'
import { prisma } from '@/lib/prisma'

type Theme = {
  accent: string
  accentSoft: string
  accentText: string
  accentBorder: string
  texture: string
  visual: string
  personality: string
}

const THEMES: Record<EcosystemCategorySlug, Theme> = {
  'home-loans-finance': {
    accent: 'bg-emerald-500',
    accentSoft: 'bg-emerald-50',
    accentText: 'text-emerald-700',
    accentBorder: 'border-emerald-200',
    texture: 'from-emerald-100 via-white to-sky-100',
    visual: 'Loan intelligence',
    personality: 'Finance clarity',
  },
  'legal-documentation': {
    accent: 'bg-indigo-500',
    accentSoft: 'bg-indigo-50',
    accentText: 'text-indigo-700',
    accentBorder: 'border-indigo-200',
    texture: 'from-indigo-100 via-white to-slate-100',
    visual: 'Due diligence',
    personality: 'Legal confidence',
  },
  'property-insurance': {
    accent: 'bg-sky-500',
    accentSoft: 'bg-sky-50',
    accentText: 'text-sky-700',
    accentBorder: 'border-sky-200',
    texture: 'from-sky-100 via-white to-blue-100',
    visual: 'Coverage map',
    personality: 'Protected ownership',
  },
  'interior-design-renovation': {
    accent: 'bg-rose-500',
    accentSoft: 'bg-rose-50',
    accentText: 'text-rose-700',
    accentBorder: 'border-rose-200',
    texture: 'from-rose-100 via-white to-slate-100',
    visual: 'Design studio',
    personality: 'Refined interiors',
  },
  'packers-movers': {
    accent: 'bg-amber-500',
    accentSoft: 'bg-amber-50',
    accentText: 'text-amber-700',
    accentBorder: 'border-amber-200',
    texture: 'from-amber-100 via-white to-slate-100',
    visual: 'Move plan',
    personality: 'Careful relocation',
  },
  'property-management': {
    accent: 'bg-teal-500',
    accentSoft: 'bg-teal-50',
    accentText: 'text-teal-700',
    accentBorder: 'border-teal-200',
    texture: 'from-teal-100 via-white to-slate-100',
    visual: 'Owner dashboard',
    personality: 'Managed returns',
  },
  'vastu-feng-shui': {
    accent: 'bg-purple-500',
    accentSoft: 'bg-purple-50',
    accentText: 'text-purple-700',
    accentBorder: 'border-purple-200',
    texture: 'from-purple-100 via-white to-slate-100',
    visual: 'Spatial balance',
    personality: 'Balanced spaces',
  },
  'tiles-surface-finishing': {
    accent: 'bg-emerald-500',
    accentSoft: 'bg-emerald-50',
    accentText: 'text-emerald-700',
    accentBorder: 'border-emerald-200',
    texture: 'from-emerald-100 via-white to-stone-100',
    visual: 'Material library',
    personality: 'Luxury surfaces',
  },
  'hardware-architectural-fittings': {
    accent: 'bg-slate-500',
    accentSoft: 'bg-slate-100',
    accentText: 'text-slate-700',
    accentBorder: 'border-slate-300',
    texture: 'from-slate-200 via-white to-slate-100',
    visual: 'Architectural hardware',
    personality: 'Precision fittings',
  },
  'cement-structural': {
    accent: 'bg-stone-500',
    accentSoft: 'bg-stone-100',
    accentText: 'text-stone-700',
    accentBorder: 'border-stone-300',
    texture: 'from-stone-200 via-white to-slate-100',
    visual: 'Structural grid',
    personality: 'Engineering grade',
  },
  'smart-home-automation': {
    accent: 'bg-sky-500',
    accentSoft: 'bg-sky-50',
    accentText: 'text-sky-700',
    accentBorder: 'border-sky-200',
    texture: 'from-sky-100 via-white to-cyan-100',
    visual: 'Connected home',
    personality: 'Intelligent living',
  },
  'technology-partners': {
    accent: 'bg-violet-500',
    accentSoft: 'bg-violet-50',
    accentText: 'text-violet-700',
    accentBorder: 'border-violet-200',
    texture: 'from-violet-100 via-white to-slate-100',
    visual: 'Platform graph',
    personality: 'Enterprise technology',
  },
}

const DEFAULT_WORKFLOW: EcosystemSectionItem[] = [
  { title: 'Brief', description: 'Share your scope, location, timing, and selection criteria.' },
  { title: 'Match', description: 'MillionFlats narrows the options to verified partners with relevant experience.' },
  { title: 'Compare', description: 'Review profiles, services, pricing bands, ratings, and project fit in one place.' },
  { title: 'Proceed', description: 'Request a consultation and move forward with better context and confidence.' },
]

function safeNumber(v: unknown) {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  return null
}

function iconPath(index: number) {
  return [
    'M9 12l2 2 4-5m5 3a8 8 0 11-16 0 8 8 0 0116 0z',
    'M4 7h16M7 4v6m10-6v6M6 14h12M8 18h8',
    'M12 3l7 4v5c0 5-3.5 8-7 9-3.5-1-7-4-7-9V7l7-4z',
    'M4 12h5l2-7 3 14 2-7h4',
  ][index % 4]
}

function SectionBadge({ children, theme }: { children: string; theme: Theme }) {
  return (
    <div className={`inline-flex items-center gap-2 rounded-full border ${theme.accentBorder} bg-white px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] ${theme.accentText} shadow-sm`}>
      <span className={`h-2 w-2 rounded-full ${theme.accent}`} />
      {children}
    </div>
  )
}

function FeatureCard({
  title,
  description,
  index,
  theme,
}: {
  title: string
  description: string
  index: number
  theme: Theme
}) {
  return (
    <div className="group rounded-[28px] border border-slate-200 bg-white p-7 shadow-[0_18px_60px_rgba(15,23,42,0.06)] transition-all duration-300 hover:-translate-y-1.5 hover:border-slate-300 hover:shadow-[0_26px_80px_rgba(15,23,42,0.10)]">
      <div className={`mb-6 flex h-12 w-12 items-center justify-center rounded-2xl border ${theme.accentBorder} ${theme.accentSoft} ${theme.accentText} transition-all duration-300 group-hover:scale-105`}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d={iconPath(index)} stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <h3 className="text-[22px] font-extrabold leading-tight text-slate-950">{title}</h3>
      <p className="mt-3 text-[16px] leading-7 text-slate-600">{description}</p>
    </div>
  )
}

function HeroVisual({ theme, title }: { theme: Theme; title: string }) {
  return (
    <div className="relative min-h-[520px] overflow-hidden rounded-[36px] border border-slate-200 bg-white shadow-[0_30px_100px_rgba(15,23,42,0.12)]">
      <div className={`absolute inset-0 bg-gradient-to-br ${theme.texture}`} />
      <div className="absolute inset-0 opacity-[0.34] [background-image:linear-gradient(90deg,rgba(15,23,42,.08)_1px,transparent_1px),linear-gradient(0deg,rgba(15,23,42,.08)_1px,transparent_1px)] [background-size:32px_32px]" />
      <div className="absolute left-8 right-8 top-8 flex items-center justify-between rounded-2xl border border-white/80 bg-white/80 p-4 shadow-sm backdrop-blur">
        <div>
          <div className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">MillionFlats Ecosystem</div>
          <div className="mt-1 text-lg font-extrabold text-slate-950">{theme.visual}</div>
        </div>
        <div className={`flex h-11 w-11 items-center justify-center rounded-full ${theme.accentSoft} ${theme.accentText}`}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>
      <div className="absolute bottom-8 left-8 right-8 grid gap-4 sm:grid-cols-2">
        {[theme.personality, 'Verified partners', 'Clear comparison', 'Premium support'].map((label, index) => (
          <div key={label} className="rounded-2xl border border-white/80 bg-white/86 p-5 shadow-sm backdrop-blur transition duration-300 hover:-translate-y-1 hover:bg-white">
            <div className={`mb-4 h-1.5 w-16 rounded-full ${index === 0 ? theme.accent : 'bg-slate-300'}`} />
            <div className="text-sm font-bold text-slate-950">{label}</div>
            <div className="mt-2 text-xs leading-5 text-slate-500">
              {index === 0 ? title : 'Standardized partner data, review signals, and guided next steps.'}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function StarPartnerBanner({
  categoryTitle,
  image,
  imageAlt,
}: {
  categoryTitle: string
  image: string | null
  imageAlt: string
}) {
  return (
    <div className="relative w-full">
      <div className="group relative h-[190px] w-full overflow-hidden rounded-b-[30px] border-b border-slate-300 bg-[#edf2f7] shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_22px_70px_rgba(15,23,42,0.10)] sm:h-[240px] lg:h-[320px] xl:h-[360px]">
        {image ? (
          <div
            aria-label={imageAlt || `${categoryTitle} partner banner`}
            role="img"
            className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-[1.025]"
            style={{ backgroundImage: `url("${image}")` }}
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-slate-100 via-[#eef3f8] to-slate-200" />
        )}
        <div className={`absolute inset-0 ${image ? 'bg-gradient-to-r from-slate-950/18 via-transparent to-slate-950/10' : 'opacity-45 [background-image:linear-gradient(90deg,rgba(100,116,139,.12)_1px,transparent_1px),linear-gradient(0deg,rgba(100,116,139,.12)_1px,transparent_1px)] [background-size:36px_36px]'}`} />
        {!image ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center text-[13px] font-extrabold uppercase tracking-[0.22em] text-slate-500 sm:text-[15px]">
              Ad Banner Space
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}

function resolveUsableBannerImage(src: string | null | undefined) {
  const value = src?.trim()
  if (!value) return null
  if (/^(https?:)?\/\//i.test(value) || value.startsWith('data:') || value.startsWith('/api/')) return value
  if (!value.startsWith('/')) return value

  try {
    return existsSync(join(process.cwd(), 'public', value.slice(1))) ? value : null
  } catch {
    return value
  }
}

async function getCategoryBannerImage(slug: EcosystemCategorySlug, fallback: string) {
  try {
    const category = await (prisma as any).ecosystemCategory.findUnique({
      where: { slug },
      select: { heroImage: true },
    })
    return resolveUsableBannerImage(category?.heroImage || fallback)
  } catch {
    return resolveUsableBannerImage(fallback)
  }
}

type EcosystemCategoryPageProps = {
  slug: string
  page?: number
}

export default async function EcosystemCategoryPage({ slug, page }: EcosystemCategoryPageProps) {
  const cfg = getEcosystemCategoryConfig(slug)
  if (!cfg) return notFound()

  const theme = THEMES[cfg.slug] ?? THEMES['home-loans-finance']
  const bannerImage = await getCategoryBannerImage(cfg.slug, cfg.heroImage.src)
  const take = 12
  const pageSafe = Number.isFinite(page as number) && (page as number) > 0 ? Math.floor(page as number) : 1
  const baseUrl = `https://millionflats.com${categoryHref(cfg.slug)}`
  const url = pageSafe > 1 ? `${baseUrl}?page=${pageSafe}` : baseUrl

  const {
    items: partnersRaw,
    total: totalPartners,
    hasMore: hasMorePartners,
  } = await fetchPublicPartners({ categorySlug: cfg.slug, page: pageSafe, take })

  const partners: EcosystemPartnerCard[] = partnersRaw.map((p) => ({
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

  const faqSchema = buildFaqSchema({ url, faqs: cfg.faqs })
  const serviceSchema = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: cfg.title,
    description: cfg.meta.description,
    provider: { '@type': 'Organization', name: 'MillionFlats', url: 'https://millionflats.com' },
    areaServed: 'IN',
    url,
  }
  const partnerSchemas = partners.map((p) => ({
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: p.name,
    url: p.slug ? `${baseUrl}/${p.slug}` : url,
    image: p.logo || p.coverImage || undefined,
    aggregateRating:
      typeof p.rating === 'number'
        ? { '@type': 'AggregateRating', ratingValue: p.rating, bestRating: 5, ratingCount: 1 }
        : undefined,
  }))

  const overview = cfg.overview?.length ? cfg.overview : [cfg.subtitle, cfg.meta.description]
  const highlights = cfg.highlights?.length ? cfg.highlights : cfg.benefits
  const workflow = cfg.workflow?.length ? cfg.workflow : DEFAULT_WORKFLOW
  const resources = cfg.resources?.length
    ? cfg.resources
    : cfg.benefits.slice(0, 3).map((item, index) => ({
        title: `${item.title} guide`,
        description: item.description,
        href: `${categoryHref(cfg.slug)}#partners${index}`,
      }))

  return (
    <div className="min-h-screen bg-[#f7f9fb] text-slate-950">
      <Script id={`ecosystem-faq-schema-${cfg.slug}`} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <Script id={`ecosystem-service-schema-${cfg.slug}`} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceSchema) }} />
      {partnerSchemas.length ? (
        <Script id={`ecosystem-partners-schema-${cfg.slug}`} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(partnerSchemas) }} />
      ) : null}

      <section className="relative overflow-hidden bg-white">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
        <StarPartnerBanner categoryTitle={cfg.title} image={bannerImage} imageAlt={cfg.heroImage.alt} />
        <div className="mx-auto grid w-full max-w-[1400px] gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[1.02fr_0.98fr] lg:px-8 lg:py-24">
          <div className="flex flex-col justify-center">
            <SectionBadge theme={theme}>{`Verified ${cfg.title}`}</SectionBadge>
            <h1 className="mt-8 max-w-4xl text-[44px] font-extrabold leading-[1.03] tracking-tight text-slate-950 sm:text-[58px] lg:text-[64px]">
              {cfg.title}
            </h1>
            <p className="mt-6 max-w-2xl text-[20px] leading-8 text-slate-600 sm:text-[22px]">
              {cfg.subtitle}
            </p>
            <div className="mt-10 flex flex-col gap-4 sm:flex-row">
              <MillionFlatsButton href="#lead" variant="primary" size="lg" className="w-full sm:w-auto">
                {cfg.primaryCta.label}
              </MillionFlatsButton>
              <MillionFlatsButton href="#partners" variant="secondary" size="lg" className="w-full sm:w-auto">
                {cfg.secondaryCta.label}
              </MillionFlatsButton>
            </div>

            <div className="mt-12 grid max-w-2xl grid-cols-3 gap-3">
              {[
                ['12', 'ecosystems'],
                [`${Math.max(totalPartners, partners.length) || 'New'}`, 'verified partners'],
                ['24h', 'response intent'],
              ].map(([value, label]) => (
                <div key={label} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-2xl font-extrabold text-slate-950">{value}</div>
                  <div className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</div>
                </div>
              ))}
            </div>
          </div>

          <HeroVisual theme={theme} title={cfg.title} />
        </div>
      </section>

      <section className="bg-[#f7f9fb] py-20">
        <div className="mx-auto grid max-w-[1400px] gap-10 px-4 sm:px-6 lg:grid-cols-[0.85fr_1.15fr] lg:px-8">
          <div>
            <SectionBadge theme={theme}>Ecosystem Standard</SectionBadge>
            <h2 className="mt-6 text-[38px] font-extrabold leading-tight text-slate-950 sm:text-[42px]">
              One premium journey from discovery to delivery.
            </h2>
            <p className="mt-5 text-[18px] leading-8 text-slate-600">{overview[0]}</p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            {cfg.benefits.slice(0, 4).map((item, index) => (
              <FeatureCard key={item.title} title={item.title} description={item.description} index={index} theme={theme} />
            ))}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-slate-950 py-24 text-white">
        <div className="absolute inset-0 opacity-30 [background-image:radial-gradient(circle_at_1px_1px,rgba(255,255,255,.22)_1px,transparent_0)] [background-size:28px_28px]" />
        <div className="relative mx-auto grid max-w-[1400px] gap-12 px-4 sm:px-6 lg:grid-cols-[0.95fr_1.05fr] lg:px-8">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-white">
              <span className={`h-2 w-2 rounded-full ${theme.accent}`} />
              Category Story
            </div>
            <h2 className="mt-6 text-[38px] font-extrabold leading-tight sm:text-[42px]">
              Built for comparison, confidence, and premium execution.
            </h2>
            <p className="mt-5 text-[18px] leading-8 text-slate-300">{overview[1] ?? overview[0]}</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {highlights.slice(0, 4).map((item, index) => (
              <div key={item.title} className="rounded-[28px] border border-white/10 bg-white/[0.06] p-6 backdrop-blur transition duration-300 hover:-translate-y-1 hover:bg-white/[0.10]">
                <div className={`mb-5 h-1.5 w-14 rounded-full ${index === 0 ? theme.accent : 'bg-white/25'}`} />
                <h3 className="text-[20px] font-extrabold text-white">{item.title}</h3>
                <p className="mt-3 text-[15px] leading-7 text-slate-300">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white py-24">
        <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <SectionBadge theme={theme}>Process Flow</SectionBadge>
            <h2 className="mt-6 text-[38px] font-extrabold leading-tight text-slate-950 sm:text-[42px]">
              How MillionFlats helps
            </h2>
          </div>
          <div className="mt-14 grid gap-5 lg:grid-cols-4">
            {workflow.slice(0, 4).map((step, index) => (
              <div key={step.title} className="group relative rounded-[28px] border border-slate-200 bg-white p-7 shadow-[0_18px_60px_rgba(15,23,42,0.06)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_26px_80px_rgba(15,23,42,0.10)]">
                <div className="mb-8 flex items-center justify-between">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-full ${theme.accent} text-lg font-extrabold text-white shadow-sm`}>
                    {index + 1}
                  </div>
                  <div className="h-px flex-1 bg-slate-200" />
                </div>
                <h3 className="text-[22px] font-extrabold text-slate-950">{step.title}</h3>
                <p className="mt-3 text-[16px] leading-7 text-slate-600">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {cfg.featuredSection ? (
        <section className="bg-[#f7f9fb] py-20">
          <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
            <EcosystemFeaturedPartnersSection
              categorySlug={cfg.slug}
              badge={cfg.featuredSection.badge}
              title={cfg.featuredSection.title}
              exploreHref={cfg.featuredSection.exploreHref ?? '#partners'}
            />
          </div>
        </section>
      ) : null}

      <section className="bg-[#f7f9fb] py-24">
        <div className="mx-auto grid max-w-[1400px] gap-8 px-4 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8">
          <div className="rounded-[32px] border border-slate-200 bg-white p-8 shadow-[0_18px_60px_rgba(15,23,42,0.06)] sm:p-10">
            <SectionBadge theme={theme}>Comparison</SectionBadge>
            <h2 className="mt-6 text-[34px] font-extrabold leading-tight text-slate-950 sm:text-[42px]">
              Compare partners on the signals that matter.
            </h2>
            <div className="mt-10 grid gap-4">
              {['Verified profile', 'Scope and service fit', 'Experience and project signals', 'Consultation readiness'].map((item, index) => (
                <div key={item} className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-full ${theme.accentSoft} ${theme.accentText}`}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <span className="text-[16px] font-bold text-slate-900">{item}</span>
                  <span className="ml-auto text-sm font-bold text-slate-400">0{index + 1}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="grid gap-5">
            {resources.slice(0, 3).map((item, index) => (
              <a key={item.title} href={item.href} className="group rounded-[28px] border border-slate-200 bg-white p-7 shadow-[0_18px_60px_rgba(15,23,42,0.05)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_24px_70px_rgba(15,23,42,0.09)]">
                <div className={`mb-5 flex h-12 w-12 items-center justify-center rounded-2xl ${theme.accentSoft} ${theme.accentText}`}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d={iconPath(index + 1)} stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <h3 className="text-[22px] font-extrabold text-slate-950">{item.title}</h3>
                <p className="mt-3 text-[16px] leading-7 text-slate-600">{item.description}</p>
                <div className="mt-5 text-sm font-extrabold text-slate-950 transition group-hover:translate-x-1">Read guide</div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {cfg.tool ? <EcosystemToolSection tool={cfg.tool} /> : null}

      <EcosystemPartnerDirectoryClient
        partners={partners}
        slug={cfg.slug}
        categoryTitle={cfg.title}
        initialPage={pageSafe}
        take={take}
        total={totalPartners}
        hasMore={hasMorePartners}
      />

      <section id="lead" className="bg-[#f7f9fb] px-4 pb-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1400px]">
          <FinalCTA
            headline={`Partner with MillionFlats for ${cfg.title}`}
            primary={{ label: 'Become a Partner', href: `/ecosystem/register/${cfg.slug}` }}
            secondary={{ label: 'Talk to Us', href: '#partners' }}
          />
        </div>
      </section>

      <EcosystemFAQ title="Frequently asked questions" faqs={cfg.faqs} />
    </div>
  )
}
