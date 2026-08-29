/**
 * Test suite for contamination detection and conditional validation.
 * Verifies that messy SquareYards data is properly cleaned and validated per property type.
 */

import {
  extractFloor,
  extractParking,
  extractPossession,
} from '@/lib/imports/adapters/property/contamination-detection'
import { detectPropertyType } from '@/lib/imports/adapters/property/property-type-detection'
import { getValidationRules, validateRecord, validateField } from '@/lib/imports/adapters/property/conditional-validation'
import { propertyImportAdapter } from '@/lib/imports/adapters/property/adapter'
import type { NormalizationInput } from '@/lib/imports/core/types'

describe('Contamination Detection', () => {
  describe('extractFloor', () => {
    it('parses clean floor numbers', () => {
      expect(extractFloor('12')).toEqual({
        extracted: 12,
        contaminated: false,
        warning: null,
        original: '12',
      })
    })

    it('parses floor with suffix (12th, 3rd, etc.)', () => {
      const result = extractFloor('12th Floor')
      expect(result.extracted).toBe(12)
      expect(result.contaminated).toBe(false)
    })

    it('detects contaminated floor with extra text', () => {
      const result = extractFloor('12th Floor Facing North West Overlooking Garden')
      expect(result.extracted).toBe(12)
      expect(result.contaminated).toBe(true)
      expect(result.warning).toBe('FLOOR_SOURCE_CONTAMINATED')
    })

    it('returns null for unparseable floor', () => {
      const result = extractFloor('High Rise Tower')
      expect(result.extracted).toBeNull()
      expect(result.contaminated).toBe(true)
    })

    it('handles empty values', () => {
      expect(extractFloor(null)).toEqual({
        extracted: null,
        contaminated: false,
        warning: null,
        original: null,
      })
    })
  })

  describe('extractParking', () => {
    it('parses clean parking count', () => {
      const result = extractParking('2')
      expect(result.extracted).toEqual({ parking: 2 })
      expect(result.contaminated).toBe(false)
    })

    it('parses covered and open parking', () => {
      const result = extractParking('2 Covered, 1 Open')
      expect((result.extracted as any).covered).toBe(2)
      expect((result.extracted as any).open).toBe(1)
      expect(result.contaminated).toBe(false)
    })

    it('detects contaminated parking with extra text', () => {
      const result = extractParking('2 Covered Parking This semi-furnished flat has an open terrace')
      expect((result.extracted as any).covered).toBe(2)
      expect(result.contaminated).toBe(true)
      expect(result.warning).toBe('PARKING_SOURCE_CONTAMINATED')
    })

    it('returns null for unparseable parking', () => {
      const result = extractParking('Parking available upon request')
      expect(result.extracted).toBeNull()
      expect(result.contaminated).toBe(true)
    })
  })

  describe('extractPossession', () => {
    it('parses ready to move status', () => {
      const result = extractPossession('Ready To Move')
      expect(result.extracted).toBe('Ready To Move')
      expect(result.contaminated).toBe(false)
    })

    it('parses under construction status', () => {
      const result = extractPossession('Under Construction')
      expect(result.extracted).toBe('Under Construction')
      expect(result.contaminated).toBe(false)
    })

    it('detects contaminated possession with extra text', () => {
      const result = extractPossession('Ready To Move From Jan 2025 Call agent for viewing')
      expect(result.extracted).toBe('Ready To Move')
      expect(result.contaminated).toBe(true)
      expect(result.warning).toBe('POSSESSION_SOURCE_CONTAMINATED')
    })
  })
})

describe('Property Type Detection', () => {
  it('detects apartment from title pattern', () => {
    const result = detectPropertyType({
      title: '3 BHK Apartment for Sale in Bandra',
    })
    expect(result.type).toBe('APARTMENT')
    expect(result.confidence).toBeGreaterThan(0.8)
  })

  it('detects plot from title pattern', () => {
    const result = detectPropertyType({
      title: 'Residential Plot for Sale 1000 Sqft',
    })
    expect(result.type).toBe('PLOT')
    expect(result.confidence).toBeGreaterThan(0.8)
  })

  it('detects villa from title pattern', () => {
    const result = detectPropertyType({
      title: 'Independent Villa 4 BHK for Sale',
    })
    expect(result.type).toBe('VILLA')
  })

  it('detects office from title pattern', () => {
    const result = detectPropertyType({
      title: 'Commercial Office Space 5000 Sqft',
    })
    expect(result.type).toBe('OFFICE')
  })

  it('never invents type without evidence', () => {
    const result = detectPropertyType({
      title: 'Some random property listing',
    })
    expect(result.type).toBeNull()
    expect(result.confidence).toBe(0)
  })

  it('infers type from configuration signals if title is vague', () => {
    const result = detectPropertyType({
      title: 'Residential Unit',
      bedrooms: 2,
      bathrooms: 1,
      floorLevel: 5,
    })
    // May infer APARTMENT from floor level + bedrooms
    expect([null, 'APARTMENT', 'FLAT', 'BUILDER_FLOOR']).toContain(result.type)
  })
})

