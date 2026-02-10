export type AgentProfileStatus = 'DRAFT' | 'SUBMITTED' | 'VERIFIED' | 'LIVE' | 'SUSPENDED'

export type AgentLifecycleUx = {
  status: AgentProfileStatus
  title: string
  message: string
  ctaLabel: string | null
  ctaHref: string | null
}

function asStatus(v: unknown): AgentProfileStatus {
  const s = String(v || 'DRAFT').trim().toUpperCase()
  if (s === 'SUBMITTED' || s === 'VERIFIED' || s === 'LIVE' || s === 'SUSPENDED') return s
  return 'DRAFT'
}

export function getAgentLifecycleUx(input: {
  profileStatus: unknown
}): AgentLifecycleUx {
  const status = asStatus(input.profileStatus)

  if (status === 'DRAFT') {
    return {
      status,
      title: 'Complete your profile',
      message: 'Finish your agent profile and submit it for verification.',
      ctaLabel: 'Complete profile',
      ctaHref: null,
    }
  }

  if (status === 'SUBMITTED') {
    return {
      status,
      title: 'Under review',
      message: 'Your profile has been submitted and is currently under review.',
      ctaLabel: null,
      ctaHref: null,
    }
  }

  if (status === 'VERIFIED') {
    return {
      status,
      title: 'Verified',
      message: 'Your documents are verified. Your profile is ready to go live when activated by admin.',
      ctaLabel: null,
      ctaHref: null,
    }
  }

  if (status === 'LIVE') {
    return {
      status,
      title: 'Live',
      message: 'Your agent profile is live.',
      ctaLabel: 'Go to dashboard',
      ctaHref: '/agent/dashboard',
    }
  }

  return {
    status,
    title: 'Suspended',
    message: 'Your agent account is suspended. Please contact support.',
    ctaLabel: null,
    ctaHref: null,
  }
}
