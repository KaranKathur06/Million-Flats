import { describe, expect, it } from '@jest/globals'
import { chooseCampaignForOpportunity, getSponsoredPositions } from '@/lib/videoReels/policy'

describe('video reels scheduling policy', () => {
  it('places sponsored cards on every configured cadence window', () => {
    expect(getSponsoredPositions(0, 12, 4)).toEqual([3, 7, 11])
    expect(getSponsoredPositions(3, 10, 4)).toEqual([0, 4, 8])
    expect(() => getSponsoredPositions(0, 10, 3)).toThrow('Invalid sponsored cadence')
  })

  it('selects the highest-deficit eligible campaign while respecting the max allocation ceiling', () => {
    const campaigns = [
      { id: 'campaign-a', ownerUserId: 'user-1', allocationBps: 4500, adminPriority: 25, deliverable: true, frequencyCap: 3 },
      { id: 'campaign-b', ownerUserId: 'user-2', allocationBps: 3000, adminPriority: 18, deliverable: true, frequencyCap: 2 },
    ]

    const result = chooseCampaignForOpportunity({
      campaigns,
      deficits: {},
      maxAllocationBps: 10_000,
      sequence: 1,
      advertisersAlreadyServedInBlock: new Set(),
    })

    expect(result).toMatchObject({
      campaignId: 'campaign-a',
      allocatedCampaignId: 'campaign-a',
      houseSelected: false,
    })
    expect(result.deficits['campaign-a']).toBe(-5_500)
    expect(result.deficits['campaign-b']).toBe(3_000)
  })

  it('falls back to house inventory when the selected advertiser would violate the fairness block', () => {
    const campaigns = [
      { id: 'campaign-a', ownerUserId: 'user-1', allocationBps: 4000, adminPriority: 25, deliverable: true, frequencyCap: 2 },
      { id: 'campaign-b', ownerUserId: 'user-2', allocationBps: 3000, adminPriority: 18, deliverable: true, frequencyCap: 2 },
    ]

    const result = chooseCampaignForOpportunity({
      campaigns,
      deficits: {},
      maxAllocationBps: 10_000,
      sequence: 1,
      advertisersAlreadyServedInBlock: new Set(['0:user-1']),
    })

    expect(result).toMatchObject({
      campaignId: null,
      allocatedCampaignId: 'campaign-a',
      houseSelected: true,
    })
    expect(result.deficits['__house__']).toBe(3_000)
  })
})
