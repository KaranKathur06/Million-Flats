/**
 * Central route guard utility for agent portal navigation
 * Determines access permissions and smart redirect paths based on agent status
 */

import { AgentStatus, agentModuleAccessMap, getAgentLifecycleUx, type AgentDashboardModule } from './agentLifecycle'

export type NavItemKey = 'dashboard' | 'properties' | 'leads' | 'profile' | 'verification' | 'subscription'

export interface NavItemConfig {
  key: NavItemKey
  label: string
  href: string
  module: AgentDashboardModule
  icon?: string
}

export const AGENT_NAV_ITEMS: NavItemConfig[] = [
  { key: 'dashboard', label: 'Dashboard', href: '/agent/dashboard', module: 'overview' },
  { key: 'properties', label: 'Properties', href: '/agent/properties', module: 'properties' },
  { key: 'leads', label: 'Leads', href: '/agent/leads', module: 'leads' },
  { key: 'profile', label: 'Profile', href: '/agent/profile', module: 'profile' },
  { key: 'verification', label: 'Verification', href: '/agent/verification', module: 'verification' },
  { key: 'subscription', label: 'Subscription', href: '/agent/subscription', module: 'subscription' },
]

export interface AccessCheckResult {
  canAccess: boolean
  reason?: 'profile_incomplete' | 'documents_not_uploaded' | 'under_review' | 'not_approved' | 'rejected' | 'suspended'
  primaryAction: {
    label: string
    href: string
  }
  secondaryAction?: {
    label: string
    href: string
  }
  message: string
}

/**
 * Check if agent can access a specific navigation item
 * Returns access status with smart redirect actions
 */
export function checkAgentAccess(
  status: AgentStatus,
  navKey: NavItemKey
): AccessCheckResult {
  const accessMap = agentModuleAccessMap(status)
  const navItem = AGENT_NAV_ITEMS.find(n => n.key === navKey)
  
  if (!navItem) {
    return {
      canAccess: false,
      reason: 'not_approved',
      primaryAction: { label: 'Go to Dashboard', href: '/agent/dashboard' },
      message: 'This feature is not available.',
    }
  }

  const hasAccess = accessMap[navItem.module]
  
  if (hasAccess) {
    return {
      canAccess: true,
      primaryAction: { label: 'Continue', href: navItem.href },
      message: '',
    }
  }

  // Determine why access is denied and provide smart actions
  const lifecycle = getAgentLifecycleUx({ status })

  switch (status) {
    case 'REGISTERED':
    case 'EMAIL_VERIFIED':
      return {
        canAccess: false,
        reason: 'profile_incomplete',
        primaryAction: { label: 'Complete Profile', href: '/agent/profile' },
        secondaryAction: { label: 'Go to Dashboard', href: '/agent/dashboard' },
        message: 'You need to complete your profile setup before accessing this feature.',
      }

    case 'PROFILE_INCOMPLETE':
      return {
        canAccess: false,
        reason: 'profile_incomplete',
        primaryAction: { label: 'Complete Profile', href: '/agent/profile' },
        secondaryAction: { label: 'Go to Dashboard', href: '/agent/dashboard' },
        message: 'Complete your profile information to unlock this feature.',
      }

    case 'PROFILE_COMPLETED':
      return {
        canAccess: false,
        reason: 'documents_not_uploaded',
        primaryAction: { label: 'Upload Documents', href: '/agent/verification' },
        secondaryAction: { label: 'Go to Dashboard', href: '/agent/dashboard' },
        message: 'Upload your verification documents to access this feature.',
      }

    case 'DOCUMENTS_UPLOADED':
    case 'UNDER_REVIEW':
      return {
        canAccess: false,
        reason: 'under_review',
        primaryAction: { label: 'View Status', href: '/agent/verification' },
        secondaryAction: { label: 'Go to Dashboard', href: '/agent/dashboard' },
        message: 'Your account is under review. This feature will unlock once approved.',
      }

    case 'REJECTED':
      return {
        canAccess: false,
        reason: 'rejected',
        primaryAction: { label: 'Resubmit Documents', href: '/agent/verification' },
        secondaryAction: { label: 'Contact Support', href: '/contact' },
        message: 'Your application was rejected. Please resubmit with updated documents.',
      }

    case 'SUSPENDED':
      return {
        canAccess: false,
        reason: 'suspended',
        primaryAction: { label: 'Contact Support', href: '/contact' },
        message: 'Your account has been suspended. Please contact support.',
      }

    default:
      return {
        canAccess: false,
        reason: 'not_approved',
        primaryAction: lifecycle.ctaLabel && lifecycle.ctaHref 
          ? { label: lifecycle.ctaLabel, href: lifecycle.ctaHref }
          : { label: 'Go to Dashboard', href: '/agent/dashboard' },
        message: lifecycle.message,
      }
  }
}

/**
 * Get the appropriate redirect path for an agent based on their status
 */
export function getAgentRedirectPath(status: AgentStatus): string {
  const lifecycle = getAgentLifecycleUx({ status })
  return lifecycle.ctaHref || '/agent/dashboard'
}

/**
 * Check if navigation should show access modal instead of direct navigation
 */
export function shouldShowAccessModal(status: AgentStatus, navKey: NavItemKey): boolean {
  const result = checkAgentAccess(status, navKey)
  return !result.canAccess
}
