import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateSignedUrl, ASSET_TTL } from '@/lib/cloudfront'
import { extractS3KeyFromUrl } from '@/lib/s3'
import { trackAssetAccess, buildDownloadGA4Event } from '@/lib/assetTracking'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// POST — Track brochure download (auth required) — returns signed URL, NEVER raw S3 URL
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

    // Find the project + brochure (include s3Key for signed URL generation)
    const project = await (prisma as any).project.findFirst({
      where: { slug, status: 'PUBLISHED', isDeleted: false },
      select: {
        id: true,
        slug: true,
        brochure: {
          select: { id: true, fileUrl: true, s3Key: true, fileName: true, fileSize: true },
        },
        brochureUrl: true,
      },
    })

    if (!project) {
      return NextResponse.json({ success: false, message: 'Project not found' }, { status: 404 })
    }

    // Resolve the S3 key — prefer stored s3Key, fall back to extracting from URL
    const brochureS3Key = project.brochure?.s3Key
      || extractS3KeyFromUrl(project.brochure?.fileUrl || '')
      || extractS3KeyFromUrl(project.brochureUrl || '')

    if (!brochureS3Key) {
      return NextResponse.json({ success: false, message: 'No brochure available' }, { status: 404 })
    }

    // Generate time-limited signed URL (15 min TTL) — NEVER expose raw S3 URL
    const signed = await generateSignedUrl({
      s3Key: brochureS3Key,
      ttlSeconds: ASSET_TTL.PROTECTED_DOWNLOAD,
    })

    // Extract request metadata
    const ipAddress = String(req.headers.get('x-forwarded-for') || '').split(',')[0]?.trim()
      || String(req.headers.get('x-real-ip') || '').trim()
      || null
    const userAgent = String(req.headers.get('user-agent') || '').trim() || null

    // Track the download in brochure_downloads table
    await (prisma as any).brochureDownload.create({
      data: {
        userId,
        projectId: project.id,
        ipAddress,
        userAgent,
      },
    })

    // Track in asset access log (non-blocking)
    trackAssetAccess({
      userId,
      userRole: String((session?.user as any)?.role || 'USER'),
      s3Key: brochureS3Key,
      assetType: 'brochure',
      action: 'download',
      ipAddress,
      userAgent,
      ttlGranted: signed.expiresIn,
    }).catch(() => {})

    return NextResponse.json({
      success: true,
      downloadUrl: signed.url,
      expiresIn: signed.expiresIn,
      fileName: project.brochure?.fileName || 'brochure.pdf',
      ga4Event: buildDownloadGA4Event({
        assetType: 'brochure',
        s3Key: brochureS3Key,
        projectSlug: slug,
        userId,
      }),
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'X-Robots-Tag': 'noindex, nofollow',
      },
    })
  } catch (err: any) {
    console.error('[POST /api/projects/[slug]/brochure/download]', err)
    return NextResponse.json({ success: false, message: 'Failed to process download' }, { status: 500 })
  }
}