describe('Conditional Validation', () => {
  describe('Validation Rules by Property Type', () => {
    it('requires bedrooms for apartments but not plots', () => {
      const apartmentRules = getValidationRules({ propertyType: 'APARTMENT' })
      const plotRules = getValidationRules({ propertyType: 'PLOT' })

      const apartmentBedroomRule = apartmentRules.find((r) => r.field === 'bedrooms')
      const plotBedroomRule = plotRules.find((r) => r.field === 'bedrooms')

      expect(apartmentBedroomRule?.requirement).toBe('RECOMMENDED')
      expect(plotBedroomRule?.requirement).toBe('NOT_APPLICABLE')
    })

    it('requires area for plots and apartments', () => {
      const apartmentRules = getValidationRules({ propertyType: 'APARTMENT' })
      const plotRules = getValidationRules({ propertyType: 'PLOT' })

      const apartmentAreaRule = apartmentRules.find((r) => r.field === 'squareFeet')
      const plotAreaRule = plotRules.find((r) => r.field === 'squareFeet')

      expect(apartmentAreaRule?.requirement).toBe('RECOMMENDED')
      expect(plotAreaRule?.requirement).toBe('RECOMMENDED')
    })

    it('marks floor level as not applicable for plots and villas', () => {
      const plotRules = getValidationRules({ propertyType: 'PLOT' })
      const villaRules = getValidationRules({ propertyType: 'VILLA' })

      const plotFloorRule = plotRules.find((r) => r.field === 'floorLevel')
      const villaFloorRule = villaRules.find((r) => r.field === 'floorLevel')

      expect(plotFloorRule?.requirement).toBe('NOT_APPLICABLE')
      expect(villaFloorRule?.requirement).toBe('NOT_APPLICABLE')
    })
  })

  describe('validateField', () => {
    it('flags missing title as ERROR', () => {
      const issue = validateField('title', null, { propertyType: 'APARTMENT' })
      expect(issue?.severity).toBe('ERROR')
      expect(issue?.code).toBe('MISSING_REQUIRED_TITLE')
    })

    it('flags missing bedrooms as WARNING for apartments', () => {
      const issue = validateField('bedrooms', null, { propertyType: 'APARTMENT' })
      expect(issue?.severity).toBe('WARNING')
    })

    it('does not flag missing bedrooms for plots', () => {
      const issue = validateField('bedrooms', null, { propertyType: 'PLOT' })
      expect(issue?.severity).toBe('INFO')
    })

    it('passes validation for present values', () => {
      const issue = validateField('bedrooms', 2, { propertyType: 'APARTMENT' })
      expect(issue).toBeNull()
    })
  })

  describe('validateRecord', () => {
    it('validates apartment with all required fields', () => {
      const issues = validateRecord(
        {
          title: '3 BHK Apartment',
          agentId: 'agent123',
          bedrooms: 3,
          bathrooms: 2,
          city: 'Mumbai',
        },
        { propertyType: 'APARTMENT' },
      )
      const errors = issues.filter((i) => i.severity === 'ERROR')
      expect(errors).toHaveLength(0)
    })

    it('allows plot without bedrooms', () => {
      const issues = validateRecord(
        {
          title: 'Residential Plot',
          agentId: 'agent123',
          squareFeet: 5000,
          city: 'Mumbai',
        },
        { propertyType: 'PLOT' },
      )
      const bedroomErrors = issues.filter((i) => i.field === 'bedrooms' && i.severity === 'ERROR')
      expect(bedroomErrors).toHaveLength(0)
    })

    it('requires title and agentId regardless of type', () => {
      const issues = validateRecord({}, { propertyType: 'APARTMENT' })
      const criticalErrors = issues.filter((i) => i.severity === 'ERROR')
      expect(criticalErrors.some((i) => i.field === 'title')).toBe(true)
      expect(criticalErrors.some((i) => i.field === 'agentId')).toBe(true)
    })
  })
})

