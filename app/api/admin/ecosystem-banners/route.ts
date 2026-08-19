import { NextResponse } from 'next/server'
import { requireAdminSession } from '@/lib/adminAuth'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const auth = await requireAdminSession()
  if (!auth.ok) return NextResponse.json({ success: false, message: auth.message }, { status: auth.status })

  try {
    const search = new URL(req.url).searchParams.get('search')?.trim() || ''
    const status = new URL(req.url).searchParams.get('status') || 'all'
    const categories = await (prisma as any).ecosystemCategory.findMany({
      where: {
        isActive: true,
        ...(search ? { OR: [{ title: { contains: search, mode: 'insensitive' } }, { slug: { contains: search, mode: 'insensitive' } }] } : {}),
      },
      orderBy: [{ priorityOrder: 'asc' }, { title: 'asc' }],
      select: {
        id: true,
        slug: true,
        title: true,
        heroImage: true,
        banners: { where: { status: 'ACTIVE' }, orderBy: { version: 'desc' }, take: 1 },
      },
    })
    const data = categories.map((category: any) => {
      const banner = category.banners?.[0] || null
      const configured = Boolean(banner || category.heroImage)
      return {
        id: category.id,
        slug: category.slug,
        title: category.title,
        route: `/ecosystem-partners/${category.slug}`,
        legacyImage: category.heroImage || null,
        banner,
        configured,
        status: banner ? 'ACTIVE' : configured ? 'ACTIVE' : 'MISSING',
      }
    }).filter((item: any) => status === 'all' || (status === 'configured' ? item.configured : !item.configured))
    const updated = data.map((item: any) => item.banner?.updatedAt).filter(Boolean).sort().reverse()[0] || null
    return NextResponse.json({
      success: true,
      data,
      stats: {
        categories: data.length,
        configured: data.filter((item: any) => item.configured).length,
        missing: data.filter((item: any) => !item.configured).length,
        recentlyUpdated: data.filter((item: any) => item.banner?.updatedAt && Date.now() - new Date(item.banner.updatedAt).getTime() < 24 * 60 * 60 * 1000).length,
        lastUpdated: updated,
      },
    })
  } catch (error) {
    console.error('Admin ecosystem banner list error:', error)
    return NextResponse.json({ success: false, message: 'Failed to load ecosystem banners' }, { status: 500 })
  }
}