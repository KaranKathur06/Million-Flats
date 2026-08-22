import type { ImportAdapter } from '@/lib/imports/core/types'
import { propertyImportAdapter } from '@/lib/imports/adapters/property/adapter'

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

registerImportAdapter(propertyImportAdapter)
