/**
 * Detect property type from title, description, and configuration signals.
 * Never invent a type if evidence is weak.
 */

export type DetectedPropertyType = 'APARTMENT' | 'FLAT' | 'VILLA' | 'HOUSE' | 'PLOT' | 'LAND' | 'BUILDER_FLOOR' | 'OFFICE' | 'SHOP' | 'COMMERCIAL' | 'WAREHOUSE' | null

export interface PropertyTypeSignal {
  type: DetectedPropertyType
  confidence: number
  reason: string
}

function normalizeText(value: unknown): string {
  return String(value || '').trim().toLowerCase()
}

export function detectPropertyType(input: {
  title?: unknown
  description?: unknown
  bedrooms?: number | null
  bathrooms?: number | null
  propertyType?: unknown
  floorLevel?: unknown
  squareFeet?: number | null
}): PropertyTypeSignal {
  const title = normalizeText(input.title)
  const description = normalizeText(input.description)
  const bedrooms = input.bedrooms
  const bathrooms = input.bathrooms
  const hasFloor = input.floorLevel !== null && input.floorLevel !== undefined && String(input.floorLevel).trim() !== ''
  const hasArea = (input.squareFeet ?? 0) > 0

  const combined = `${title} ${description}`.trim()

  // Explicit source type
  const sourceType = normalizeText(input.propertyType)
  if (/^plot$|^land$|^plot\s+land|^land\s+plot/.test(sourceType)) {
    return { type: 'PLOT', confidence: 0.99, reason: 'Explicit source type: plot/land' }
  }
  if (/^apartment$|^flat$|^apt$|^apt\.|^flat\s*$/i.test(sourceType)) {
    return { type: 'APARTMENT', confidence: 0.99, reason: 'Explicit source type: apartment/flat' }
  }
  if (/^villa$/.test(sourceType)) {
    return { type: 'VILLA', confidence: 0.99, reason: 'Explicit source type: villa' }
  }
  if (/^office$/.test(sourceType)) {
    return { type: 'OFFICE', confidence: 0.99, reason: 'Explicit source type: office' }
  }

  // Strong pattern: "Plot for Sale/Rent" or just "Plot"
  if (/plot\b|plot\s+(for\s+)?(?:sale|rent|buy)/i.test(combined)) {
    return { type: 'PLOT', confidence: 0.95, reason: 'Pattern: plot in title/description with intent' }
  }

  // Strong pattern: "Land for Sale"
  if (/land\s+(for\s+)?(?:sale|rent|buy|develop)|agricultural\s+land|vacant\s+land/i.test(combined)) {
    return { type: 'LAND', confidence: 0.93, reason: 'Pattern: land with clear context' }
  }

  // Strong pattern: "Villa" — CHECK BEFORE apartment patterns since villa may have BHK
  if (/villa\s+(?:for\s+)?(?:sale|rent|buy)|independent\s+villa|villa\s+for/i.test(combined)) {
    return { type: 'VILLA', confidence: 0.91, reason: 'Pattern: villa in title/description' }
  }

  // Strong pattern: "House"
  if (/\bhouse\s+(?:for\s+)?(?:sale|rent|buy)/i.test(combined) && !/villa|bungalow|townhouse/i.test(combined)) {
    return { type: 'HOUSE', confidence: 0.88, reason: 'Pattern: standalone house' }
  }

  // Strong pattern: "Builder Floor"
  if (/builder\s+floor|independent\s+floor|floor\s+(?:in|for)\s+building|bhk\s+floor/i.test(combined)) {
    return { type: 'BUILDER_FLOOR', confidence: 0.9, reason: 'Pattern: builder floor' }
  }

  // Commercial patterns
  if (/\boffice\s+(?:space|for|in)/i.test(combined)) {
    return { type: 'OFFICE', confidence: 0.88, reason: 'Pattern: office space' }
  }
  if (/\bshop\b|\bretail\s+space|commercial\s+space/i.test(combined)) {
    return { type: 'SHOP', confidence: 0.86, reason: 'Pattern: shop/retail' }
  }
  if (/warehouse|industrial\s+space|godown/i.test(combined)) {
    return { type: 'WAREHOUSE', confidence: 0.85, reason: 'Pattern: warehouse/industrial' }
  }

  // Residential (flat/apartment) patterns — CHECK AFTER villa/house/plot patterns
  if (/(?:2|3|4|5)[\s\-]*bhk|(?:2|3|4|5)[\s\-]*rk|apartment|flat\s+(?:for|in)|bhk\s+apartment|bhk\s+flat/i.test(combined)) {
    return { type: 'APARTMENT', confidence: 0.92, reason: 'Pattern: BHK configuration detected' }
  }

  // Fallback to configuration signals
  if (bedrooms !== null && bedrooms !== undefined && bedrooms > 0) {
    return { type: 'APARTMENT', confidence: 0.78, reason: 'Configuration signal: bedrooms present' }
  }

  if (hasFloor && hasArea && !(/plot|land|commercial/i.test(combined))) {
    return { type: 'APARTMENT', confidence: 0.72, reason: 'Configuration signal: floor + area (likely residential)' }
  }

  if (hasArea && !hasFloor && !(/plot|land|villa|house/i.test(combined)) && bedrooms === null) {
    return { type: 'PLOT', confidence: 0.65, reason: 'Signal pattern: area without floor/bedrooms (likely plot)' }
  }

  return { type: null, confidence: 0, reason: 'Insufficient evidence to determine property type' }
}