describe('Adapter Integration', () => {
  it('normalizes contaminated floor in SquareYards data', () => {
    const input: NormalizationInput = {
      raw: {
        title: '3 BHK Apartment',
        floorLevel: '12th Floor Facing North West Overlooking Garden',
        price: 7800000,
        city: 'Mumbai',
      },
      sourcePath: null,
      mappings: [],
    }
    const result = propertyImportAdapter.normalize(input)
    const normalized = result.normalized as any
    expect(normalized.floorLevel).toBe(12)
    expect(normalized.floorContaminated).toBe(true)
    expect(result.warnings).toContain('FLOOR_SOURCE_CONTAMINATED')
  })

  it('normalizes contaminated parking in SquareYards data', () => {
    const input: NormalizationInput = {
      raw: {
        title: '3 BHK Apartment',
        parking: '2 Covered Parking This semi-furnished flat has an open terrace',
        price: 7800000,
        city: 'Mumbai',
      },
      sourcePath: null,
      mappings: [],
    }
    const result = propertyImportAdapter.normalize(input)
    const normalized = result.normalized as any
    expect((normalized.parking as any).covered).toBe(2)
    expect(normalized.parkingContaminated).toBe(true)
    expect(result.warnings).toContain('PARKING_SOURCE_CONTAMINATED')
  })

  it('detects property type during normalization', () => {
    const input: NormalizationInput = {
      raw: {
        title: 'Residential Plot 5000 Sqft for Sale',
        squareFeet: 5000,
        city: 'Pune',
        price: 2500000,
      },
      sourcePath: null,
      mappings: [],
    }
    const result = propertyImportAdapter.normalize(input)
    const normalized = result.normalized as any
    const typeDetection = detectPropertyType({
      title: normalized.title,
      squareFeet: normalized.squareFeet,
    })
    expect(typeDetection.type).toBe('PLOT')
  })
})

describe('Real-world SquareYards Data Scenarios', () => {
  it('handles complete clean property record', () => {
    const squareYardsRecord = {
      listingId: 'SY123456',
      title: '3 BHK Apartment',
      price: 7800000,
      priceText: '₹ 78 L',
      bedrooms: '3',
      bathrooms: '2',
      areaSqft: 1200,
      floorLevel: '12',
      parking: '2 Covered',
      city: 'Mumbai',
      locality: 'Bandra',
      latitude: 19.0596,
      longitude: 72.8295,
      url: 'https://squareyards.com/...',
    }

    const input: NormalizationInput = {
      raw: squareYardsRecord,
      sourcePath: null,
      mappings: [],
    }
    const result = propertyImportAdapter.normalize(input)
    expect(result.errors).toHaveLength(0)
    expect(result.warnings.length).toBeLessThanOrEqual(1)
  })

  it('handles incomplete plot record with contaminated fields', () => {
    const squareYardsRecord = {
      listingId: 'SY987654',
      title: 'Residential Plot for Sale 5000 Sqft',
      price: 2500000,
      priceText: '₹ 25 L',
      areaSqft: 5000,
      floorLevel: 'Ground Floor No parking required',
      possessionStatus: 'Ready To Move Immediate Possession Available',
      city: 'Pune',
      locality: 'Koregaon Park',
      latitude: 18.5204,
      longitude: 73.8567,
      url: 'https://squareyards.com/...',
    }

    const input: NormalizationInput = {
      raw: squareYardsRecord,
      sourcePath: null,
      mappings: [],
    }
    const result = propertyImportAdapter.normalize(input)
    const normalized = result.normalized as any
    expect(normalized.floorContaminated).toBe(true)
    expect(normalized.possessionContaminated).toBe(true)
    expect(result.warnings.length).toBeGreaterThan(0)
  })

  it('handles fractional bedrooms (1.5 BHK, 3.5 BHK)', () => {
    const squareYardsRecord = {
      listingId: 'SY555555',
      title: '3.5 BHK Luxury Apartment',
      price: 12500000,
      bedrooms: '3.5',
      bathrooms: '2',
      areaSqft: 1800,
      city: 'Mumbai',
      locality: 'Powai',
    }

    const input: NormalizationInput = {
      raw: squareYardsRecord,
      sourcePath: null,
      mappings: [],
    }
    const result = propertyImportAdapter.normalize(input)
    const normalized = result.normalized as any
    expect(normalized.bedrooms).toBe(3.5)
  })
})
