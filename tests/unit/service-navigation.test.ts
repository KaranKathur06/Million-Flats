import { describe, expect, it } from '@jest/globals'
import { SERVICE_NAV_ITEMS } from '@/lib/services/serviceNavigation'

describe('Services navigation', () => {
  it('exposes the five canonical business destinations in order', () => {
    expect(SERVICE_NAV_ITEMS.map(({ label, href }) => [label, href])).toEqual([
      ['3D Tours', '/services/3d-tours'],
      ['For Real Estate Developers', '/services/developers'],
      ['For Real Estate Agencies', '/services/agencies'],
      ['For Real Estate Agents', '/services/agents'],
      ['For Ecosystem Partners', '/ecosystem-partners'],
    ])
  })

  it('uses distinct GA4 event names for every destination', () => {
    const eventNames = SERVICE_NAV_ITEMS.map(({ eventName }) => eventName)
    expect(new Set(eventNames).size).toBe(5)
    expect(eventNames).not.toContain('services_partnerships_click')
  })
})