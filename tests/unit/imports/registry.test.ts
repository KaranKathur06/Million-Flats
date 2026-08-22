import { describe, expect, it } from '@jest/globals'
import { propertyImportAdapter } from '@/lib/imports/adapters/property/adapter'
import { getImportAdapter, importRegistry, registerImportAdapter } from '@/lib/imports/registry'

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
})
