import { describe, expect, it } from '@jest/globals'
import { mapLeadForDisplay } from '@/lib/leads/mapLeadForDisplay'

describe('mapLeadForDisplay', () => {
  it('includes utm term and content in the display payload', () => {
    const lead = mapLeadForDisplay({
      id: 'lead-1',
      leadType: 'CONTACT',
      category: 'BUY',
      name: 'Test User',
      email: 'test@example.com',
      phone: null,
      country: 'UAE',
      status: 'NEW',
      assignedTo: null,
      createdAt: new Date('2024-01-01T00:00:00.000Z'),
      updatedAt: new Date('2024-01-02T00:00:00.000Z'),
      utmSource: 'google',
      utmMedium: 'cpc',
      utmCampaign: 'spring',
      utmTerm: 'duplex',
      utmContent: 'hero-button',
    })

    expect(lead.utmTerm).toBe('duplex')
    expect(lead.utmContent).toBe('hero-button')
  })
})
