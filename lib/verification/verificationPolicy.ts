import type { AgentStatus, AgentVerificationStatus } from '@prisma/client'

export type VerificationPolicyDecision = {
  canList: boolean
  documentsRequired: boolean
  leadHandling: 'ALLOWED' | 'RESTRICTED' | 'ADMIN_QUEUE'
  reason: string | null
}

export function getAgentVerificationPolicy(input: {
  status: AgentStatus | string | null | undefined
  verificationStatus: AgentVerificationStatus | string | null | undefined
  documentsRequiredAt?: Date | null
}): VerificationPolicyDecision {
  const status = String(input.status || '').toUpperCase()
  const verificationStatus = String(input.verificationStatus || '').toUpperCase()
  const suspended = status === 'SUSPENDED' || status === 'REJECTED'
  const documentsRequired = Boolean(input.documentsRequiredAt) || ['PENDING', 'SUBMITTED', 'UNDER_REVIEW', 'REJECTED'].includes(verificationStatus)

  if (suspended) return { canList: false, documentsRequired, leadHandling: 'ADMIN_QUEUE', reason: 'This agent account requires administrative attention.' }
  return {
    canList: true,
    documentsRequired,
    leadHandling: documentsRequired && verificationStatus !== 'APPROVED' ? 'RESTRICTED' : 'ALLOWED',
    reason: documentsRequired ? 'Additional verification is required because this listing has received a customer inquiry.' : null,
  }
}

export async function triggerAgentVerification(db: { agent: { update: (args: any) => Promise<any> } }, agentId: string) {
  return db.agent.update({
    where: { id: agentId },
    data: { documentsRequiredAt: new Date(), verificationStatus: 'PENDING', verificationReason: 'First qualifying property inquiry received' },
    select: { id: true, verificationStatus: true, documentsRequiredAt: true },
  })
}