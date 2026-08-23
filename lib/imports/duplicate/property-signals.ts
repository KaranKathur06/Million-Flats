export type PropertyDuplicateInput = {
  sourceProvider?: string | null
  sourceListingId?: string | null
  sourceUrl?: string | null
  title?: string | null
  city?: string | null
  community?: string | null
}

export function normalizeDuplicateText(value: unknown) {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, ' ')
}

export function propertySignals(value: PropertyDuplicateInput) {
  const title = normalizeDuplicateText(value.title)
  const city = normalizeDuplicateText(value.city)
  const community = normalizeDuplicateText(value.community)
  const provider = normalizeDuplicateText(value.sourceProvider)
  const listingId = normalizeDuplicateText(value.sourceListingId)
  const sourceUrl = normalizeDuplicateText(value.sourceUrl)
  return {
    deterministicIdentity: provider && listingId ? `${provider}:${listingId}` : null,
    sourceUrl: sourceUrl || null,
    titleLocation: title && city && community ? `${title}:${city}:${community}` : null,
  }
}
