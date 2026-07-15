/**
 * Asset Authorization Engine
 * ─────────────────────────────────────────────────────────────────────
 * Classifies S3 keys into security tiers and enforces RBAC-based access
 * control before generating signed URLs.
 *
 * Every asset request flows through:
 *   1. classifyAsset(s3Key) → determines security tier + required role
 *   2. authorizeAssetAccess(user, s3Key) → validates permissions
 *   3. CloudFront signed URL generation (in cloudfront.ts)
 *   4. Access logging (in assetTracking.ts)
 */

import { ASSET_TTL } from '@/lib/cloudfront'

// ─── Types ──────────────────────────────────────────────────────────────────

export type AssetTier = 'public' | 'protected' | 'private' | 'premium'

export type AssetClassification = {
  tier: AssetTier
  requiredRole: AssetRequiredRole
  ttl: number
  trackable: boolean
  assetType: string
  description: string
}

export type AssetRequiredRole =
  | 'GUEST'
  | 'USER'
  | 'AGENT'
  | 'AGENT_APPROVED'
  | 'PREMIUM'
  | 'ADMIN'
  | 'OWNER'

export type AssetAccessResult =
  | { allowed: true; classification: AssetClassification }
  | { allowed: false; reason: string; statusCode: number }

type UserContext = {
  userId?: string | null
  role?: string | null
  agentId?: string | null
  agentStatus?: string | null
  subscriptionPlan?: string | null
}

// ─── Classification Rules ───────────────────────────────────────────────────

/**
 * Ordered classification rules. First match wins.
 * More specific patterns must come before generic ones.
 */
const CLASSIFICATION_RULES: Array<{
  pattern: RegExp
  classification: AssetClassification
}> = [
    // ── Private: Agent verification documents ──
    {
      pattern: /^private\/agents\//,
      classification: {
        tier: 'private',
        requiredRole: 'OWNER',
        ttl: ASSET_TTL.PRIVATE,
        trackable: true,
        assetType: 'agent_document',
        description: 'Agent verification documents (ID, license, passport)',
      },
    },

    // ── Private: Ecosystem partner documents ──
    {
      pattern: /^private\/ecosystem\//,
      classification: {
        tier: 'private',
        requiredRole: 'ADMIN',
        ttl: ASSET_TTL.PRIVATE,
        trackable: true,
        assetType: 'ecosystem_document',
        description: 'Ecosystem partner registration documents',
      },
    },

    // ── Private: AI system documents (formerly AI) ──
    {
      pattern: /^private\/(ai|AI)\//,
      classification: {
        tier: 'private',
        requiredRole: 'AGENT_APPROVED',
        ttl: ASSET_TTL.AI_SYSTEM,
        trackable: true,
        assetType: 'ai_document',
        description: 'AI system protected documents',
      },
    },

    // ── Private: Lead magnet PDFs ──
    {
      pattern: /^private\/lead-magnets\//,
      classification: {
        tier: 'protected',
        requiredRole: 'USER',
        ttl: ASSET_TTL.PROTECTED_DOWNLOAD,
        trackable: true,
        assetType: 'lead_magnet',
        description: 'Lead magnet downloadable PDFs',
      },
    },

    // ── Protected: Project brochures ──
    {
      pattern: /^(public|protected)\/projects\/.*\/brochure\//,
      classification: {
        tier: 'protected',
        requiredRole: 'USER',
        ttl: ASSET_TTL.PROTECTED_DOWNLOAD,
        trackable: true,
        assetType: 'brochure',
        description: 'Project brochure PDFs',
      },
    },

    // ── Protected: Floor plans ──
    {
      pattern: /^(public|protected)\/projects\/.*\/floor-plans?\//,
      classification: {
        tier: 'protected',
        requiredRole: 'USER',
        ttl: ASSET_TTL.PROTECTED_VIEW,
        trackable: true,
        assetType: 'floor_plan',
        description: 'Project floor plan images',
      },
    },

    // ── Protected: Premium investor content ──
    {
      pattern: /^protected\/premium\//,
      classification: {
        tier: 'premium',
        requiredRole: 'PREMIUM',
        ttl: ASSET_TTL.PREMIUM,
        trackable: true,
        assetType: 'premium_content',
        description: 'Premium investor guides and reports',
      },
    },

    // ── Protected: DAMAC partner assets ──
    {
      pattern: /^protected\/damac\//,
      classification: {
        tier: 'protected',
        requiredRole: 'AGENT',
        ttl: ASSET_TTL.PARTNER,
        trackable: true,
        assetType: 'damac_asset',
        description: 'DAMAC partnership protected assets',
      },
    },

    // ── Public: Project gallery / hero / interior / exterior / amenities ──
    {
      pattern: /^public\/projects\//,
      classification: {
        tier: 'public',
        requiredRole: 'GUEST',
        ttl: ASSET_TTL.PUBLIC,
        trackable: false,
        assetType: 'project_image',
        description: 'Project gallery and media images',
      },
    },

    // ── Public: Developer logos ──
    {
      pattern: /^public\/developers\//,
      classification: {
        tier: 'public',
        requiredRole: 'GUEST',
        ttl: ASSET_TTL.PUBLIC,
        trackable: false,
        assetType: 'developer_logo',
        description: 'Developer logos and branding',
      },
    },

    // ── Public: Blog images ──
    {
      pattern: /^public\/blogs\//,
      classification: {
        tier: 'public',
        requiredRole: 'GUEST',
        ttl: ASSET_TTL.PUBLIC,
        trackable: false,
        assetType: 'blog_image',
        description: 'Blog featured images',
      },
    },

    // ── Public: Agent profile photos ──
    {
      pattern: /^public\/agents\//,
      classification: {
        tier: 'public',
        requiredRole: 'GUEST',
        ttl: ASSET_TTL.PUBLIC,
        trackable: false,
        assetType: 'agent_photo',
        description: 'Agent profile photos',
      },
    },

    // ── Public: Property images ──
    {
      pattern: /^public\/properties\//,
      classification: {
        tier: 'public',
        requiredRole: 'GUEST',
        ttl: ASSET_TTL.PUBLIC,
        trackable: false,
        assetType: 'property_image',
        description: 'Property listing images',
      },
    },

    // ── Public: Ecosystem partner logos ──
    {
      pattern: /^public\/ecosystem\//,
      classification: {
        tier: 'public',
        requiredRole: 'GUEST',
        ttl: ASSET_TTL.PUBLIC,
        trackable: false,
        assetType: 'ecosystem_logo',
        description: 'Ecosystem partner logos',
      },
    },
  ]

