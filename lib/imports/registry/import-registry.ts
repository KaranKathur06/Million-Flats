import type { ImportAdapter } from '@/lib/imports/core/types'
import { propertyImportAdapter } from '@/lib/imports/adapters/property/adapter'
import { developerImportAdapter } from '@/lib/imports/adapters/developer/adapter'
import { projectImportAdapter } from '@/lib/imports/adapters/project/adapter'
import { ecosystemPartnerImportAdapter } from '@/lib/imports/adapters/ecosystem-partner/adapter'
import { agencyImportAdapter } from '@/lib/imports/adapters/agency/adapter'
import { agentImportAdapter } from '@/lib/imports/adapters/agent/adapter'
import { leadImportAdapter } from '@/lib/imports/adapters/lead/adapter'

export const importRegistry = new Map<string, ImportAdapter<unknown>>()

function normalizeAdapterKey(value: string) {
  return String(value || '').trim().toLowerCase().replace(/[_\s]+/g, '-')
}

export function registerImportAdapter(adapter: ImportAdapter<unknown>) {
  importRegistry.set(normalizeAdapterKey(adapter.key), adapter)
  return adapter
}

export function getImportAdapter(key: string) {
  if (!key) return null
  return importRegistry.get(normalizeAdapterKey(key)) || null
}

export function getImportAdapterForEntity(entityType: string) {
  return getImportAdapter(String(entityType || '')) || null
}

export function listImportAdapters() {
  return Array.from(importRegistry.values()).map((adapter) => ({
    key: adapter.key.toUpperCase().replace(/-/g, '_'),
    displayName: adapter.displayName,
    supportedFormats: adapter.supportedFormats,
    supportedOperations: adapter.supportedOperations,
    adapterVersion: adapter.adapterVersion,
    fields: adapter.getFieldDefinitions(),
  }))
}

registerImportAdapter(propertyImportAdapter)
registerImportAdapter(developerImportAdapter)
registerImportAdapter(projectImportAdapter)
registerImportAdapter(ecosystemPartnerImportAdapter)
registerImportAdapter(agencyImportAdapter)
registerImportAdapter(agentImportAdapter)
registerImportAdapter(leadImportAdapter)
