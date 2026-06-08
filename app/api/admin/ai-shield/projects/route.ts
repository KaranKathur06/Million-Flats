import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAdminSession } from '@/lib/adminAuth'
import { ensureAiShieldProject, setAiFeatured, syncAiShieldSnapshot } from '@/lib/aishield/projects'

export async function GET(req: Request) {
  const auth = await requireAdminSession()
  if (!auth.ok) {
    return NextResponse.json({ success: false, message: auth.message }, { status: auth.status })
  }

  try {
    const { searchParams } = new URL(req.url)
    const enabledOnly = searchParams.get('enabled') === 'true'
    const developerId = (searchParams.get('developerId') || '').trim()

    const where: Record<string, unknown> = {
      status: 'PUBLISHED',
      isDeleted: false,
    }
    if (developerId) where.developerId = developerId
    if (enabledOnly) where.aiShield = { isAiEnabled: true }

    const projects = await prisma.project.findMany({
      where,
      orderBy: [{ aiShield: { isAiFeatured: 'desc' } }, { name: 'asc' }],
      select: {
        id: true,
        name: true,
        slug: true,
        city: true,
        community: true,
        countryIso2: true,
        startingPrice: true,
        completionYear: true,
        status: true,
        developer: { select: { id: true, name: true } },
        aiShield: {
          select: {
            id: true,
            isAiEnabled: true,
            isAiFeatured: true,
            aiStatus: true,
            confidenceScore: true,
            fairValue: true,
            lowEstimate: true,
            highEstimate: true,
            marketSignalScore: true,
            updatedAt: true,
          },
        },
      },
    })

    const items = await Promise.all(
      projects.map(async (p) => {
        if (!p.aiShield) {
          await ensureAiShieldProject(p.id)
        }
        return {
          ...p,
          aiShield: p.aiShield ?? {
            isAiEnabled: false,
            isAiFeatured: false,
            aiStatus: null,
            confidenceScore: null,
            fairValue: null,
            lowEstimate: null,
            highEstimate: null,
            marketSignalScore: null,
          },
        }
      })
    )

    return NextResponse.json({ success: true, items })
  } catch (err) {
    console.error('[GET /api/admin/ai-shield/projects]', err)
    return NextResponse.json({ success: false, message: 'Failed to load AI Shield projects' }, { status: 500 })
  }
}

const patchSchema = z.object({
  projectId: z.string().min(1),
  isAiEnabled: z.boolean().optional(),
  isAiFeatured: z.boolean().optional(),
})

export async function PATCH(req: Request) {
  const auth = await requireAdminSession()
  if (!auth.ok) {
    return NextResponse.json({ success: false, message: auth.message }, { status: auth.status })
  }

  try {
    const body = await req.json()
    const parsed = patchSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ success: false, message: 'Invalid request' }, { status: 400 })
    }

    const { projectId, isAiEnabled, isAiFeatured } = parsed.data

    await ensureAiShieldProject(projectId)

    if (typeof isAiEnabled === 'boolean') {
      await prisma.aiShieldProject.update({
        where: { projectId },
        data: { isAiEnabled },
      })
      if (!isAiEnabled) {
        await prisma.aiShieldProject.update({
          where: { projectId },
          data: { isAiFeatured: false },
        })
      }
    }

    if (typeof isAiFeatured === 'boolean') {
      if (isAiFeatured) {
        const enabled = await prisma.aiShieldProject.findUnique({ where: { projectId } })
        if (!enabled?.isAiEnabled) {
          await prisma.aiShieldProject.update({
            where: { projectId },
            data: { isAiEnabled: true },
          })
        }
      }
      await setAiFeatured(projectId, isAiFeatured)
    }

    if (isAiEnabled) {
      try {
        const { orchestrate } = await import('@/lib/verixshield')
        await orchestrate(projectId, 'PROJECT')
        await syncAiShieldSnapshot(projectId)
      } catch (e) {
        console.warn('[AI Shield] Valuation warm-up failed:', e)
      }
    }

    const updated = await prisma.aiShieldProject.findUnique({
      where: { projectId },
      include: {
        project: {
          select: { id: true, name: true, slug: true },
        },
      },
    })

    return NextResponse.json({ success: true, item: updated })
  } catch (err) {
    console.error('[PATCH /api/admin/ai-shield/projects]', err)
    return NextResponse.json({ success: false, message: 'Update failed' }, { status: 500 })
  }
}
