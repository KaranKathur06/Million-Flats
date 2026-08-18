import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { requireAdminSession } from '@/lib/adminAuth'
import { reorderProjectsInCity, clearPriorityCache } from '@/lib/services/ProjectListingService'
import { writeAuditLog } from '@/lib/audit'
import { z } from 'zod'

const reorderSchema = z.object({
  countryIso2: z.string().length(2),
  cityName: z.string().min(1).max(100),
  projects: z.array(
    z.object({
      projectId: z.string().uuid(),
      newPriority: z.number().int().positive(),
    })
  ),
})

/**
 * POST /api/admin/projects/reorder
 * Transactionally reorder projects within a city scope
 *
 * CRITICAL CONSTRAINT: All projects MUST be in the same city.
 * This is validated and will reject cross-city reordering attempts.
 *
 * Request body:
 *   {
 *     countryIso2: "AE",
 *     cityName: "Dubai",
 *     projects: [
 *       { projectId: "uuid1", newPriority: 1 },
 *       { projectId: "uuid2", newPriority: 2 },
 *       { projectId: "uuid3", newPriority: 3 }
 *     ]
 *   }
 *
 * Response:
 *   {
 *     success: true,
 *     result: {
 *       updated: 3,
 *       countryIso2: "AE",
 *       cityName: "Dubai"
 *     }
 *   }
 */
export async function POST(req: Request) {
  const auth = await requireAdminSession()
  if (!auth.ok) {
    return NextResponse.json({ success: false, message: auth.message }, { status: auth.status })
  }
  if (!['ADMIN', 'SUPERADMIN'].includes(auth.role)) {
    return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 })
  }

  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ success: false, message: 'Invalid body' }, { status: 400 })
  }

  try {
    const parsed = reorderSchema.parse(body)
    const { countryIso2, cityName, projects } = parsed

    if (!projects.length) {
      return NextResponse.json(
        { success: false, message: 'No projects provided' },
        { status: 400 }
      )
    }

    // Check for duplicate project IDs
    const projectIds = projects.map((p) => p.projectId)
    if (new Set(projectIds).size !== projectIds.length) {
      return NextResponse.json(
        { success: false, message: 'Duplicate project IDs found' },
        { status: 400 })
    }

    // Reorder (this validates city scope internally)
    await reorderProjectsInCity(countryIso2, cityName, projects)

    // Write audit log
    await writeAuditLog({
      entityType: 'PROJECT_LISTING',
      entityId: `${countryIso2}|${cityName}`,
      action: 'PROJECT_LISTING_REORDER',
      performedByUserId: auth.userId,
      beforeState: null,
      afterState: { reordered: projectIds.length },
      meta: {
        mode: 'admin-reorder',
        countryIso2,
        cityName,
        projectCount: projectIds.length,
      },
    })

    // Invalidate cache
    await clearPriorityCache()
    revalidatePath('/projects')
    revalidatePath('/admin/projects')

    return NextResponse.json({
      success: true,
      result: {
        updated: projects.length,
        countryIso2,
        cityName,
      },
    })
  } catch (err: any) {
    if (err.name === 'ZodError') {
      return NextResponse.json(
        { success: false, message: 'Validation error', errors: err.errors },
        { status: 400 }
      )
    }

    // Check if this is a city scope violation
    if (err.message?.includes('Not all projects exist in city')) {
      return NextResponse.json(
        { success: false, message: 'Cross-city reordering not allowed. All projects must be in the same city.' },
        { status: 400 }
      )
    }

    console.error('[POST /api/admin/projects/reorder]', err)
    return NextResponse.json({ success: false, message: 'Reorder failed' }, { status: 500 })
  }
}
