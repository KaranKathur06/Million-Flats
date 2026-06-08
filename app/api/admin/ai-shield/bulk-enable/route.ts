import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAdminSession } from '@/lib/adminAuth'
import { ensureAiShieldProject, setAiFeatured, syncAiShieldSnapshot } from '@/lib/aishield/projects'

const bodySchema = z.object({
  developerSlug: z.string().optional(),
  developerName: z.string().optional(),
  setFeaturedSlug: z.string().optional(),
  projectSlugs: z.array(z.string()).optional(),
})

export async function POST(req: Request) {
  const auth = await requireAdminSession()
  if (!auth.ok) {
    return NextResponse.json({ success: false, message: auth.message }, { status: auth.status })
  }

  try {
    const body = await req.json()
    const parsed = bodySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ success: false, message: 'Invalid request' }, { status: 400 })
    }

    const { developerSlug, developerName, setFeaturedSlug, projectSlugs } = parsed.data

    const projectWhere: Record<string, unknown> = {
      status: 'PUBLISHED',
      isDeleted: false,
    }

    if (projectSlugs?.length) {
      projectWhere.slug = { in: projectSlugs }
    } else if (developerSlug || developerName) {
      const devWhere: Record<string, unknown> = {}
      if (developerSlug) devWhere.slug = developerSlug
      if (developerName) devWhere.name = { contains: developerName, mode: 'insensitive' }
      const dev = await prisma.developer.findFirst({ where: devWhere })
      if (!dev) {
        return NextResponse.json({ success: false, message: 'Developer not found' }, { status: 404 })
      }
      projectWhere.developerId = dev.id
    } else {
      return NextResponse.json(
        { success: false, message: 'Provide developerSlug, developerName, or projectSlugs' },
        { status: 400 }
      )
    }

    const projects = await prisma.project.findMany({
      where: projectWhere,
      select: { id: true, slug: true, name: true },
    })

    let enabled = 0
    for (const p of projects) {
      await ensureAiShieldProject(p.id)
      await prisma.aiShieldProject.update({
        where: { projectId: p.id },
        data: { isAiEnabled: true },
      })
      enabled++
      try {
        const { orchestrate } = await import('@/lib/verixshield')
        await orchestrate(p.id, 'PROJECT')
        await syncAiShieldSnapshot(p.id)
      } catch {
        // Continue bulk import even if one valuation fails
      }
    }

    if (setFeaturedSlug) {
      const featured = projects.find((p) => p.slug === setFeaturedSlug)
      if (featured) {
        await setAiFeatured(featured.id, true)
      }
    }

    return NextResponse.json({
      success: true,
      enabled,
      projects: projects.map((p) => ({ id: p.id, slug: p.slug, name: p.name })),
    })
  } catch (err) {
    console.error('[POST /api/admin/ai-shield/bulk-enable]', err)
    return NextResponse.json({ success: false, message: 'Bulk enable failed' }, { status: 500 })
  }
}
