import { prisma } from '@/lib/prisma'

export class CanonicalLocationError extends Error {}

export async function validateCanonicalLocation(input: { countryIso2?: string | null; city?: string | null; community?: string | null }) {
  const countryIso2 = String(input.countryIso2 || '').toUpperCase()
  const countryCode = countryIso2 === 'IN' ? 'INDIA' : countryIso2 === 'AE' ? 'UAE' : null
  if (!countryCode) throw new CanonicalLocationError('Country must be a configured canonical location.')
  const cityName = String(input.city || '').trim()
  const communityName = String(input.community || '').trim()
  if (!cityName || !communityName) throw new CanonicalLocationError('City and community are required canonical locations.')
  const city = await (prisma as any).city.findFirst({ where: { countryCode, name: { equals: cityName, mode: 'insensitive' } }, select: { id: true, name: true } })
  if (!city) throw new CanonicalLocationError(`City "${cityName}" is not configured for the selected country.`)
  const community = await (prisma as any).community.findFirst({ where: { cityId: city.id, name: { equals: communityName, mode: 'insensitive' } }, select: { name: true } })
  if (!community) throw new CanonicalLocationError(`Community "${communityName}" is not configured for ${city.name}.`)
  return { countryCode, countryIso2, city: city.name, community: community.name }
}
