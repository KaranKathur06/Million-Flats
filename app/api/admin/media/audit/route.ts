import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminSession } from '@/lib/adminAuth'
import { buildAssetUrl } from '@/lib/assetUrl'
import { isValidMediaReference, resolveProjectImage } from '@/lib/media/resolveMedia'

export async function GET() {
  const auth = await requireAdminSession()
  if (!auth.ok) {
    return NextResponse.json({ success: false, message: auth.message }, { status: auth.status })
  }

  try {
    const [developers, projects] = await Promise.all([
      (prisma as any).developer.findMany({
        where: { isDeleted: false },
        select: {
          id: true,
          name: true,
          slug: true,
          logo: true,
          banner: true,
        },
      }),
      (prisma as any).project.findMany({
        where: { isDeleted: false },
        select: {
          id: true,
          name: true,
          slug: true,
          coverImage: true,
          media: {
            select: { mediaUrl: true, mediaType: true, category: true, sortOrder: true },
            take: 5,
          },
        },
        take: 500,
      }),
    ])

    const developersMissingLogo = developers.filter((d: any) => !isValidMediaReference(d.logo))
    const developersMissingBanner = developers.filter((d: any) => !isValidMediaReference(d.banner))
    const developersBrokenLogo = developers.filter(
      (d: any) => isValidMediaReference(d.logo) && !buildAssetUrl(d.logo)
    )

    const projectsMissingImage = projects.filter((p: any) => {
      const resolved = resolveProjectImage({
        coverImage: p.coverImage,
        media: p.media,
      })
      return resolved.includes('default-property') || resolved.includes('placeholder')
    })

    const projectsMissingCover = projects.filter((p: any) => !isValidMediaReference(p.coverImage))
    const projectsNoMedia = projects.filter((p: any) => !p.media?.length)

    return NextResponse.json({
      success: true,
      summary: {
        developersTotal: developers.length,
        developersMissingLogo: developersMissingLogo.length,
        developersMissingBanner: developersMissingBanner.length,
        developersBrokenLogo: developersBrokenLogo.length,
        projectsTotal: projects.length,
        projectsMissingCover: projectsMissingCover.length,
        projectsNoMedia: projectsNoMedia.length,
        projectsEffectivelyMissingImage: projectsMissingImage.length,
      },
      samples: {
        developersMissingLogo: developersMissingLogo.slice(0, 10).map((d: any) => ({ id: d.id, name: d.name, slug: d.slug })),
        developersMissingBanner: developersMissingBanner.slice(0, 10).map((d: any) => ({ id: d.id, name: d.name, slug: d.slug })),
        projectsMissingImage: projectsMissingImage.slice(0, 10).map((p: any) => ({ id: p.id, name: p.name, slug: p.slug })),
      },
    })
  } catch (err) {
    console.error('[GET /api/admin/media/audit]', err)
    return NextResponse.json({ success: false, message: 'Audit failed' }, { status: 500 })
  }
}
