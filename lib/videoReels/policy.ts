export type RotationCampaign = {
  id: string
  ownerUserId: string
  allocationBps: number
  adminPriority: number
  deliverable: boolean
  frequencyCap: number
}

export type RotationDeficits = Record<string, number>

export function getSponsoredPositions(startOffset: number, count: number, interval: number) {
  if (!Number.isSafeInteger(startOffset) || startOffset < 0) throw new Error('Invalid feed offset')
  if (!Number.isSafeInteger(count) || count < 0) throw new Error('Invalid feed size')
  if (!Number.isSafeInteger(interval) || interval < 4) throw new Error('Invalid sponsored cadence')

  const positions: number[] = []
  for (let index = 0; index < count; index += 1) {
    if ((startOffset + index + 1) % interval === 0) positions.push(index)
  }
  return positions
}

export function chooseCampaignForOpportunity(params: {
  campaigns: RotationCampaign[]
  deficits: RotationDeficits
  maxAllocationBps: number
  sequence: number
  advertisersAlreadyServedInBlock: ReadonlySet<string>
}) {
  const { campaigns, maxAllocationBps, sequence, advertisersAlreadyServedInBlock } = params
  if (!Number.isSafeInteger(sequence) || sequence < 1) throw new Error('Invalid opportunity sequence')
  if (!Number.isSafeInteger(maxAllocationBps) || maxAllocationBps < 1 || maxAllocationBps > 10_000) {
    throw new Error('Invalid allocation ceiling')
  }

  const campaignIds = new Set<string>()
  const allocationTotal = campaigns.reduce((total, campaign) => {
    if (campaignIds.has(campaign.id)) throw new Error('Duplicate campaign allocation')
    campaignIds.add(campaign.id)
    if (!Number.isSafeInteger(campaign.allocationBps) || campaign.allocationBps < 1 || campaign.allocationBps > maxAllocationBps) {
      throw new Error('Campaign allocation is outside configured bounds')
    }
    if (!Number.isSafeInteger(campaign.frequencyCap) || campaign.frequencyCap < 1) {
      throw new Error('Invalid campaign frequency cap')
    }
    return total + campaign.allocationBps
  }, 0)

  if (allocationTotal > 10_000) throw new Error('Scheduled campaign allocations exceed inventory')

  const deficits: RotationDeficits = { ...params.deficits }
  for (const id of Object.keys(deficits)) {
    if (!Number.isFinite(deficits[id])) throw new Error('Invalid allocation scheduler state')
  }

  for (const campaign of campaigns) {
    deficits[campaign.id] = (deficits[campaign.id] || 0) + campaign.allocationBps
  }
  const houseWeight = 10_000 - allocationTotal
  deficits.__house__ = (deficits.__house__ || 0) + houseWeight

  const candidates = [
    ...campaigns.map((campaign) => ({
      id: campaign.id,
      priority: campaign.adminPriority,
      ownerUserId: campaign.ownerUserId,
      deliverable: campaign.deliverable,
      house: false,
      deficit: deficits[campaign.id],
    })),
    {
      id: '__house__',
      priority: Number.MIN_SAFE_INTEGER,
      ownerUserId: '',
      deliverable: true,
      house: true,
      deficit: deficits.__house__,
    },
  ]

  candidates.sort((left, right) => (
    right.deficit - left.deficit
    || right.priority - left.priority
    || (left.house ? 1 : right.house ? -1 : left.id.localeCompare(right.id))
  ))

  const selected = candidates[0]
  deficits[selected.id] -= 10_000
  const block = Math.floor((sequence - 1) / 4)
  const blockedByFairness = !selected.house
    && advertisersAlreadyServedInBlock.has(`${block}:${selected.ownerUserId}`)

  return {
    campaignId: !selected.house && selected.deliverable && !blockedByFairness ? selected.id : null,
    allocatedCampaignId: !selected.house ? selected.id : null,
    deficits,
    houseSelected: selected.house || !selected.deliverable || blockedByFairness,
  }
}
