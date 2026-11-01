import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdminSession } from '@/lib/adminAuth'
import { getAuthenticatedEcosystemUser } from '@/lib/ecosystem/auth'
import {
  isPlatformAdmin,
  PartnerAccessError,
  reviewSensitivePartnerChange,
} from '@/lib/ecosystem/membership'
import { deleteFromS3 } from '@/lib/s3'

const ReviewSchema = z.object({
  decision: z.enum(['APPROVED', 'REJECTED']),
  reason: z.string().trim().max(1000).optional().default(''),
})

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const adminSession = await requireAdminSession()
  if (!adminSession.ok) {
    return NextResponse.json({ success: false, message: adminSession.message }, { status: adminSession.status })
  }
  const reviewer = await getAuthenticatedEcosystemUser()
  if (!reviewer || !isPlatformAdmin(reviewer)) {
    return NextResponse.json({ success: false, message: 'Platform administrator access is required.' }, { status: 403 })
  }
  const parsed = ReviewSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ success: false, message: 'Choose approve or reject and provide a valid reason.' }, { status: 400 })
  try {
    const result = await reviewSensitivePartnerChange({
      requestId: params.id,
      reviewer,
      ...parsed.data,
    })
    const cleanupKeys = [...result.replacedStorageKeys, ...result.rejectedStorageKeys]
    const cleanup = await Promise.allSettled(cleanupKeys.map((key) => deleteFromS3(key)))
    cleanup.forEach((item, index) => {
      if (item.status === 'rejected') {
        console.error('[admin-ecosystem-change-requests] Unable to clean replaced staged media', {
          key: cleanupKeys[index],
          error: item.reason,
        })
      }
    })
    return NextResponse.json({ success: true, data: { id: result.id, status: result.status } })
  } catch (error) {
    if (error instanceof PartnerAccessError) {
      return NextResponse.json({ success: false, message: error.message }, { status: error.status })
    }
    console.error('[admin-ecosystem-change-requests] Review failed', error)
    return NextResponse.json({ success: false, message: 'Unable to review profile change.' }, { status: 500 })
  }
}
