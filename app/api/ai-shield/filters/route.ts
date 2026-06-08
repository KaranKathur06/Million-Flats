import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const revalidate = 900

export async function GET() {
  try {
    const baseWhere = {
      status: 'PUBLISHED' as const,
      isDeleted: false,
      aiShield: { isAiEnabled: true },
    }

    const [cityRows, developerRows, countries] = await Promise.all([
      prisma.project.findMany({
        where: { ...baseWhere, city: { not: null } },
        select: { city: true },
        distinct: ['city'],
        orderBy: [{ city: 'asc' }],
      }),
      prisma.project.findMany({
        where: baseWhere,
        select: { developer: { select: { name: true } } },
        distinct: ['developerId'],
      }),
      prisma.project.findMany({
        where: { ...baseWhere, countryIso2: { not: null } },
        select: { countryIso2: true },
        distinct: ['countryIso2'],
      }),
    ])

    const cities = cityRows.map((r) => String(r.city || '').trim()).filter(Boolean)
    const developers = developerRows
      .map((r) => String(r.developer?.name || '').trim())
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b))

    const countryLabels: Record<string, string> = { AE: 'UAE', IN: 'India' }
    const countryList = countries
      .map((r) => r.countryIso2)
      .filter(Boolean)
      .map((iso) => ({
        iso: iso!,
        label: countryLabels[iso!] || iso!,
      }))

    return NextResponse.json(
      { success: true, cities, developers, countries: countryList },
      { headers: { 'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=1800' } }
    )
  } catch (err) {
    console.error('[GET /api/ai-shield/filters]', err)
    return NextResponse.json({ success: false, message: 'Unable to load filters' }, { status: 500 })
  }
}
