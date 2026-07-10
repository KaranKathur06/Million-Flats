// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MillionFlats AI Intelligence Platform — Provider Registry
// Phase 2: Provider Framework
//
// Central registry for all data providers. Manages registration, discovery,
// health monitoring, and priority ordering.
//
// Usage:
//   registry.register(provider, { priority: 10, enabled: true })
//   const listings = registry.getProviders('PLATFORM_LISTINGS')
//   const temporary = registry.getTemporaryProviders() // For audit
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import type {
  IDataProvider,
  ProviderCategory,
  ProviderRegistration,
  ProviderHealthStatus,
} from './types'

// ─── Registry State ──────────────────────────────────────────────────────────

const registrations: Map<string, ProviderRegistration> = new Map()

// ─── Register ────────────────────────────────────────────────────────────────

/**
 * Register a data provider with the registry.
 * If a provider with the same name already exists, it will be replaced.
 */
export function registerProvider(
  provider: IDataProvider,
  options: { priority?: number; enabled?: boolean; config?: Record<string, unknown> } = {}
): void {
  const registration: ProviderRegistration = {
    provider,
    priority: options.priority ?? 0,
    enabled: options.enabled ?? true,
    config: options.config,
  }

  registrations.set(provider.name, registration)
}

/**
 * Unregister a provider by name.
 */
export function unregisterProvider(name: string): boolean {
  return registrations.delete(name)
}

// ─── Query ───────────────────────────────────────────────────────────────────

/**
 * Get all registered providers, optionally filtered by category.
 * Returns enabled providers sorted by priority (highest first).
 */
export function getProviders(category?: ProviderCategory): IDataProvider[] {
  let entries = [...registrations.values()]

  // Filter enabled only
  entries = entries.filter(r => r.enabled)

  // Filter by category if specified
  if (category) {
    entries = entries.filter(r => r.provider.category === category)
  }

  // Sort by priority (highest first)
  entries.sort((a, b) => b.priority - a.priority)

  return entries.map(r => r.provider)
}

/**
 * Get a specific provider by name.
 */
export function getProvider(name: string): IDataProvider | undefined {
  const reg = registrations.get(name)
  return reg?.enabled ? reg.provider : undefined
}

/**
 * Get all providers marked as temporary (demo data).
 * Useful for auditing which providers need to be replaced before production.
 */
export function getTemporaryProviders(): IDataProvider[] {
  return [...registrations.values()]
    .filter(r => r.provider.isTemporary)
    .map(r => r.provider)
}

/**
 * Get all production (non-temporary) providers.
 */
export function getProductionProviders(): IDataProvider[] {
  return [...registrations.values()]
    .filter(r => !r.provider.isTemporary && r.enabled)
    .map(r => r.provider)
}

/**
 * Get unique categories that have at least one registered provider.
 */
export function getActiveCategories(): ProviderCategory[] {
  const categories = new Set<ProviderCategory>()
  for (const reg of registrations.values()) {
    if (reg.enabled) {
      categories.add(reg.provider.category)
    }
  }
  return [...categories]
}

// ─── Health ──────────────────────────────────────────────────────────────────

/**
 * Get health status for all registered providers.
 */
export function getAllHealthStatuses(): Array<{
  name: string
  displayName: string
  category: ProviderCategory
  isTemporary: boolean
  enabled: boolean
  health: ProviderHealthStatus
}> {
  return [...registrations.values()].map(reg => ({
    name: reg.provider.name,
    displayName: reg.provider.displayName,
    category: reg.provider.category,
    isTemporary: reg.provider.isTemporary,
    enabled: reg.enabled,
    health: reg.provider.getHealth(),
  }))
}

/**
 * Check if the registry has any healthy providers for a given category.
 */
export function hasHealthyProvider(category: ProviderCategory): boolean {
  return getProviders(category).some(p => {
    const health = p.getHealth()
    return health.status === 'HEALTHY' || health.status === 'DEGRADED'
  })
}

// ─── Admin ───────────────────────────────────────────────────────────────────

/**
 * Enable or disable a provider by name.
 */
export function setProviderEnabled(name: string, enabled: boolean): boolean {
  const reg = registrations.get(name)
  if (!reg) return false
  reg.enabled = enabled
  return true
}

/**
 * Update provider priority.
 */
export function setProviderPriority(name: string, priority: number): boolean {
  const reg = registrations.get(name)
  if (!reg) return false
  reg.priority = priority
  return true
}

/**
 * Get total count of registered providers.
 */
export function getProviderCount(): {
  total: number
  enabled: number
  temporary: number
  production: number
} {
  const all = [...registrations.values()]
  return {
    total: all.length,
    enabled: all.filter(r => r.enabled).length,
    temporary: all.filter(r => r.provider.isTemporary).length,
    production: all.filter(r => !r.provider.isTemporary).length,
  }
}

/**
 * Get full registry summary for diagnostics.
 */
export function getRegistrySummary(): {
  providers: Array<{
    name: string
    displayName: string
    category: ProviderCategory
    isTemporary: boolean
    enabled: boolean
    priority: number
    confidence: number
    freshness: { isStale: boolean; lastFetchAt?: string }
    health: ProviderHealthStatus
  }>
  categories: ProviderCategory[]
  counts: ReturnType<typeof getProviderCount>
} {
  return {
    providers: [...registrations.values()].map(reg => ({
      name: reg.provider.name,
      displayName: reg.provider.displayName,
      category: reg.provider.category,
      isTemporary: reg.provider.isTemporary,
      enabled: reg.enabled,
      priority: reg.priority,
      confidence: reg.provider.getConfidence(),
      freshness: reg.provider.getFreshness(),
      health: reg.provider.getHealth(),
    })),
    categories: getActiveCategories(),
    counts: getProviderCount(),
  }
}
