import { canonicalizePropertyImport } from '@/lib/propertyCanonical'
import { createManualProperty } from '@/lib/manualPropertyService'
import { normalizeArea, normalizeBedrooms, normalizeBoolean, normalizePrice } from '@/lib/imports/normalization'
import type {
  CanonicalPayloadResult,
  CanonicalMappingInput,
  CommitPreparation,
  CommitPreparationInput,
  DuplicateSignalDefinition,
  ImportAdapter,
  ImportFieldDefinition,
  MappingSuggestion,
  NormalizationInput,
  NormalizationResult,
  RelationInput,
  RelationResolution,
  SourceProfileDetection,
  ValidationInput,
  ValidationResult,
} from '@/lib/imports/core/types'
import { propertyFieldDefinitions } from './fields'
import { suggestPropertyMappings } from './mappings'
import { readImportField } from '@/lib/imports/field-utils'

const SQUAREYARDS_SOURCE_PROFILE_KEY = 'squareyards-property-v1'

function normalizeKey(value: string) {
  return String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')
}

function detectSquareYardsProperties(fields: string[], sample?: Record<string, unknown>): SourceProfileDetection {
  const fieldNames = fields.map((field) => String(field || '').trim())
  const normalizedFields = fieldNames.map((field) => normalizeKey(field))
  const reasons: string[] = []
  let score = 0

  const addSignal = (weight: number, reason: string) => {
    score += weight
    reasons.push(reason)
  }

  if (normalizedFields.some((field) => field === 'listingid' || field === 'source_listing_id')) addSignal(0.18, 'listingId signal present')
  if (normalizedFields.some((field) => field === 'pricetext' || field === 'price_text')) addSignal(0.18, 'priceText signal present')
  if (normalizedFields.some((field) => field === 'areasqft' || field === 'area_sqft' || field === 'squarefeet')) addSignal(0.18, 'areaSqft signal present')
  if (normalizedFields.some((field) => field === 'floorlevel' || field === 'floor_level')) addSignal(0.1, 'floorLevel signal present')
  if (normalizedFields.some((field) => field === 'possessionstatus' || field === 'possession_status')) addSignal(0.14, 'possessionStatus signal present')
  if (normalizedFields.some((field) => field === 'projectname' || field === 'project_name')) addSignal(0.12, 'projectName signal present')
  if (normalizedFields.some((field) => field === 'locality')) addSignal(0.1, 'locality signal present')
  if (normalizedFields.some((field) => field === 'imageurl' || field === 'image_url')) addSignal(0.08, 'imageUrl signal present')
  if (normalizedFields.some((field) => field === 'scrapedat' || field === 'scraped_at')) addSignal(0.08, 'scrapedAt signal present')

  const sampleValues = sample ? Object.entries(sample).map(([key, value]) => ({ key, value })) : []
  const stringified = sampleValues.map(({ key, value }) => `${key}:${String(value ?? '')}`).join('\n')
  if (/squareyards\.com|squareyards/i.test(stringified)) {
    addSignal(0.2, 'SquareYards URL pattern detected')
  }

  if (sample && typeof sample.url === 'string' && /squareyards\.com/i.test(sample.url)) {
    addSignal(0.16, 'Direct SquareYards URL in source data')
  }

  if (sample && typeof sample.city === 'string' && /mumbai|navi mumbai|lucknow|hyderabad|pune|bengaluru|delhi/i.test(sample.city)) {
    addSignal(0.04, 'Known regional city pattern detected')
  }

  const confidence = Math.min(0.99, Math.max(0.12, Number(score.toFixed(2))))
  const detected = confidence >= 0.55 || normalizedFields.some((field) => field === 'listingid' || field === 'pricetext' || field === 'areasqft')

  return {
    detected,
    sourceProfileKey: detected ? SQUAREYARDS_SOURCE_PROFILE_KEY : null,
    confidence,
    reasons,
    fields: fieldNames,
  }
}

export interface CanonicalManualPropertyInput {
  title: string
  agentId: string
  developerId?: string | null
  sourceProvider?: string | null
  sourceUrl?: string | null
  sourceListingId?: string | null
  propertyType?: string | null
  intent?: 'SALE' | 'RENT' | null
  price?: number | null
  currency?: string | null
  constructionStatus?: 'READY' | 'OFF_PLAN' | null
  shortDescription?: string | null
  bedrooms?: number
  bathrooms?: number
  squareFeet?: number
  countryCode?: 'UAE' | 'INDIA'
  countryIso2?: string | null
  city?: string | null
  community?: string | null
  address?: string | null
  latitude?: number | null
  longitude?: number | null
  developerName?: string | null
  amenities?: unknown
  paymentPlanText?: string | null
  emiNote?: string | null
  tour3dUrl?: string | null
}