/**
 * Default classification for unmatched keys.
 * Conservative: treat as private, require admin access.
 */
const DEFAULT_CLASSIFICATION: AssetClassification = {
  tier: 'private',
  requiredRole: 'ADMIN',
  ttl: ASSET_TTL.PRIVATE,
  trackable: true,
  assetType: 'unknown',
  description: 'Unclassified asset — admin access required',
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Classify an S3 key into its security tier and access requirements.
 */
export function classifyAsset(s3Key: string): AssetClassification {
  const normalizedKey = normalizeS3Key(s3Key)

  for (const rule of CLASSIFICATION_RULES) {
    if (rule.pattern.test(normalizedKey)) {
      return rule.classification
    }
  }

  return DEFAULT_CLASSIFICATION
}

/**
 * Authorize a user's access to a specific S3 asset.
 *
 * @param user - The authenticated user context (null for guests)
 * @param s3Key - The S3 object key to access
 * @param ownerAgentId - For OWNER-tier assets, the owning agent's ID
 */
export function authorizeAssetAccess(params: {
  user: UserContext | null
  s3Key: string
  ownerAgentId?: string | null
}): AssetAccessResult {
  const classification = classifyAsset(params.s3Key)
  const { requiredRole } = classification
  const user = params.user

  // Guest access — no auth needed
  if (requiredRole === 'GUEST') {
    return { allowed: true, classification }
  }

  // All other tiers require authentication
  if (!user?.userId) {
    return {
      allowed: false,
      reason: 'Authentication required',
      statusCode: 401,
    }
  }

  const userRole = String(user.role || 'USER').toUpperCase()

  // Superadmin/Admin bypass — can access everything
  if (userRole === 'SUPERADMIN' || userRole === 'ADMIN') {
    return { allowed: true, classification }
  }

  // Role-based checks
  switch (requiredRole) {
    case 'USER':
      // Any authenticated user
      return { allowed: true, classification }

    case 'AGENT':
      if (userRole !== 'AGENT') {
        return { allowed: false, reason: 'Agent access required', statusCode: 403 }
      }
      return { allowed: true, classification }

    case 'AGENT_APPROVED':
      if (userRole !== 'AGENT') {
        return { allowed: false, reason: 'Approved agent access required', statusCode: 403 }
      }
      if (String(user.agentStatus || '').toUpperCase() !== 'APPROVED') {
        return { allowed: false, reason: 'Agent approval required', statusCode: 403 }
      }
      return { allowed: true, classification }

    case 'PREMIUM':
      if (!isPremiumUser(user)) {
        return { allowed: false, reason: 'Premium subscription required', statusCode: 403 }
      }
      return { allowed: true, classification }

    case 'OWNER':
      // Agent can access their own documents; admin override already handled above
      if (userRole !== 'AGENT') {
        return { allowed: false, reason: 'Agent access required', statusCode: 403 }
      }
      if (params.ownerAgentId && user.agentId !== params.ownerAgentId) {
        return { allowed: false, reason: 'You can only access your own documents', statusCode: 403 }
      }
      return { allowed: true, classification }

    case 'ADMIN':
      // Already handled above — non-admin hits this
      return { allowed: false, reason: 'Administrator access required', statusCode: 403 }

    default:
      return { allowed: false, reason: 'Access denied', statusCode: 403 }
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function normalizeS3Key(key: string): string {
  return String(key || '')
    .trim()
    .replace(/^\/+/, '')
    .replace(/\/+/g, '/')
}

function isPremiumUser(user: UserContext): boolean {
  const plan = String(user.subscriptionPlan || '').toUpperCase()
  return plan === 'PREMIUM' || plan === 'PROFESSIONAL'
}

/**
 * Extract the agent ID from an agent document S3 key.
 * Pattern: private/agents/{agentId}/documents/...
 */
export function extractAgentIdFromKey(s3Key: string): string | null {
  const normalized = normalizeS3Key(s3Key)
  const match = normalized.match(/^private\/agents\/([a-zA-Z0-9_-]+)\//)
  return match ? match[1] : null
}
