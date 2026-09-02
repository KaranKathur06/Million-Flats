import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminSession } from '@/lib/adminAuth'

const COMPLETE_CATEGORY_SEED = [
  { slug: 'home-loans-finance', title: 'Home Loans & Finance' },
  { slug: 'legal-documentation', title: 'Legal & Documentation' },
  { slug: 'property-insurance', title: 'Property Insurance' },
  { slug: 'interior-design-renovation', title: 'Interior Design & Renovation' },
  { slug: 'packers-movers', title: 'Packers & Movers' },
  { slug: 'property-management', title: 'Property Management' },
  { slug: 'vastu-feng-shui', title: 'Vastu / Feng Shui Consultants' },
  { slug: 'tiles-surface-finishing', title: 'Tiles & Surface Finishing' },
  { slug: 'hardware-architectural-fittings', title: 'Hardware & Architectural Fittings' },
  { slug: 'cement-structural', title: 'Cement & Structural' },
  { slug: 'smart-home-automation', title: 'Smart Home & Automation' },
  { slug: 'technology-partners', title: 'Technology Partners' },
]

export async function GET() {
  const auth = await requireAdminSession()
  if (!auth.ok) {
    return NextResponse.json({ success: false, message: auth.message }, { status: auth.status })
  }

  const dbCategories = await (prisma as any).ecosystemCategory.findMany({
    where: { isActive: true },
    orderBy: { priorityOrder: 'asc' },
    select: { id: true, slug: true, title: true },
  })

  const categoriesMap = new Map<string, any>()
  for (const dbCat of dbCategories) {
    categoriesMap.set(dbCat.slug, dbCat)
  }

  const orderedCategories = COMPLETE_CATEGORY_SEED.map((seedCat) => {
    const dbCat = categoriesMap.get(seedCat.slug)
    return dbCat || { id: seedCat.slug, slug: seedCat.slug, title: seedCat.title }
  })

  return NextResponse.json({ success: true, data: orderedCategories })
}
