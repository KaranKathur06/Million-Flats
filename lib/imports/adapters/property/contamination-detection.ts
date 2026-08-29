/**
 * Detect and extract structured data from contaminated source fields.
 * The scraper sometimes includes extra text in floor, parking, and possession fields.
 */

export interface ContaminationResult {
  extracted: unknown
  contaminated: boolean
  warning: string | null
  original: unknown
}

export function extractFloor(value: unknown): ContaminationResult {
  const original = value
  const text = String(value ?? '').trim()

  if (!text) {
    return { extracted: null, contaminated: false, warning: null, original }
  }

  const floorMatch = text.match(/^(\d+)(?:\s*(?:st|nd|rd|th))?\s*(?:floor|f\/f|\/f)?(.*)$/i)
  if (floorMatch) {
    const floor = Number(floorMatch[1])
    const remainder = floorMatch[2].trim()
    const contaminated = remainder.length > 0 && remainder.length > 5
    return {
      extracted: floor,
      contaminated,
      warning: contaminated ? 'FLOOR_SOURCE_CONTAMINATED' : null,
      original,
    }
  }

  const extractMatch = text.match(/^(\d+)/)
  if (extractMatch) {
    const floor = Number(extractMatch[1])
    const contaminated = text.length > String(floor).length + 5
    return {
      extracted: floor,
      contaminated,
      warning: contaminated ? 'FLOOR_SOURCE_CONTAMINATED' : null,
      original,
    }
  }

  if (/[a-z]{5,}/i.test(text)) {
    return { extracted: null, contaminated: true, warning: 'FLOOR_UNPARSEABLE_CONTAMINATION', original }
  }

  return { extracted: null, contaminated: false, warning: null, original }
}

export function extractParking(value: unknown): ContaminationResult {
  const original = value
  const text = String(value ?? '').trim()

  if (!text) {
    return { extracted: null, contaminated: false, warning: null, original }
  }

  const parsed: Record<string, number> = {}
  const parts: string[] = []

  const coveredMatch = text.match(/(\d+)\s*(?:covered|c\.?p\.?)/i)
  if (coveredMatch) {
    parsed.covered = Number(coveredMatch[1])
    parts.push(coveredMatch[0])
  }

  const openMatch = text.match(/(\d+)\s*(?:open|o\.?p\.?)/i)
  if (openMatch) {
    parsed.open = Number(openMatch[1])
    parts.push(openMatch[0])
  }

  if ((parsed.covered ?? 0) > 0 || (parsed.open ?? 0) > 0) {
    const parsingLen = parts.reduce((sum, p) => sum + p.length, 0)
    const contaminated = parsingLen < text.length - 2
    return {
      extracted: parsed,
      contaminated,
      warning: contaminated ? 'PARKING_SOURCE_CONTAMINATED' : null,
      original,
    }
  }

  const simpleMatch = text.match(/^(\d+)/)
  if (simpleMatch) {
    const count = Number(simpleMatch[1])
    const contaminated = text.length > String(count).length + 3
    return {
      extracted: { parking: count },
      contaminated,
      warning: contaminated ? 'PARKING_SOURCE_CONTAMINATED' : null,
      original,
    }
  }

  if (/[a-z]{5,}/i.test(text)) {
    return { extracted: null, contaminated: true, warning: 'PARKING_UNPARSEABLE_CONTAMINATION', original }
  }

  return { extracted: null, contaminated: false, warning: null, original }
}

export function extractPossession(value: unknown): ContaminationResult {
  const original = value
  const text = String(value ?? '').trim()

  if (!text) {
    return { extracted: null, contaminated: false, warning: null, original }
  }

  const patterns = [
    { re: /ready\s+to\s+move/i, value: 'Ready To Move' },
    { re: /under\s+construction/i, value: 'Under Construction' },
    { re: /new\s+launch/i, value: 'New Launch' },
    { re: /possession\s+(?:in|on|by)\s+(\d{4}|\w+)/i, value: 'Future Possession' },
  ]

  for (const { re, value: status } of patterns) {
    if (re.test(text)) {
      const match = text.match(re)
      const matchLen = match?.[0].length ?? 0
      const contaminated = matchLen < text.length - 5

      return {
        extracted: status,
        contaminated,
        warning: contaminated ? 'POSSESSION_SOURCE_CONTAMINATED' : null,
        original,
      }
    }
  }

  if (/[a-z]{5,}/i.test(text)) {
    return {
      extracted: null,
      contaminated: true,
      warning: 'POSSESSION_UNPARSEABLE_CONTAMINATION',
      original,
    }
  }

  return { extracted: null, contaminated: false, warning: null, original }
}
