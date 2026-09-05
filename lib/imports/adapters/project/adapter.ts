import { normalizePrice } from '@/lib/imports/normalization'
import type { CanonicalPayloadResult, CommitPreparation, DuplicateSignalDefinition, ImportAdapter, ImportFieldDefinition, MappingSuggestion, NormalizationInput, NormalizationResult, RelationInput, RelationResolution, ValidationInput, ValidationResult } from '@/lib/imports/core/types'
import { readImportField, suggestImportMappings } from '@/lib/imports/field-utils'
import { INDIA_CITIES } from '@/lib/country'

interface CanonicalProject {
  name: string
  slug?: string | null
  developerId?: string | null
  developerName?: string | null
  countryIso2?: string | null
  city?: string | null
  community?: string | null
  description?: string | null
  overview?: string | null
  completionYear?: number | null
  startingPrice?: number | null
  goldenVisa?: boolean
  coverImage?: string | null
  unitTypes?: any[]
  floorPlans?: any[]
  amenities?: any[]
  paymentPlans?: any[]
  nearbyPlaces?: any[]
  location?: any
  videos?: any[]
}
const fields: ImportFieldDefinition[] = [
  { field: 'name', label: 'Name', type: 'string', requiredness: 'required', aliases: ['project_name', 'project_title', 'title'] },
  { field: 'developerId', label: 'Developer', type: 'string', requiredness: 'required', aliases: ['developer_id'] },
  { field: 'developerName', label: 'Developer name', type: 'string', requiredness: 'recommended', aliases: ['developer', 'developer_name'] },
  { field: 'countryIso2', label: 'Country', type: 'string', requiredness: 'recommended', aliases: ['country', 'country_code'] },
  { field: 'city', label: 'City', type: 'string', requiredness: 'recommended', aliases: ['city_name', 'location/fullName'] },
  { field: 'community', label: 'Community', type: 'string', requiredness: 'optional', aliases: ['locality', 'neighborhood', 'location/fullName'] },
  { field: 'startingPrice', label: 'Starting price', type: 'number', requiredness: 'optional', aliases: ['price', 'starting_price', 'price_from'] },
]
const text = (value: unknown) => value == null ? null : String(value).trim() || null
const slugify = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 120)
const normalizeCity = (value: unknown) => String(value ?? '').trim().toLowerCase().replace(/\s+/g, ' ')
const INDIA_CITY_ALIASES: Record<string, string> = {
  bengaluru: 'Bangalore',
  bangalore: 'Bangalore',
  gurugram: 'Gurgaon',
  thiruvananthapuram: 'Trivandrum',
}
const UAE_CITIES = new Set(['dubai', 'abu dhabi', 'sharjah', 'ajman', 'ras al khaimah', 'fujairah', 'umm al quwain'])
const inferCountryIso2 = (countryInput: string, city: unknown) => {
  if (countryInput === 'IN' || countryInput === 'INDIA') return 'IN'
  if (countryInput === 'AE' || countryInput === 'UAE') return 'AE'
  const normalizedCity = normalizeCity(city)
  const canonicalCity = INDIA_CITY_ALIASES[normalizedCity] || normalizedCity
  if (UAE_CITIES.has(canonicalCity)) return 'AE'
  return INDIA_CITIES.some((knownCity) => knownCity.toLowerCase() === canonicalCity) ? 'IN' : null
}
const read = readImportField
const mappings = (input: { fields: string[] }): MappingSuggestion[] => suggestImportMappings(input.fields, fields)

