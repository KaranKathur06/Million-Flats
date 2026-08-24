export function getAgentAuthRedirect(params: {
  status: unknown
  emailVerified: boolean
  email?: string | null
}) {
  const status = String(params.status || '').toUpperCase()
  const email = typeof params.email === 'string' ? encodeURIComponent(params.email) : ''

  if (!params.emailVerified && (status === '' || status === 'REGISTERED')) {
    return `/agent/verify${email ? `?email=${email}` : ''}`
  }
  if (status === 'REGISTERED' || status === 'EMAIL_VERIFIED') return '/agent/onboarding'
  if (status === 'PROFILE_INCOMPLETE') return '/agent/profile'
  if (status === 'PROFILE_COMPLETED') return '/agent/verification'
  if (status === 'DOCUMENTS_UPLOADED' || status === 'UNDER_REVIEW') {
    return `/agent/on-hold?reason=${status.toLowerCase()}`
  }
  if (status === 'REJECTED') return '/agent/rejected'
  if (status === 'SUSPENDED') return '/agent/suspended'
  return '/agent/dashboard'
}