export type UserIntelligenceSource = {
  emailVerified: boolean
  profileCompletion: number
  status?: string | null
  savedPropertiesCount: number
  propertyLeadsCount: number
  lastLogin?: string | Date | null
}

function clamp(value: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value))
}

export function getUserHealthScore(source: UserIntelligenceSource): number {
  const completionScore = clamp(source.profileCompletion, 0, 100) * 0.25
  const authScore = source.emailVerified ? 20 : 0
  const engagementScore = Math.min(source.savedPropertiesCount, 8) * 2 + Math.min(source.propertyLeadsCount, 8) * 2
  const statusScore = source.status === 'ACTIVE' ? 10 : source.status === 'SUSPENDED' ? 0 : 5
  const recentLoginScore = source.lastLogin
    ? new Date(source.lastLogin).getTime() > Date.now() - 30 * 24 * 60 * 60 * 1000
      ? 15
      : 0
    : 0

  return clamp(Math.round(completionScore + authScore + engagementScore + statusScore + recentLoginScore))
}

export function getLifecycleStage(source: UserIntelligenceSource): string {
  const status = String(source.status || '').toUpperCase()
  if (status === 'BANNED') return 'Banned'
  if (status === 'SUSPENDED') return 'Suspended'
  if (!source.emailVerified) return 'Identity Created'
  if (source.profileCompletion < 25) return 'Onboarding Started'
  if (source.profileCompletion < 50) return 'Profile 25%'
  if (source.profileCompletion < 75) return 'Profile 50%'
  if (source.profileCompletion < 100) return 'Profile 75%'
  if (source.propertyLeadsCount > 0) return 'Hot Lead'
  if (source.savedPropertiesCount > 0) return 'Property Engaged'
  return 'CRM Qualified'
}

export function getCRMStage(source: UserIntelligenceSource): string {
  const status = String(source.status || '').toUpperCase()
  if (status === 'BANNED') return 'Blocked'
  if (status === 'SUSPENDED') return 'Suspended'
  if (source.profileCompletion < 50) return 'Prospect'
  if (source.propertyLeadsCount > 0) return 'Active Lead'
  if (source.profileCompletion >= 100) return 'Qualified'
  return 'Nurturing'
}

export function getRecommendationConfidence(source: UserIntelligenceSource): 'High' | 'Medium' | 'Low' {
  if (source.profileCompletion >= 80 && getUserHealthScore(source) >= 70) return 'High'
  if (source.profileCompletion >= 50) return 'Medium'
  return 'Low'
}
