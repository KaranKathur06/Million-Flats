import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const country = (searchParams.get('country') || '').toUpperCase()
  const featured = searchParams.get('featured')
  const limit = Math.min(parseInt(searchParams.get('limit') || '50') || 50, 200)

  try {
    const where: any = { status: 'ACTIVE' }
    if (country === 'UAE' || country === 'INDIA') where.countryCode = country
    if (featured === 'true') where.isFeatured = true

    const developers = await (prisma as any).developer.findMany({
      where,
      orderBy: [{ isFeatured: 'desc' }, { featuredRank: 'asc' }, { name: 'asc' }],
      take: limit,
      select: {
        id: true,
        name: true,
        slug: true,
        logo: true,
        banner: true,
        countryCode: true,
        city: true,
        shortDescription: true,
        website: true,
        foundedYear: true,
        isFeatured: true,
        featuredRank: true,
        _count: { select: { projects: { where: { status: 'PUBLISHED' } } } },
      },
    })

    return NextResponse.json({ success: true, data: developers })
  } catch (error) {
    console.error('Public developer fetch error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to fetch developers' },
      { status: 500 }
    )
  }
}
