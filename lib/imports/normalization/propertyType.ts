/**
 * Property type normalization for SquareYards and other sources
 * Maps messy real-world values to standardized property types
 */

export interface NormalizedPropertyType {
  type: string | null
  category: 'RESIDENTIAL' | 'COMMERCIAL' | 'LUXURY' | null
  confidence: number
  matchedPattern: string | null
}

/**
 * Normalize property type from various sources
 * Handles: villa, apartment, flat, studio, plot, land, office, commercial, etc.
 */
export function normalizePropertyType(value: unknown): NormalizedPropertyType {
  if (value === null || value === undefined || String(value).trim() === '') {
    return { type: null, category: null, confidence: 0, matchedPattern: null }
  }

  const text = String(value).trim().toLowerCase().replace(/[^a-z0-9\s&-]/g, '')

  // Villa patterns
  if (/\bvilla\b|villa\s+plot/.test(text)) {
    return { type: 'VILLA', category: 'RESIDENTIAL', confidence: 0.95, matchedPattern: 'villa' }
  }

  // Apartment/Flat patterns
  if (/\b(apt|apartment|flat|flats|bhk|bhk\s+\w+)\b|flat\s+\d+|apartment\s+\d+/.test(text)) {
    return { type: 'FLAT', category: 'RESIDENTIAL', confidence: 0.95, matchedPattern: 'apartment/flat' }
  }

  // Plot/Land patterns
  if (/\b(plot|land|plots|land\s+plot|residential\s+plot|commercial\s+plot)\b/.test(text)) {
    return { type: 'PLOT', category: 'RESIDENTIAL', confidence: 0.9, matchedPattern: 'plot/land' }
  }

  // Townhouse/Row house patterns
  if (/\b(townhouse|row\s+house|rowhouse|terrace|terrace\s+house)\b/.test(text)) {
    return { type: 'TOWNHOUSE', category: 'RESIDENTIAL', confidence: 0.9, matchedPattern: 'townhouse' }
  }

  // Studio patterns
  if (/\b(studio|studio\s+apartment|studio\s+flat|1\s*rk)\b/.test(text)) {
    return { type: 'STUDIO', category: 'RESIDENTIAL', confidence: 0.9, matchedPattern: 'studio' }
  }

  // Penthouse patterns
  if (/\b(penthouse|luxury\s+penthouse)\b/.test(text)) {
    return { type: 'PENTHOUSE', category: 'LUXURY', confidence: 0.9, matchedPattern: 'penthouse' }
  }

  // Commercial patterns
  if (/\b(office|commercial|office\s+space|retail|shop|showroom|warehouse|warehouse\s+space)\b/.test(text)) {
    return { type: 'COMMERCIAL', category: 'COMMERCIAL', confidence: 0.9, matchedPattern: 'commercial' }
  }

  // Cottage/Bungalow patterns
  if (/\b(cottage|bungalow|bungalow\s+plot)\b/.test(text)) {
    return { type: 'BUNGALOW', category: 'RESIDENTIAL', confidence: 0.9, matchedPattern: 'bungalow' }
  }

  // If it contains BHK/RK, it's likely a flat
  if (/\d\s*bhk|\d\s*rk|bhk/.test(text)) {
    return { type: 'FLAT', category: 'RESIDENTIAL', confidence: 0.85, matchedPattern: 'bhk_pattern' }
  }

  // Catch-all: if we got something, mark as residential flat with low confidence
  if (text.length > 0) {
    return { type: 'FLAT', category: 'RESIDENTIAL', confidence: 0.3, matchedPattern: 'fallback' }
  }

  return { type: null, category: null, confidence: 0, matchedPattern: null }
}

/**
 * Detect category from property type
 */
export function getCategoryFromPropertyType(propertyType: string | null): 'RESIDENTIAL' | 'COMMERCIAL' | 'LUXURY' | null {
  if (!propertyType) return null
  const type = propertyType.toUpperCase()
  if (/COMMERCIAL|OFFICE|RETAIL|WAREHOUSE|SHOP/.test(type)) return 'COMMERCIAL'
  if (/PENTHOUSE|LUXURY/.test(type)) return 'LUXURY'
  if (/VILLA|APARTMENT|FLAT|PLOT|TOWNHOUSE|STUDIO|BUNGALOW/.test(type)) return 'RESIDENTIAL'
  return null
}
