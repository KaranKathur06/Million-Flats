import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminSession } from '@/lib/adminAuth'

export async function GET() {
  const auth = await requireAdminSession()
  if (!auth.ok) {
    return NextResponse.json({ success: false, message: auth.message }, { status: auth.status })
  }

  const categories = await (prisma as any).ecosystemCategory.findMany({
    where: { isActive: true },
    orderBy: { priorityOrder: 'asc' },
    select: { id: true, slug: true, title: true },
  })

  const fallbackSeed = [
    { id: 'home-loans-finance', slug: 'home-loans-finance', title: 'Home Loans & Finance' },
    { id: 'legal-documentation', slug: 'legal-documentation', title: 'Legal & Documentation' },
    { id: 'property-insurance', slug: 'property-insurance', title: 'Property Insurance' },
    { id: 'interior-design-renovation', slug: 'interior-design-renovation', title: 'Interior Design & Renovation' },
    { id: 'packers-movers', slug: 'packers-movers', title: 'Packers & Movers' },
    { id: 'property-management', slug: 'property-management', title: 'Property Management' },
    { id: 'vastu-feng-shui', slug: 'vastu-feng-shui', title: 'Vastu / Feng Shui Consultants' },
    { id: 'tiles-surface-finishing', slug: 'tiles-surface-finishing', title: 'Tiles & Surface Finishing' },
    { id: 'hardware-architectural-fittings', slug: 'hardware-architectural-fittings', title: 'Hardware & Architectural Fittings' },
    { id: 'cement-structural', slug: 'cement-structural', title: 'Cement & Structural' },
    { id: 'smart-home-automation', slug: 'smart-home-automation', title: 'Smart Home & Automation' },
    { id: 'technology-partners', slug: 'technology-partners', title: 'Technology Partners' },
  ]

  const orderedCategories = categories.length ? categories : fallbackSeed
  return NextResponse.json({ success: true, data: orderedCategories })
}
