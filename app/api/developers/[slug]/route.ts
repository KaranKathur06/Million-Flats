import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  _req: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const slug = decodeURIComponent(String(params.slug || '')).trim().toLowerCase()
    if (!slug) {
      return NextResponse.json({ success: false, message: 'Developer not found' }, { status: 404 })
    }

    const runQuery = async (withDeletedFilter: boolean) =>
      (prisma as any).developer.findFirst({
        where: withDeletedFilter
          ? { slug, status: 'ACTIVE', isDeleted: { not: true } }
          : { slug, status: 'ACTIVE' },
        include: {
          projects: {
            where: { status: 'PUBLISHED' },
            orderBy: { updatedAt: 'desc' },
            select: {
              id: true,
              name: true,
              slug: true,
              city: true,
              startingPrice: true,
              completionYear: true,
              coverImage: true,
              goldenVisa: true,
            },
          },
        },
      })

    let developer: any = null
    try {
      developer = await runQuery(true)
    } catch {
      developer = await runQuery(false)
    }

    if (!developer) {
      return NextResponse.json(
        { success: false, message: 'Developer not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { success: true, data: developer },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } }
    )
  } catch (error) {
    console.error('Developer detail fetch error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to fetch developer' },
      { status: 500 }
    )
  }
}
