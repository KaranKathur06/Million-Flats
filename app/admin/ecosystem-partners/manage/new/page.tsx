import PartnerForm from '@/components/admin/ecosystem/PartnerForm'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export default async function NewEcosystemPartnerPage() {
  const categories = await (prisma as any).ecosystemCategory.findMany({
    where: { isActive: true },
    orderBy: { priorityOrder: 'asc' },
    select: { id: true, slug: true, title: true },
  })

  return (
    <div className="space-y-6">
      <PartnerForm mode="create" categories={categories} />
    </div>
  )
}
