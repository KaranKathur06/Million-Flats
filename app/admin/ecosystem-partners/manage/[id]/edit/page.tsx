import { notFound } from 'next/navigation'
import EcosystemPartnerForm from '@/components/admin/EcosystemPartnerForm'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

type PageProps = { params: { id: string } }

export default async function EditEcosystemPartnerPage({ params }: PageProps) {
  const [partner, categories] = await Promise.all([
    (prisma as any).ecosystemPartner.findUnique({ where: { id: params.id } }),
    (prisma as any).ecosystemCategory.findMany({
      where: { isActive: true },
      orderBy: { priorityOrder: 'asc' },
      select: { id: true, slug: true, title: true },
    }),
  ])

  if (!partner) notFound()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Edit {partner.name}</h1>
        <p className="mt-1 text-sm text-white/60">Update partner profile, verification, and SEO settings.</p>
      </div>
      <EcosystemPartnerForm
        categories={categories}
        initial={{
          id: partner.id,
          categoryId: partner.categoryId,
          name: partner.name,
          slug: partner.slug || '',
          tagline: partner.tagline || '',
          shortDescription: partner.shortDescription || '',
          description: partner.description || '',
          logo: partner.logo || '',
          coverImage: partner.coverImage || '',
          rating: partner.rating != null ? String(partner.rating) : '',
          yearsExperience: partner.yearsExperience != null ? String(partner.yearsExperience) : '',
          projectsCompleted: partner.projectsCompleted != null ? String(partner.projectsCompleted) : '',
          teamSize: partner.teamSize != null ? String(partner.teamSize) : '',
          partnerSince: partner.partnerSince != null ? String(partner.partnerSince) : '',
          locationCoverage: partner.locationCoverage || '',
          pricingRange: partner.pricingRange || '',
          status: partner.status,
          isFeatured: partner.isFeatured,
          isVerified: partner.isVerified,
          isActive: partner.isActive,
          metaTitle: partner.metaTitle || '',
          metaDescription: partner.metaDescription || '',
        }}
      />
    </div>
  )
}
