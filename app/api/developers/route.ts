import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const country = (searchParams.get('country') || '').toUpperCase()
  const featured = searchParams.get('featured')
  const search = (searchParams.get('search') || '').trim()
  const sort = searchParams.get('sort') || 'featured'
  const limit = Math.min(parseInt(searchParams.get('limit') || '50') || 50, 200)

  try {
    const where: any = { status: 'ACTIVE', isDeleted: { not: true } }
    if (country === 'UAE' || country === 'INDIA') where.countryCode = country
    if (featured === 'true') where.isFeatured = true
    if (search) where.name = { contains: search, mode: 'insensitive' }

    const orderByMap: Record<string, any[]> = {
      featured: [{ isFeatured: 'desc' }, { featuredRank: 'asc' }, { name: 'asc' }],
      most_projects: [{ projects: { _count: 'desc' } }, { name: 'asc' }],
      newest: [{ createdAt: 'desc' }],
      oldest: [{ createdAt: 'asc' }],
      alphabetical: [{ name: 'asc' }],
    }
    const orderBy = orderByMap[sort] || orderByMap.featured

    const runQuery = async (withIsDeleted: boolean) =>
      (prisma as any).developer.findMany({
        where: withIsDeleted
          ? where
          : Object.fromEntries(Object.entries(where).filter(([key]) => key !== 'isDeleted')),
        orderBy,
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
          customerRating: true,
          projectsDelivered: true,
          countriesPresent: true,
          verixScore: true,
          _count: {
            select: {
              projects: { where: { status: 'PUBLISHED' } },
              properties: true,
            },
          },
        },
      })

    let developers: any[] = []
    try {
      developers = await runQuery(true)
    } catch {
      developers = await runQuery(false)
    }

    return NextResponse.json(
      { success: true, data: developers },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } }
    )
  } catch (error) {
    console.error('Public developer fetch error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to fetch developers' },
      { status: 500 }
    )
  }
}
