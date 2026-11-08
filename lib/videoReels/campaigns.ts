import { z } from 'zod'

export type CampaignInterval = {
  id: string
  startAt: Date
  endAt: Date
  allocationBps: number
}

export class AllocationConflictError extends Error {
  constructor() {
    super('Scheduled campaign allocations exceed the configured inventory')
    this.name = 'AllocationConflictError'
  }
}

export function assertAllocationScheduleAvailable(
  existing: CampaignInterval[],
  proposed: CampaignInterval,
  maxAllocationBps: number,
) {
  const intervals = [...existing, proposed]
  const events = intervals.flatMap((interval) => [
    { time: interval.startAt.getTime(), delta: interval.allocationBps },
    { time: interval.endAt.getTime(), delta: -interval.allocationBps },
  ]).sort((left, right) => left.time - right.time || left.delta - right.delta)

  let activeAllocation = 0
  for (const event of events) {
    activeAllocation += event.delta
    if (activeAllocation > maxAllocationBps) throw new AllocationConflictError()
  }
}

export const CampaignDestinationSchema = z.string().trim().max(2048).transform((value, context) => {
  if (!value) return null
  if (/[\u0000-\u001f\u007f\\]/.test(value) || value.startsWith('//')) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: 'Invalid destination' })
    return z.NEVER
  }

  if (value.startsWith('/')) {
    if (!/^\/(?:projects|properties)\/[a-zA-Z0-9._~!$&'()*+,;=:@%/-]*$/.test(value) || value.includes('..')) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: 'Destination must be a public property or project route' })
      return z.NEVER
    }
    return value
  }

  try {
    const url = new URL(value)
    if (url.protocol !== 'https:' || !url.hostname || url.username || url.password) throw new Error('invalid')
    return url.toString()
  } catch {
    context.addIssue({ code: z.ZodIssueCode.custom, message: 'Destination must use HTTPS' })
    return z.NEVER
  }
})

