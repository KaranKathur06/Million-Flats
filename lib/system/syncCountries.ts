import { prisma } from '@/lib/prisma'

type RestCountry = {
  name?: { common?: string }
  cca2?: string
  cca3?: string
  idd?: { root?: string; suffixes?: string[] }
  region?: string
}

function normalizeIso2(v: unknown) {
  const s = String(v || '').trim().toUpperCase()
  if (!/^[A-Z]{2}$/.test(s)) return ''
  return s
}

function normalizeIso3(v: unknown) {
  const s = String(v || '').trim().toUpperCase()
  if (!/^[A-Z]{3}$/.test(s)) return ''
  return s
}

function normalizeDialCode(root?: string, suffix?: string) {
  const r = String(root || '').trim()
  const s = String(suffix || '').trim()
  if (!r || !s) return ''

  const joined = `${r}${s}`
  const dial = joined.startsWith('+') ? joined : `+${joined}`
  if (!/^\+[0-9]{1,6}$/.test(dial)) return ''
  return dial
}

export type CountrySyncResult = {
  ok: boolean
  upserted: number
  skipped: number
  message?: string
}

export async function syncCountriesFromRestCountries(): Promise<CountrySyncResult> {
  try {
    const url = 'https://restcountries.com/v3.1/all?fields=name,cca2,cca3,idd,region'

    const res = await fetch(url, {
      method: 'GET',
      headers: { accept: 'application/json' },
      cache: 'no-store',
    })

    if (!res.ok) {
      return { ok: false, upserted: 0, skipped: 0, message: `REST Countries failed: ${res.status}` }
    }

    const raw = (await res.json().catch(() => null)) as RestCountry[] | null
    if (!Array.isArray(raw)) {
      return { ok: false, upserted: 0, skipped: 0, message: 'REST Countries returned invalid JSON' }
    }

    const seen = new Set<string>()
    const candidates = raw
      .map((c) => {
        const iso2 = normalizeIso2(c?.cca2)
        const iso3 = normalizeIso3(c?.cca3)
        const name = String(c?.name?.common || '').trim()
        const region = c?.region ? String(c.region).trim() : null
        const root = c?.idd?.root
        const suffix = Array.isArray(c?.idd?.suffixes) ? c!.idd!.suffixes![0] : ''
        const dialCode = normalizeDialCode(root, suffix)

        return { iso2, iso3, name, dialCode, region }
      })
      .filter((c) => {
        if (!c.iso2 || !c.iso3 || !c.name || !c.dialCode) return false
        if (seen.has(c.iso2)) return false
        seen.add(c.iso2)
        return true
      })
      .sort((a, b) => a.name.localeCompare(b.name))

    let upserted = 0
    const skipped = raw.length - candidates.length

    for (const c of candidates) {
      await (prisma as any).country.upsert({
        where: { iso2: c.iso2 },
        create: {
          iso2: c.iso2,
          iso3: c.iso3,
          name: c.name,
          dialCode: c.dialCode,
          region: c.region,
          isActive: true,
        },
        update: {
          iso3: c.iso3,
          name: c.name,
          dialCode: c.dialCode,
          region: c.region,
          isActive: true,
        },
        select: { iso2: true },
      })

      upserted += 1
    }

    return { ok: true, upserted, skipped }
  } catch (e: any) {
    return { ok: false, upserted: 0, skipped: 0, message: e?.message ? String(e.message) : 'Sync failed' }
  }
}
