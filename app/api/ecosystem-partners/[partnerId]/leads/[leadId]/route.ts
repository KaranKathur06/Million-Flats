import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthenticatedEcosystemUser } from '@/lib/ecosystem/auth'
import { PartnerAccessError, updatePartnerLead } from '@/lib/ecosystem/membership'

const LeadUpdateSchema = z.object({
  status: z.enum(['NEW', 'CONTACTED', 'WON', 'LOST']).optional(),
  assignedTo: z.string().min(1).nullable().optional(),
  followUp: z.object({
    scheduledAt: z.string().datetime(),
    action: z.string().trim().min(2).max(120),
    notes: z.string().trim().max(1000).nullable().optional(),
  }).optional(),
}).strict().refine((value) => Object.keys(value).length > 0, 'At least one lead update is required.')

export async function PATCH(
  request: Request,
  { params }: { params: { partnerId: string; leadId: string } }
) {
  const actor = await getAuthenticatedEcosystemUser()
  if (!actor) return NextResponse.json({ success: false, message: 'A verified MillionFlats account is required.' }, { status: 401 })
  const parsed = LeadUpdateSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ success: false, message: 'The lead update is invalid.' }, { status: 400 })
  try {
    await updatePartnerLead({
      partnerId: params.partnerId,
      leadId: params.leadId,
      actor,
      ...parsed.data,
      followUp: parsed.data.followUp
        ? { ...parsed.data.followUp, scheduledAt: new Date(parsed.data.followUp.scheduledAt) }
        : undefined,
    })
    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof PartnerAccessError) {
      return NextResponse.json({ success: false, message: error.message }, { status: error.status })
    }
    console.error('[ecosystem-leads] Failed to update partner lead', error)
    return NextResponse.json({ success: false, message: 'Unable to update partner lead.' }, { status: 500 })
  }
}
