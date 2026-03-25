import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  req: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const developer = await (prisma as any).developer.findUnique({
      where: { slug: params.slug },
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

    if (!developer || developer.status === 'INACTIVE') {
      return NextResponse.json(
        { success: false, message: 'Developer not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, data: developer })
  } catch (error) {
    console.error('Developer detail fetch error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to fetch developer' },
      { status: 500 }
    )
  }
}
