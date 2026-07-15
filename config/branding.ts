/**
 * Branding Abstraction Layer
 * ─────────────────────────────────────────────────────────────────────
 * Single source of truth for all brand names across the platform.
 * Future rename = change this ONE file.
 *
 * Feature flag: USE_AI_BRANDING controls rollback capability.
 */

// ─── Feature Flag ───────────────────────────────────────────────────────────
export const USE_AI_BRANDING = true

// ─── System Brand ───────────────────────────────────────────────────────────
export const BRAND = {
  /** System-level brand name */
  SYSTEM_NAME: 'AI System',
  SYSTEM_NAME_TM: 'AI System™',

  /** AI engine suite label */
  SUITE_NAME: 'AI',
  SUITE_NAME_TM: 'AI™',

  /** Legacy name — for backward compat references */
  LEGACY_SYSTEM_NAME: 'AI System',
  LEGACY_SUITE_NAME: 'AI',
} as const

// ─── Product Names ──────────────────────────────────────────────────────────
export const PRODUCTS = {
  VIEW: {
    name: 'AIView',
    nameTM: 'AIView™',
    subtitle: 'Authenticity',
    description: 'Detects manipulated images and ensures the listing matches reality.',
    legacy: 'AIView',
  },
  SHIELD: {
    name: 'AIShield',
    nameTM: 'AIShield™',
    subtitle: 'Pricing Fairness',
    description: 'Compares against 50+ localized data points to flag over-pricing or uncover severe under-pricing.',
    legacy: 'AIShield',
  },
  INDEX: {
    name: 'AIIndex',
    nameTM: 'AIIndex™',
    subtitle: 'Investment Potential',
    description: 'Forecasts 1-5 year asset value based on infrastructure influx, demand, and micro-market trends.',
    legacy: 'AIIndex',
  },
  TITLE: {
    name: 'AITitle',
    nameTM: 'AITitle™',
    subtitle: 'Legal Safety',
    description: 'Cross-references title records, municipal approvals, and litigation history to flag risks.',
    legacy: 'AITitle',
  },
  PRO: {
    name: 'AIPro',
    nameTM: 'AIPro™',
    subtitle: 'Agent Performance',
    description: 'Scores real estate agents on response time, closure rate, and client satisfaction.',
    legacy: 'AIPro',
  },
} as const

// ─── Route Mappings ─────────────────────────────────────────────────────────
export const ROUTES = {
  SYSTEM: '/ai-system',
  VIEW: '/ai/view',
  SHIELD: '/ai/shield',
  INDEX: '/ai/index',
  TITLE: '/ai/title',
  PRO: '/ai/pro',

  // Legacy routes (for redirect mapping)
  LEGACY_SYSTEM: '/verfix-system',
  LEGACY_VIEW: '/AI/view',
  LEGACY_SHIELD: '/AI/shield',
  LEGACY_INDEX: '/AI/index',
  LEGACY_TITLE: '/AI/title',
  LEGACY_PRO: '/AI/pro',
} as const

// ─── Analytics Events ───────────────────────────────────────────────────────
export const ANALYTICS_EVENTS = {
  CLICK: 'ai_click',
  VIEW_IMPRESSION: 'ai_view_impression',
  SHIELD_IMPRESSION: 'ai_shield_impression',

  // Legacy event names (keep for backward compat in analytics dashboards)
  LEGACY_CLICK: 'AI_click',
} as const

// ─── Score Labels ───────────────────────────────────────────────────────────
export const LABELS = {
  SCORE: 'AI Score',
  TRUST_SCORE: 'AI Trust Score',
  VERIFIED: 'AI Verified',
  ACCESS_LEVEL: 'AI Access Level',

  LEGACY_SCORE: 'AI Score',
  LEGACY_TRUST_SCORE: 'AI Trust Score',
} as const
