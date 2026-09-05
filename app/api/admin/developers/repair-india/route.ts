import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminSession } from '@/lib/adminAuth'

const INDIA_CITIES = new Set([
  'bangalore', 'bengaluru', 'pune', 'hyderabad', 'chennai', 'mumbai', 'ahmedabad',
  'gurgaon', 'gurugram', 'noida', 'kochi', 'trivandrum', 'thiruvananthapuram',
  'coimbatore', 'rajkot', 'surat', 'vadodara', 'indore', 'jaipur', 'lucknow',
  'chandigarh', 'kolkata', 'nagpur',
])

function isIndiaProject(project: { countryIso2: string | null; city: string | null }) {
  return project.countryIso2 === 'IN' || INDIA_CITIES.has(String(project.city || '').trim().toLowerCase())
}

function normalizeName(value: unknown) {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, ' ')
}

export async function POST() {
  const auth = await requireAdminSession()
  if (!auth.ok) return NextResponse.json({ success: false, message: auth.message }, { status: auth.status })

  try {
    const developers = await (prisma as any).developer.findMany({
      where: { countryCode: 'UAE', projects: { some: {} } },
      select: {
        id: true,
        name: true,
        projects: { select: { id: true, city: true, countryIso2: true } },
      },
    })

    const projectImports = await (prisma as any).importBatch.findMany({
      where: { entityType: 'PROJECT' },
      orderBy: { createdAt: 'desc' },
      take: 25,
      select: { records: { select: { rawPayload: true } } },
    })
    const importedIndiaDeveloperNames = new Set<string>()
    for (const batch of projectImports) {
      for (const record of batch.records || []) {
        const payload = record.rawPayload && typeof record.rawPayload === 'object' ? record.rawPayload as Record<string, unknown> : {}
        const city = String(payload.city || payload.city_name || '').trim().toLowerCase()
        const country = String(payload.countryIso2 || payload.country || payload.country_code || '').trim().toUpperCase()
        if (country === 'IN' || country === 'INDIA' || INDIA_CITIES.has(city)) {
          const developerName = payload.developerName || payload.developer_name || payload.developer
          if (developerName) importedIndiaDeveloperNames.add(normalizeName(developerName))
        }
      }
    }

    const candidates = developers.filter((developer: any) => {
      const projects = developer.projects || []
      const hasIndiaOnlyProjects = projects.length > 0 && projects.some(isIndiaProject) && projects.every(isIndiaProject)
      const hasIndiaImportProvenance = importedIndiaDeveloperNames.has(normalizeName(developer.name))
      return (hasIndiaOnlyProjects || (projects.length === 0 && hasIndiaImportProvenance))
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
          where: { developerId: developer.id, countryIso2: null },
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
