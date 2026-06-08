// Agent lifecycle/state machine aligned with the system architecture spec.
// AgentStatus drives all onboarding UI and permission enforcement.

export type AgentStatus =
  | 'REGISTERED'
  | 'EMAIL_VERIFIED'
  | 'PROFILE_INCOMPLETE'
  | 'PROFILE_COMPLETED'
  | 'DOCUMENTS_UPLOADED'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'SUSPENDED'

export type AgentLifecycleUx = {
  status: AgentStatus
  title: string
  message: string
  ctaLabel: string | null
  ctaHref: string | null
  progress: number // 0-100
  canAccessDashboard: boolean
  canListProperties: boolean
}

function asStatus(v: unknown): AgentStatus {
  const s = String(v || 'REGISTERED')
    .trim()
    .toUpperCase()
  const valid: AgentStatus[] = [
    'REGISTERED',
    'EMAIL_VERIFIED',
    'PROFILE_INCOMPLETE',
    'PROFILE_COMPLETED',
    'DOCUMENTS_UPLOADED',
    'UNDER_REVIEW',
    'APPROVED',
    'REJECTED',
    'SUSPENDED',
  ]
  return (valid.includes(s as AgentStatus) ? s : 'REGISTERED') as AgentStatus
}

export function getAgentLifecycleUx(input: { status: unknown }): AgentLifecycleUx {
  const status = asStatus(input.status)

  const BASE = {
    status,
    canAccessDashboard: false,
    canListProperties: false,
  }

  switch (status) {
    case 'REGISTERED':
      return {
        ...BASE,
        title: 'Verify your email',
        message: 'Please verify your email address to continue setting up your agent profile.',
        ctaLabel: 'Resend verification email',
        ctaHref: '/agent/verify-email',
        progress: 10,
      }

    case 'EMAIL_VERIFIED':
      return {
        ...BASE,
        title: 'Complete basic onboarding',
        message: 'Add your license number and company details to activate your Basic plan.',
        ctaLabel: 'Start onboarding',
        ctaHref: '/agent/onboarding',
        progress: 25,
      }

    case 'PROFILE_INCOMPLETE':
      return {
        ...BASE,
        canAccessDashboard: true,
        title: 'Complete your profile',
        message: 'Your profile is incomplete. Complete it to unlock all features.',
        ctaLabel: 'Complete profile',
        ctaHref: '/agent/profile',
        progress: 40,
      }

    case 'PROFILE_COMPLETED':
      return {
        ...BASE,
        canAccessDashboard: true,
        title: 'Upload verification documents',
        message: 'Upload your Government ID and real estate license to get approved.',
        ctaLabel: 'Go to Verification Center',
        ctaHref: '/agent/verification',
        progress: 55,
      }

    case 'DOCUMENTS_UPLOADED':
      return {
        ...BASE,
        canAccessDashboard: true,
        title: 'Documents submitted',
        message: 'Your documents have been submitted. Our team will review them shortly.',
        ctaLabel: 'View Verification Status',
        ctaHref: '/agent/verification',
        progress: 70,
      }

    case 'UNDER_REVIEW':
      return {
        ...BASE,
        canAccessDashboard: true,
        title: 'Under review',
        message:
          'Your profile is currently under review by our team. This typically takes 24–48 hours.',
        ctaLabel: 'View Verification Status',
        ctaHref: '/agent/verification',
        progress: 85,
      }

    case 'APPROVED':
      return {
        ...BASE,
        canAccessDashboard: true,
        canListProperties: true,
        title: 'Active Agent',
        message: 'Your account is approved. You can now list properties and receive leads.',
        ctaLabel: 'Go to Dashboard',
        ctaHref: '/agent/dashboard',
        progress: 100,
      }

    case 'REJECTED':
      return {
        ...BASE,
        title: 'Application rejected',
        message:
          'Your agent application was rejected. Please contact support or re-submit with updated documents.',
        ctaLabel: 'Resubmit documents',
        ctaHref: '/agent/verification',
        progress: 0,
      }

    case 'SUSPENDED':
      return {
        ...BASE,
        title: 'Account suspended',
        message: 'Your agent account has been suspended. Please contact support.',
        ctaLabel: 'Contact support',
        ctaHref: '/contact',
        progress: 0,
      }
  }
}

/** Feature gate — maps AgentStatus to which dashboard modules are accessible */
export type AgentDashboardModule =
  | 'overview'
  | 'properties'
  | 'add_property'
  | 'leads'
  | 'clients'
  | 'deals'
  | 'analytics'
  | 'subscription'
  | 'profile'
  | 'verification'
  | 'settings'

export function agentModuleAccessMap(status: AgentStatus): Record<AgentDashboardModule, boolean> {
  const approved = status === 'APPROVED'
  const hasBasicAccess =
    status === 'PROFILE_INCOMPLETE' ||
    status === 'PROFILE_COMPLETED' ||
    status === 'DOCUMENTS_UPLOADED' ||
    status === 'UNDER_REVIEW' ||
    approved

  return {
    overview: hasBasicAccess,
    properties: approved,
    add_property: approved,
    leads: approved,
    clients: approved,
    deals: approved,
    analytics: approved,
    subscription: hasBasicAccess,
    profile: hasBasicAccess,
    verification: hasBasicAccess,
    settings: hasBasicAccess,
  }
}
