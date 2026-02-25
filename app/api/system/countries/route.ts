import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { syncCountriesFromRestCountries } from '@/lib/system/syncCountries'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

type CountryDto = {
  id: string
  name: string
  dialCode: string
  iso3: string
  region: string | null
  flag: string
}

declare global {
  // eslint-disable-next-line no-var
  var __MF_COUNTRIES_CACHE__:
    | {
        ts: number
        items: CountryDto[]
      }
    | undefined
}

const CACHE_TTL_MS = 60 * 60 * 1000

function flagUrl(iso2: string) {
  return `https://flagcdn.com/w40/${String(iso2 || '').toLowerCase()}.png`
}

async function readCountriesFromDb(): Promise<CountryDto[]> {
  const rows = await (prisma as any).country
    .findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      select: { iso2: true, name: true, dialCode: true, iso3: true, region: true },
    })
    .catch(() => [])

  return (Array.isArray(rows) ? rows : []).map((c: any) => ({
    id: String(c.iso2),
    name: String(c.name),
    dialCode: String(c.dialCode),
    iso3: String(c.iso3),
    region: c.region ? String(c.region) : null,
    flag: flagUrl(String(c.iso2)),
  }))
}

export async function GET() {
  const now = Date.now()

  const cached = global.__MF_COUNTRIES_CACHE__
  if (cached?.items?.length && now - cached.ts < CACHE_TTL_MS) {
    return NextResponse.json(cached.items, { status: 200 })
  }

  const existing = await readCountriesFromDb()

  if (!existing.length) {
    // bootstrap sync only if table is empty
    const sync = await syncCountriesFromRestCountries()
    if (sync.ok) {
      const after = await readCountriesFromDb()
      global.__MF_COUNTRIES_CACHE__ = { ts: now, items: after }
      return NextResponse.json(after, { status: 200 })
    }

    // failover: do not crash app, return empty snapshot
    global.__MF_COUNTRIES_CACHE__ = { ts: now, items: [] }
    return NextResponse.json([], { status: 200 })
  }

  global.__MF_COUNTRIES_CACHE__ = { ts: now, items: existing }
  return NextResponse.json(existing, { status: 200 })
}
