import { prisma } from '@/lib/prisma'
import { getCommunityOptions, isSupportedCanonicalCity, normalizeCanonicalCity, normalizeCountryCode, normalizeTitleCase } from '@/lib/propertyCanonical'

export class CanonicalLocationError extends Error {}

export async function validateCanonicalLocation(input: { countryIso2?: string | null; city?: string | null; community?: string | null }) {
  const countryIso2 = normalizeCountryCode(input.countryIso2 || '')
  const countryCode = countryIso2 === 'IN' ? 'INDIA' : countryIso2 === 'AE' ? 'UAE' : null
  if (!countryCode) throw new CanonicalLocationError('Country must be a configured canonical location.')
  const cityName = String(input.city || '').trim()
  const communityName = String(input.community || '').trim()
  if (!cityName || !communityName) throw new CanonicalLocationError('City and community are required canonical locations.')
  const city = await (prisma as any).city.findFirst({ where: { countryCode, name: { equals: cityName, mode: 'insensitive' } }, select: { id: true, name: true } }).catch(() => null)
  if (city) {
    const community = await (prisma as any).community.findFirst({ where: { cityId: city.id, name: { equals: communityName, mode: 'insensitive' } }, select: { name: true } }).catch(() => null)
    if (community) return { countryCode, countryIso2, city: city.name, community: community.name }

    const fallbackOptions = getCommunityOptions(countryIso2, city.name)
    if (!fallbackOptions.length) return { countryCode, countryIso2, city: city.name, community: normalizeTitleCase(communityName) }
    const fallbackCommunity = fallbackOptions.find((item) => item.name.toLowerCase() === communityName.toLowerCase())
    if (fallbackCommunity) return { countryCode, countryIso2, city: city.name, community: fallbackCommunity.name }
    return { countryCode, countryIso2, city: city.name, community: normalizeTitleCase(communityName) }
  }

  if (!isSupportedCanonicalCity(countryIso2, cityName)) {
    throw new CanonicalLocationError(`City "${cityName}" is not configured for the selected country.`)
  }

  const canonicalCity = normalizeCanonicalCity(countryIso2, cityName)
  const fallbackOptions = getCommunityOptions(countryIso2, canonicalCity)
  const fallbackCommunity = fallbackOptions.find((item) => item.name.toLowerCase() === communityName.toLowerCase())
  return { countryCode, countryIso2, city: canonicalCity, community: fallbackCommunity?.name || normalizeTitleCase(communityName) }
}
