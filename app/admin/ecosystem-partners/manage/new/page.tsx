import EcosystemPartnerForm from '@/components/admin/EcosystemPartnerForm'
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
      <div>
        <h1 className="text-2xl font-bold text-white">Add Ecosystem Partner</h1>
        <p className="mt-1 text-sm text-white/60">Create a new partner profile for the ecosystem directory.</p>
      </div>
      <EcosystemPartnerForm categories={categories} />
    </div>
  )
}
