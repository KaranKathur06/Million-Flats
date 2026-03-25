import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const tags = await (prisma as any).tag.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        slug: true,
        _count: {
          select: { blogTags: true },
        },
      },
    })

    const normalized = (tags as any[]).map((t: any) => ({
      ...t,
      _count: { blogs: t._count?.blogTags ?? 0 },
    }))

    return NextResponse.json({ success: true, data: normalized })
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Failed to fetch tags' },
      { status: 500 }
    )
  }
}
