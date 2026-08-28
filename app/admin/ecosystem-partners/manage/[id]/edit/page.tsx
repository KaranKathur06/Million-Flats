import { notFound } from 'next/navigation'
import PartnerForm from '@/components/admin/ecosystem/PartnerForm'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

type PageProps = { params: { id: string } }

export default async function EditEcosystemPartnerPage({ params }: PageProps) {
  const [partner, categories] = await Promise.all([
    (prisma as any).ecosystemPartner.findUnique({
      where: { id: params.id },
      include: {
        category: { select: { id: true, slug: true, title: true } },
        media: true,
      },
    }),
    (prisma as any).ecosystemCategory.findMany({
      where: { isActive: true },
      orderBy: { priorityOrder: 'asc' },
      select: { id: true, slug: true, title: true },
    }),
  ])

  if (!partner) notFound()

  return (
    <div className="space-y-6">
      <PartnerForm
        mode="edit"
        categories={categories}
        initial={{
          id: partner.id,
          categoryId: partner.categoryId,
          categorySlug: partner.category?.slug || '',
          name: partner.name,
          slug: partner.slug || '',
          tagline: partner.tagline || '',
          shortDescription: partner.shortDescription || '',
          description: partner.description || '',
          logo: partner.logo || '',
          coverImage: partner.coverImage || '',
          rating: partner.rating != null ? String(partner.rating) : '',
          yearsExperience: partner.yearsExperience != null ? String(partner.yearsExperience) : '',
          experienceDisplay: partner.experienceDisplay || '',
          projectsCompleted: partner.projectsCompleted != null ? String(partner.projectsCompleted) : '',
          teamSize: partner.teamSize != null ? String(partner.teamSize) : '',
          partnerSince: partner.partnerSince != null ? String(partner.partnerSince) : '',
          locationCoverage: partner.locationCoverage || '',
          pricingRange: partner.pricingRange || '',
          contactPerson: partner.contactPerson || '',
          contactEmail: partner.contactEmail || '',
          contactPhone: partner.contactPhone || '',
          whatsapp: partner.whatsapp || '',
          website: partner.website || '',
          gstNumber: partner.gstNumber || '',
          registrationNumber: partner.registrationNumber || '',
          status: partner.status,
          isFeatured: partner.isFeatured,
          isVerified: partner.isVerified,
          isActive: partner.isActive,
          metaTitle: partner.metaTitle || '',
          metaDescription: partner.metaDescription || '',
          metaKeywords: partner.metaKeywords || '',
          categoryData: partner.categoryData || {},
        }}
      />
    </div>
  )
}
