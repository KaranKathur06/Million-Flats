import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// POST â€” Track brochure download (auth required)
export async function POST(req: Request, { params }: { params: { slug: string } }) {
  try {
    const session = await getServerSession(authOptions)
    const userId = String((session?.user as any)?.id || '').trim()

    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'Login required to download brochure', loginRequired: true },
        { status: 401 }
      )
    }

    const slug = (params.slug || '').trim()
    if (!slug) {
      return NextResponse.json({ success: false, message: 'Missing project slug' }, { status: 400 })
    }

    // Find the project + brochure
    const project = await (prisma as any).project.findFirst({
      where: { slug, status: 'PUBLISHED', isDeleted: false },
      select: {
        id: true,
        slug: true,
        brochure: {
          select: { id: true, fileUrl: true, fileName: true, fileSize: true },
        },
        brochureUrl: true,
      },
    })

    if (!project) {
      return NextResponse.json({ success: false, message: 'Project not found' }, { status: 404 })
    }

    const brochureUrl = project.brochure?.fileUrl || project.brochureUrl
    if (!brochureUrl) {
      return NextResponse.json({ success: false, message: 'No brochure available' }, { status: 404 })
    }

    // Extract IP and user agent
    const ipAddress = String(req.headers.get('x-forwarded-for') || '').split(',')[0]?.trim()
      || String(req.headers.get('x-real-ip') || '').trim()
      || null
    const userAgent = String(req.headers.get('user-agent') || '').trim() || null

    // Track the download
    await (prisma as any).brochureDownload.create({
      data: {
        userId,
        projectId: project.id,
        ipAddress,
        userAgent,
      },
    })

    return NextResponse.json({
      success: true,
      downloadUrl: brochureUrl,
      fileName: project.brochure?.fileName || 'brochure.pdf',
    }, {
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch (err: any) {
    console.error('[POST /api/projects/[slug]/brochure/download]', err)
    return NextResponse.json({ success: false, message: 'Failed to process download' }, { status: 500 })
  }
}