function readValue(record: Record<string, unknown>, paths: string[]) {
  const sharedValue = readImportField(record, paths)
  if (sharedValue !== undefined) return sharedValue
  for (const path of paths) {
    const value = path.split('.').reduce<unknown>((current, segment) => {
      if (!current || typeof current !== 'object') return undefined
      return (current as Record<string, unknown>)[segment]
    }, record)
    if (value !== undefined && value !== null && String(value).trim() !== '') return value
  }
  return undefined
}

function asText(value: unknown) {
  return value === undefined || value === null ? null : String(value).trim() || null
}

export const propertyImportAdapter: ImportAdapter<CanonicalManualPropertyInput> = {
  key: 'property',
  displayName: 'Properties',
  adapterVersion: 1,
  supportedFormats: ['csv', 'json', 'xlsx'],
  supportedOperations: ['CREATE', 'UPDATE', 'UPSERT'],

  getFieldDefinitions(): ImportFieldDefinition[] {
    return propertyFieldDefinitions
  },

  suggestMappings(input: { fields: string[] }): MappingSuggestion[] {
    return suggestPropertyMappings(input.fields, propertyFieldDefinitions)
  },

  detectSourceProfile(input) {
    return detectSquareYardsProperties(input.fields, input.sample)
  },

  normalize(input: NormalizationInput): NormalizationResult {
    const raw = (input.raw && typeof input.raw === 'object' ? input.raw : {}) as Record<string, unknown>
    const price = normalizePrice(readValue(raw, ['price', 'asking_price', 'askingPrice', 'amount']), readValue(raw, ['currency', 'price_currency']))
    const bedrooms = normalizeBedrooms(readValue(raw, ['bedrooms', 'bhk', 'beds', 'bedrooms_count']))
    const area = normalizeArea(readValue(raw, ['squareFeet', 'square_feet', 'built_up_area', 'area', 'size']), readValue(raw, ['areaUnit', 'area_unit', 'unit']))
    const normalized = {
      ...raw,
      title: asText(readValue(raw, ['title', 'property_name', 'listing_title', 'name'])),
      agentId: asText(readValue(raw, ['agentId', 'agent_id', 'ownerAgentId', 'owner_agent_id'])),
      price: price.amount,
      priceDisplay: price.display,
      priceCurrency: price.currency,
      priceUnresolved: price.unresolved,
      bedrooms,
      bathrooms: readValue(raw, ['bathrooms', 'baths', 'bathrooms_count']),
      squareFeet: area.amount,
      areaDisplay: area.display,
      areaUnresolved: area.unresolved,
      authorizedToMarket: normalizeBoolean(readValue(raw, ['authorizedToMarket', 'authorized_to_market'])),
      city: readValue(raw, ['city', 'city_name', 'location.city']),
      community: readValue(raw, ['community', 'locality', 'neighborhood', 'location.community']),
      sourceProvider: readValue(raw, ['sourceProvider', 'source_provider', 'provider', 'source']),
      sourceUrl: readValue(raw, ['sourceUrl', 'source_url', 'listing_url', 'url']),
      sourceListingId: readValue(raw, ['sourceListingId', 'source_listing_id', 'external_id', 'listing_id']),
    }
    return {
      normalized,
      warnings: price.unresolved ? ['Price could not be converted to a numeric amount.'] : [],
      errors: [],
    }
  },

  mapCanonical(input: CanonicalMappingInput): CanonicalPayloadResult<CanonicalManualPropertyInput> {
    const normalized = (input.normalized && typeof input.normalized === 'object' ? input.normalized : {}) as Record<string, unknown>
    const canonicalized = canonicalizePropertyImport({ property: normalized, schemaVersion: 'property-import-v1' })
    if (!canonicalized.ok || !canonicalized.normalized) {
      return { ok: false, canonical: null, warnings: [], errors: canonicalized.errors, fieldConfidence: {} }
    }

    const value = canonicalized.normalized as Record<string, unknown>
    const canonical: CanonicalManualPropertyInput = {
      title: String(value.title || '').trim(),
      agentId: String(value.agentId || '').trim(),
      sourceProvider: asText(value.sourceProvider),
      sourceUrl: asText(value.sourceUrl),
      sourceListingId: asText(value.sourceListingId),
      propertyType: asText(value.propertyType),
      intent: value.intent === 'RENT' ? 'RENT' : value.intent === 'SALE' ? 'SALE' : null,
      price: typeof value.price === 'number' ? value.price : null,
      currency: asText(value.priceCurrency || value.currency),
      constructionStatus: value.constructionStatus === 'OFF_PLAN' ? 'OFF_PLAN' : value.constructionStatus === 'READY' ? 'READY' : null,
      shortDescription: asText(value.shortDescription),
      bedrooms: typeof value.bedrooms === 'number' ? value.bedrooms : 0,
      bathrooms: Number(value.bathrooms) || 0,
      squareFeet: Number(value.squareFeet) || 0,
      countryCode: value.countryCode === 'UAE' ? 'UAE' : 'INDIA',
      countryIso2: asText(value.countryIso2),
      city: asText(value.city),
      community: asText(value.community),
      address: asText(value.address),
      latitude: typeof value.latitude === 'number' ? value.latitude : null,
      longitude: typeof value.longitude === 'number' ? value.longitude : null,
      developerName: asText(value.developerName),
      amenities: value.amenities ?? null,
      paymentPlanText: asText(value.paymentPlanText),
      emiNote: asText(value.emiNote),
      tour3dUrl: asText(value.tour3dUrl),
    }

    const fieldConfidence: Record<string, number> = {}
    input.mappings.forEach((mapping) => {
      if (mapping.canonicalField) fieldConfidence[mapping.canonicalField] = mapping.confidence
    })
    return { ok: true, canonical, warnings: [], errors: [], fieldConfidence }
  },

  validate(input: ValidationInput<CanonicalManualPropertyInput>): ValidationResult {
    const warnings: string[] = []
    const errors: string[] = []
    if (!input.canonical.title) errors.push('Property title is required.')
    if (!input.canonical.agentId) errors.push('An existing Agent owner is required.')
    if (!input.canonical.city || !input.canonical.community) warnings.push('Canonical city and community should be reviewed.')
    if (input.normalized && (input.normalized as any).areaUnresolved) warnings.push('Area could not be converted to square feet and should be reviewed.')
    if (input.canonical.price === null && input.normalized && (input.normalized as any).priceUnresolved) warnings.push('Price is unresolved and will remain display-only.')
    return { ready: errors.length === 0, warnings, errors }
  },

  getDuplicateSignals(): DuplicateSignalDefinition[] {
    return [
      { key: 'sourceProvider+sourceListingId', strength: 'deterministic' },
      { key: 'sourceUrl', strength: 'strong' },
      { key: 'title+city+community', strength: 'potential' },
    ]
  },

  resolveRelations(_input: RelationInput<CanonicalManualPropertyInput>): RelationResolution {
    return { ready: true, warnings: [], errors: [], metadata: {} }
  },

  prepareCommit(input: CommitPreparationInput<CanonicalManualPropertyInput>): CommitPreparation {
    return {
      identity: {
        provider: input.canonical.sourceProvider,
        sourceRecordId: null,
        sourceUrl: input.canonical.sourceUrl,
        sourceListingId: input.canonical.sourceListingId,
      },
    }
  },

  async commit(input) {
    const db = input.db as any
    const duplicateFilters = [
      input.canonical.sourceProvider && input.canonical.sourceListingId
        ? { sourceProvider: input.canonical.sourceProvider, sourceListingId: input.canonical.sourceListingId }
        : null,
      input.canonical.sourceUrl ? { sourceUrl: input.canonical.sourceUrl } : null,
    ].filter(Boolean)
    if (duplicateFilters.length > 0) {
      const existing = await db.manualProperty.findFirst({ where: { OR: duplicateFilters }, select: { id: true } })
      if (existing) return { status: 'skipped', entityId: existing.id, affectedPaths: [], reason: 'Matching property already exists.' }
    }
    const created = await createManualProperty(input.canonical, { db: input.db as any })
    return { status: 'created', entityId: created.property.id, affectedPaths: created.affectedPaths }
  },
}
