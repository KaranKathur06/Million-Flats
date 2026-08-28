import { describe, expect, it } from '@jest/globals'
import { propertyImportAdapter } from '@/lib/imports/adapters/property/adapter'
import { getImportAdapter, getImportAdapterForEntity, importRegistry, registerImportAdapter } from '@/lib/imports/registry'
import { developerImportAdapter } from '@/lib/imports/adapters/developer/adapter'
import { ecosystemPartnerImportAdapter } from '@/lib/imports/adapters/ecosystem-partner/adapter'

describe('import registry', () => {
  it('exposes the property adapter by default and allows explicit registration', () => {
    expect(importRegistry.get('property')).toBe(propertyImportAdapter)
    expect(getImportAdapter('property')).toBe(propertyImportAdapter)

    const adapter = { ...propertyImportAdapter, key: 'custom-property' }
    registerImportAdapter(adapter)

    expect(getImportAdapter('custom-property')).toBe(adapter)
  })

  it('normalizes adapter keys across case and separator variants', () => {
    const adapter = { ...propertyImportAdapter, key: 'Property Variant' }
    registerImportAdapter(adapter)

    expect(getImportAdapter('Property Variant')).toBe(adapter)
    expect(getImportAdapter('property-variant')).toBe(adapter)
    expect(getImportAdapter('PROPERTY_VARIANT')).toBe(adapter)
  })

  it('resolves each entity only to its canonical adapter', () => {
    expect(getImportAdapterForEntity('DEVELOPER')).toBe(developerImportAdapter)
    expect(getImportAdapterForEntity('ecosystem-partner')).toBe(ecosystemPartnerImportAdapter)
    expect(getImportAdapterForEntity('unknown')).toBeNull()
  })
})