export const projectImportAdapter: ImportAdapter<CanonicalProject> = {
  key: 'project', displayName: 'Projects', adapterVersion: 3, supportedFormats: ['csv', 'json', 'xlsx'], supportedOperations: ['CREATE', 'UPDATE', 'UPSERT'],
  getFieldDefinitions: () => fields,
  suggestMappings: mappings,
  normalize(input: NormalizationInput): NormalizationResult {
    const raw = (input.raw && typeof input.raw === 'object' ? input.raw : {}) as Record<string, unknown>
    const name = text(read(raw, ['name', 'project_name', 'project_title', 'title']))
    const price = normalizePrice(read(raw, ['startingPrice', 'starting_price', 'price', 'price_from']), read(raw, ['currency']))
    const developer = read(raw, ['developerName', 'developer_name', 'developer'])
    const countryInput = text(read(raw, ['countryIso2', 'country_iso2', 'country_code', 'country']))?.toUpperCase() || ''
    const currencyInput = text(read(raw, ['currency', 'priceCurrency', 'price_currency']))?.toUpperCase() || ''
    const locationFullName = text(read(raw, ['location/fullName', 'location_full_name', 'location']))
    const city = text(read(raw, ['city', 'city_name'])) || (locationFullName ? locationFullName.split(',')[0]?.trim() || null : null)
    const community = text(read(raw, ['community', 'locality', 'neighborhood'])) || (locationFullName ? locationFullName.split(',').slice(1).join(',').trim() || null : null)
    const countryIso2 = inferCountryIso2(countryInput || (currencyInput === 'INR' ? 'IN' : currencyInput === 'AED' ? 'AE' : ''), city)
    const normalized = { ...raw, name, slug: text(read(raw, ['slug'])) || (name ? slugify(name) : null), developerId: text(read(raw, ['developerId', 'developer_id'])), developerName: developer && typeof developer === 'object' ? text((developer as any).name) : text(developer), countryIso2, city, community, description: text(read(raw, ['description'])), overview: text(read(raw, ['overview'])), completionYear: Number(read(raw, ['completionYear', 'completion_year'])) || null, startingPrice: price.amount, startingPriceDisplay: price.display, startingPriceUnresolved: price.unresolved, goldenVisa: Boolean(read(raw, ['goldenVisa', 'golden_visa'])), coverImage: text(read(raw, ['coverImage', 'cover_image'])) }
    return { normalized, warnings: price.unresolved ? ['Starting price could not be normalized.'] : [], errors: [] }
  },
  mapCanonical(input: { raw: unknown; normalized: unknown; mappings: MappingSuggestion[] }): CanonicalPayloadResult<CanonicalProject> {
    const value = (input.normalized || {}) as Record<string, unknown>
    const canonical: CanonicalProject = { name: text(value.name) || '', slug: text(value.slug), developerId: text(value.developerId), developerName: text(value.developerName), countryIso2: text(value.countryIso2), city: text(value.city), community: text(value.community), description: text(value.description), overview: text(value.overview), completionYear: Number(value.completionYear) || null, startingPrice: typeof value.startingPrice === 'number' ? value.startingPrice : null, goldenVisa: Boolean(value.goldenVisa), coverImage: text(value.coverImage) }
    return { ok: Boolean(canonical.name), canonical, warnings: [], errors: canonical.name ? [] : ['Project name is required.'], fieldConfidence: Object.fromEntries(input.mappings.filter((mapping) => mapping.canonicalField).map((mapping) => [mapping.canonicalField, mapping.confidence])) }
  },
  validate(input: ValidationInput<CanonicalProject>): ValidationResult { const errors = input.canonical.name ? [] : ['Project name is required.']; const warnings = input.canonical.developerId || input.canonical.developerName ? [] : ['Developer relationship requires review.']; return { ready: errors.length === 0, errors, warnings } },
  getDuplicateSignals: (): DuplicateSignalDefinition[] => [{ key: 'slug', strength: 'deterministic' }, { key: 'name+city', strength: 'strong' }],
  resolveRelations: async (input: RelationInput<CanonicalProject>): Promise<RelationResolution> => {
    const developerId = text(input.canonical.developerId)
    const developerName = text(input.canonical.developerName)
    if (!developerId && !developerName) {
      return { ready: false, warnings: [], errors: ['Developer relationship is required.'], metadata: {} }
    }

    const db = input.db as any
    if (!db?.developer?.findFirst && !db?.developer?.findUnique) {
      return { ready: true, warnings: [], errors: [], metadata: {} }
    }

    let developer = developerId
      ? await db.developer.findUnique({ where: { id: developerId }, select: { id: true, name: true } })
      : null
    if (!developer && developerName) {
      developer = await db.developer.findFirst({
        where: { name: { equals: developerName, mode: 'insensitive' } },
        select: { id: true, name: true },
      })
    }

    if (!developer) {
      return {
        ready: true,
        warnings: [`Developer "${developerName || developerId}" was not found and will be created as a draft relationship during commit.`],
        errors: [],
        metadata: { developerName, developerId, provision: 'CREATE_DRAFT_DEVELOPER' },
      }
    }

    input.canonical.developerId = developer.id
    input.canonical.developerName = developer.name
    return { ready: true, warnings: [], errors: [], metadata: { developerId: developer.id, developerName: developer.name } }
  },
  prepareCommit: (): CommitPreparation => ({ identity: { sourceRecordId: null, sourceUrl: null, provider: null } }),
  async commit(input) {
    const db = input.db as any
    const value = input.canonical as any
    let developer = value.developerId ? await db.developer.findUnique({ where: { id: value.developerId } }) : null
    if (!developer && value.developerName) {
      developer = await db.developer.findFirst({
        where: { name: { equals: value.developerName, mode: 'insensitive' } },
      })
    }
    if (!developer && value.developerName) {
      const developerName = String(value.developerName).trim()
      const baseSlug = slugify(developerName) || 'developer'
      let developerSlug = baseSlug
      let suffix = 2
      while (await db.developer.findUnique({ where: { slug: developerSlug }, select: { id: true } })) {
        developerSlug = `${baseSlug}-${suffix}`
        suffix += 1
      }
      developer = await db.developer.create({
        data: {
          name: developerName,
          slug: developerSlug,
          countryCode: value.countryIso2 === 'IN' ? 'INDIA' : value.countryIso2 === 'AE' ? 'UAE' : undefined,
          countryIso2: value.countryIso2 || null,
          city: value.city || null,
          status: 'ACTIVE',
        },
      })
    }
    if (!developer) throw new Error(`Developer "${value.developerName || value.developerId || 'unknown'}" could not be resolved.`)

    const slug = value.slug || slugify(value.name)
    const existing = await db.project.findUnique({ where: { slug }, select: { id: true, slug: true } })
    if (existing && input.operation === 'CREATE') return { status: 'skipped', entityId: existing.id, affectedPaths: [], reason: 'Matching project already exists.' }

    const baseData = {
      name: value.name,
      slug,
      developerId: developer.id,
      countryIso2: value.countryIso2 || null,
      city: value.city || null,
      community: value.community || null,
      description: value.description || null,
      overview: value.overview || null,
      completionYear: value.completionYear ?? null,
      startingPrice: value.startingPrice ?? null,
      goldenVisa: Boolean(value.goldenVisa),
      coverImage: value.coverImage || null,
      status: 'DRAFT',
    }

    const project = existing ? await db.project.update({ where: { id: existing.id }, data: baseData }) : await db.project.create({ data: baseData })

    if (existing && (input.operation === 'UPDATE' || input.operation === 'UPSERT')) {
      await db.projectPaymentPlan.deleteMany({ where: { projectId: project.id } })
      await db.projectAmenity.deleteMany({ where: { projectId: project.id } })
      await db.projectNearbyPlace.deleteMany({ where: { projectId: project.id } })
      await db.projectVideo.deleteMany({ where: { projectId: project.id } })
      await db.projectLocation.deleteMany({ where: { projectId: project.id } })
      await db.unitMedia.deleteMany({ where: { unitVariant: { projectId: project.id } } })
      await db.projectUnitVariant.deleteMany({ where: { projectId: project.id } })
      await db.projectUnitType.deleteMany({ where: { projectId: project.id } })
      await db.projectFloorPlan.deleteMany({ where: { projectId: project.id } })
    }

    if (Array.isArray(value.paymentPlans) && value.paymentPlans.length > 0) {
      await db.projectPaymentPlan.createMany({
        data: value.paymentPlans.map((pp: any, index: number) => ({
          projectId: project.id,
          itemType: String(pp.itemType || 'BASE_PRICE').toUpperCase() === 'FEE' ? 'FEE' : 'BASE_PRICE',
          label: String(pp.label || '').trim() || `Payment Plan ${index + 1}`,
          amount: Number(pp.amount ?? 0),
          currency: String(pp.currency || 'AED').trim().toUpperCase() || 'AED',
          milestone: pp.milestone ? String(pp.milestone).trim() : null,
          sortOrder: Number.isFinite(Number(pp.sortOrder)) ? Number(pp.sortOrder) : index,
        })),
      })
    }

    if (Array.isArray(value.amenities) && value.amenities.length > 0) {
      await db.projectAmenity.createMany({
        data: value.amenities.map((item: any) => ({
          projectId: project.id,
          name: String(item.name || '').trim(),
          icon: item.icon ? String(item.icon).trim() : null,
          category: item.category ? String(item.category).trim() : null,
        })).filter((item: any) => item.name),
      })
    }

    if (Array.isArray(value.nearbyPlaces) && value.nearbyPlaces.length > 0) {
      await db.projectNearbyPlace.createMany({
        data: value.nearbyPlaces.map((item: any, index: number) => ({
          projectId: project.id,
          name: String(item.name || '').trim(),
          category: item.category ? String(item.category).trim() : null,
          distance: item.distance ? String(item.distance).trim() : null,
          sortOrder: Number.isFinite(Number(item.sortOrder)) ? Number(item.sortOrder) : index,
        })).filter((item: any) => item.name),
      })
    }

    if (value.location && typeof value.location === 'object') {
      await db.projectLocation.create({
        data: {
          projectId: project.id,
          latitude: value.location.latitude ?? null,
          longitude: value.location.longitude ?? null,
          address: value.location.address ? String(value.location.address).trim() : null,
          mapUrl: value.location.mapUrl ? String(value.location.mapUrl).trim() : null,
        },
      })
    }

    if (Array.isArray(value.videos) && value.videos.length > 0) {
      await db.projectVideo.createMany({
        data: value.videos.map((video: any, index: number) => ({
          projectId: project.id,
          videoUrl: String(video.videoUrl || '').trim(),
          title: video.title ? String(video.title).trim() : null,
          thumbnail: video.thumbnail ? String(video.thumbnail).trim() : null,
          sortOrder: Number.isFinite(Number(video.sortOrder)) ? Number(video.sortOrder) : index,
        })).filter((video: any) => video.videoUrl),
      })
    }

    if (Array.isArray(value.unitTypes) && value.unitTypes.length > 0) {
      for (const [unitIndex, unitType] of value.unitTypes.entries()) {
        const createdType = await db.projectUnitType.create({
          data: {
            projectId: project.id,
            unitType: String(unitType.name || unitType.unitType || `Unit Type ${unitIndex + 1}`).trim(),
            bedrooms: unitType.bedrooms ?? null,
            bathrooms: unitType.bathrooms ?? null,
            sizeFrom: unitType.sizeFrom ?? unitType.sizeMin ?? null,
            sizeTo: unitType.sizeTo ?? unitType.sizeMax ?? null,
            priceFrom: unitType.priceFrom != null ? Number(unitType.priceFrom) || null : null,
            sortOrder: unitIndex,
          },
          select: { id: true },
        })

        const variantRows = Array.isArray(unitType.variants) ? unitType.variants : []
        for (const [variantIndex, variant] of variantRows.entries()) {
          const createdVariant = await db.projectUnitVariant.create({
            data: {
              projectId: project.id,
              unitTypeId: createdType.id,
              title: String(variant.title || 'Unit Variant').trim(),
              size: variant.size != null ? Number(variant.size) || null : null,
              price: variant.price != null ? Number(variant.price) || null : null,
              pricePerSqft: variant.size != null && variant.price != null && Number(variant.size) > 0 ? Number(variant.price) / Number(variant.size) : null,
              availabilityStatus: variant.availabilityStatus || ((variant.availableUnitsCount ?? 1) === 0 ? 'SOLD_OUT' : 'AVAILABLE'),
              availableUnitsCount: variant.availableUnitsCount ?? null,
              priceOnRequest: variant.priceOnRequest ?? (variant.price == null || String(variant.price).trim() === ''),
              sortOrder: variantIndex,
            },
            select: { id: true },
          })

          const floorPlans = Array.isArray(variant.floorPlans) ? variant.floorPlans.filter((fp: any) => String(fp.imageUrl || '').trim()) : []
          if (floorPlans.length > 0) {
            await db.projectFloorPlan.createMany({
              data: floorPlans.map((fp: any) => ({
                projectId: project.id,
                unitTypeId: createdType.id,
                unitVariantId: createdVariant.id,
                unitType: String(fp.title || variant.title || createdType.unitType || '').trim() || String(unitType.name || unitType.unitType || 'Floor Plan').trim(),
                bedrooms: fp.bedrooms ?? unitType.bedrooms ?? null,
                bathrooms: fp.bathrooms ?? unitType.bathrooms ?? null,
                size: fp.size ? String(fp.size).trim() : null,
                price: fp.price ? String(fp.price).trim() : null,
                imageUrl: fp.imageUrl ? String(fp.imageUrl).trim() : null,
              })),
            })
          }
        }
      }
    }

    const topLevelFloorPlans = Array.isArray(value.floorPlans) ? value.floorPlans.filter((fp: any) => String(fp.imageUrl || '').trim()) : []
    if (topLevelFloorPlans.length > 0) {
      await db.projectFloorPlan.createMany({
        data: topLevelFloorPlans.map((fp: any) => ({
          projectId: project.id,
          unitTypeId: null,
          unitVariantId: null,
          unitType: String(fp.unitType || '').trim() || 'Floor Plan',
          bedrooms: fp.bedrooms ?? null,
          bathrooms: fp.bathrooms ?? null,
          size: fp.size ? String(fp.size).trim() : null,
          price: fp.price ? String(fp.price).trim() : null,
          imageUrl: fp.imageUrl ? String(fp.imageUrl).trim() : null,
        })),
      })
    }

    return { status: existing ? 'updated' : 'created', entityId: project.id, affectedPaths: ['/projects', '/admin/projects', `/projects/${project.slug}`] }
  },
}
