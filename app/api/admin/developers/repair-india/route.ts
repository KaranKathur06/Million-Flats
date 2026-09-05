import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminSession } from '@/lib/adminAuth'
import { resolveLocationCountry } from '@/lib/locationResolver'

function resolveProjectCountry(project: { countryIso2: string | null; city: string | null; community?: string | null }) {
  // Location evidence wins over a stale country value, then explicit country is used as fallback.
  const fromLocation = resolveLocationCountry({ city: project.city, community: project.community })
  if (fromLocation.countryIso2) return fromLocation.countryIso2
  return resolveLocationCountry({ country: project.countryIso2 }).countryIso2
}

function normalizeName(value: unknown) {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, ' ')
}

export async function POST() {
  const auth = await requireAdminSession()
  if (!auth.ok) return NextResponse.json({ success: false, message: auth.message }, { status: auth.status })

  try {
    const developers = await (prisma as any).developer.findMany({
      where: { countryCode: 'UAE' },
      select: {
        id: true,
        name: true,
        city: true,
        address: true,
        projects: { select: { id: true, city: true, community: true, countryIso2: true } },
      },
    })

    const projectImports = await (prisma as any).importBatch.findMany({
      where: { entityType: 'PROJECT' },
      orderBy: { createdAt: 'desc' },
      select: { records: { select: { rawPayload: true } } },
    })
    const importedIndiaDeveloperNames = new Set<string>()
    for (const batch of projectImports) {
      for (const record of batch.records || []) {
        const payload = record.rawPayload && typeof record.rawPayload === 'object' ? record.rawPayload as Record<string, unknown> : {}
        const fromLocation = resolveLocationCountry({
          city: payload.city || payload.city_name,
          community: payload.community || payload.locality || payload.neighborhood,
          currency: payload.currency,
          address: payload.address || payload.location,
        })
        const country = fromLocation.countryIso2 || resolveLocationCountry({ country: payload.countryIso2 || payload.country || payload.country_code }).countryIso2
        if (country === 'IN') {
          const developerValue = payload.developerName || payload.developer_name || payload.developer
          const developerName = developerValue && typeof developerValue === 'object'
            ? (developerValue as Record<string, unknown>).name || (developerValue as Record<string, unknown>).developerName
            : developerValue
          if (developerName) importedIndiaDeveloperNames.add(normalizeName(developerName))
        }
      }
    }

    const candidates = developers.filter((developer: any) => {
      const projects = developer.projects || []
      const developerLocation = resolveLocationCountry({ city: developer.city, address: developer.address })
      const projectCountries = projects.map((project: any) => resolveProjectCountry(project)).filter(Boolean)
      const hasIndiaOnlyProjects = projects.length > 0 && projectCountries.length === projects.length && projectCountries.every((country: string) => country === 'IN')
      const hasIndiaImportProvenance = importedIndiaDeveloperNames.has(normalizeName(developer.name))
      const hasIndiaDeveloperLocation = projects.length === 0 && developerLocation.countryIso2 === 'IN'
      return hasIndiaOnlyProjects || (projects.length === 0 && (hasIndiaImportProvenance || hasIndiaDeveloperLocation))
    })

    const skippedMixed = developers
      .filter((developer: any) => !candidates.some((candidate: any) => candidate.id === developer.id))
      .map((developer: any) => developer.name)

    for (const developer of candidates) {
      await (prisma as any).$transaction([
        (prisma as any).developer.update({
          where: { id: developer.id },
          data: { countryCode: 'INDIA', countryIso2: 'IN' },
        }),
        (prisma as any).project.updateMany({
          where: { developerId: developer.id },
          data: { countryIso2: 'IN' },
        }),
      ])
    }

    return NextResponse.json({
      success: true,
      repairedCount: candidates.length,
      repaired: candidates.map((developer: any) => developer.name),
      skippedMixed,
      message: candidates.length
        ? `Repaired ${candidates.length} India-only developer(s).`
        : 'No safe India-only UAE developers found.',
    })
  } catch (error: any) {
    console.error('[POST /api/admin/developers/repair-india]', error)
    return NextResponse.json({ success: false, message: error?.message || 'Developer country repair failed.' }, { status: 500 })
  }
}
