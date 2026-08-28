import { normalizePrice } from '@/lib/imports/normalization'
import type { CanonicalPayloadResult, CommitPreparation, DuplicateSignalDefinition, ImportAdapter, ImportFieldDefinition, MappingSuggestion, NormalizationInput, NormalizationResult, RelationInput, RelationResolution, ValidationInput, ValidationResult } from '@/lib/imports/core/types'
import { readImportField, suggestImportMappings } from '@/lib/imports/field-utils'

interface CanonicalProject { name: string; slug?: string | null; developerId?: string | null; developerName?: string | null; countryIso2?: string | null; city?: string | null; community?: string | null; description?: string | null; overview?: string | null; completionYear?: number | null; startingPrice?: number | null; goldenVisa?: boolean; coverImage?: string | null }
const fields: ImportFieldDefinition[] = [
  { field: 'name', label: 'Name', type: 'string', requiredness: 'required', aliases: ['project_name', 'project_title'] },
  { field: 'developerId', label: 'Developer', type: 'string', requiredness: 'required', aliases: ['developer_id'] },
  { field: 'developerName', label: 'Developer name', type: 'string', requiredness: 'recommended', aliases: ['developer', 'developer_name'] },
  { field: 'countryIso2', label: 'Country', type: 'string', requiredness: 'recommended', aliases: ['country', 'country_code'] },
  { field: 'city', label: 'City', type: 'string', requiredness: 'recommended', aliases: ['city_name'] },
  { field: 'community', label: 'Community', type: 'string', requiredness: 'optional', aliases: ['locality', 'neighborhood'] },
  { field: 'startingPrice', label: 'Starting price', type: 'number', requiredness: 'optional', aliases: ['price', 'starting_price', 'price_from'] },
]
const text = (value: unknown) => value == null ? null : String(value).trim() || null
const slugify = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 120)
const read = readImportField
const mappings = (input: { fields: string[] }): MappingSuggestion[] => suggestImportMappings(input.fields, fields)

export const projectImportAdapter: ImportAdapter<CanonicalProject> = {
  key: 'project', displayName: 'Projects', adapterVersion: 1, supportedFormats: ['csv', 'json', 'xlsx'], supportedOperations: ['CREATE', 'UPDATE', 'UPSERT'],
  getFieldDefinitions: () => fields,
  suggestMappings: mappings,
  normalize(input: NormalizationInput): NormalizationResult {
    const raw = (input.raw && typeof input.raw === 'object' ? input.raw : {}) as Record<string, unknown>
    const name = text(read(raw, ['name', 'project_name', 'project_title']))
    const price = normalizePrice(read(raw, ['startingPrice', 'starting_price', 'price', 'price_from']), read(raw, ['currency']))
    const developer = read(raw, ['developerName', 'developer_name', 'developer'])
    const countryInput = text(read(raw, ['countryIso2', 'country_iso2', 'country_code', 'country']))?.toUpperCase() || ''
    const countryIso2 = countryInput === 'IN' || countryInput === 'INDIA' ? 'IN' : countryInput === 'AE' || countryInput === 'UAE' ? 'AE' : null
    const normalized = { ...raw, name, slug: text(read(raw, ['slug'])) || (name ? slugify(name) : null), developerId: text(read(raw, ['developerId', 'developer_id'])), developerName: developer && typeof developer === 'object' ? text((developer as any).name) : text(developer), countryIso2, city: text(read(raw, ['city', 'city_name'])), community: text(read(raw, ['community', 'locality', 'neighborhood'])), description: text(read(raw, ['description'])), overview: text(read(raw, ['overview'])), completionYear: Number(read(raw, ['completionYear', 'completion_year'])) || null, startingPrice: price.amount, startingPriceDisplay: price.display, startingPriceUnresolved: price.unresolved, goldenVisa: Boolean(read(raw, ['goldenVisa', 'golden_visa'])), coverImage: text(read(raw, ['coverImage', 'cover_image'])) }
    return { normalized, warnings: price.unresolved ? ['Starting price could not be normalized.'] : [], errors: [] }
  },
  mapCanonical(input: { raw: unknown; normalized: unknown; mappings: MappingSuggestion[] }): CanonicalPayloadResult<CanonicalProject> {
    const value = (input.normalized || {}) as Record<string, unknown>
    const canonical: CanonicalProject = { name: text(value.name) || '', slug: text(value.slug), developerId: text(value.developerId), developerName: text(value.developerName), countryIso2: text(value.countryIso2), city: text(value.city), community: text(value.community), description: text(value.description), overview: text(value.overview), completionYear: Number(value.completionYear) || null, startingPrice: typeof value.startingPrice === 'number' ? value.startingPrice : null, goldenVisa: Boolean(value.goldenVisa), coverImage: text(value.coverImage) }
    return { ok: Boolean(canonical.name), canonical, warnings: [], errors: canonical.name ? [] : ['Project name is required.'], fieldConfidence: Object.fromEntries(input.mappings.filter((mapping) => mapping.canonicalField).map((mapping) => [mapping.canonicalField, mapping.confidence])) }
  },
  validate(input: ValidationInput<CanonicalProject>): ValidationResult { const errors = input.canonical.name ? [] : ['Project name is required.']; const warnings = input.canonical.developerId || input.canonical.developerName ? [] : ['Developer relationship requires review.']; return { ready: errors.length === 0, errors, warnings } },
  getDuplicateSignals: (): DuplicateSignalDefinition[] => [{ key: 'slug', strength: 'deterministic' }, { key: 'name+city', strength: 'strong' }],
  resolveRelations: (input: RelationInput<CanonicalProject>): RelationResolution => ({ ready: Boolean(input.canonical.developerId || input.canonical.developerName), warnings: [], errors: input.canonical.developerId || input.canonical.developerName ? [] : ['Developer relationship is required.'], metadata: {} }),
  prepareCommit: (): CommitPreparation => ({ identity: { sourceRecordId: null, sourceUrl: null, provider: null } }),
  async commit(input) {
    const db = input.db as any
    const value = input.canonical
    let developer = value.developerId ? await db.developer.findUnique({ where: { id: value.developerId } }) : null
    if (!developer && value.developerName) developer = await db.developer.findFirst({ where: { name: value.developerName } })
    if (!developer) throw new Error(`Developer "${value.developerName || value.developerId || 'unknown'}" could not be resolved.`)
    const slug = value.slug || slugify(value.name)
    const existing = await db.project.findUnique({ where: { slug }, select: { id: true, slug: true } })
    if (existing && input.operation === 'CREATE') return { status: 'skipped', entityId: existing.id, affectedPaths: [], reason: 'Matching project already exists.' }
    const data = { name: value.name, slug, developerId: developer.id, countryIso2: value.countryIso2 || null, city: value.city || null, community: value.community || null, description: value.description || null, overview: value.overview || null, completionYear: value.completionYear ?? null, startingPrice: value.startingPrice ?? null, goldenVisa: Boolean(value.goldenVisa), coverImage: value.coverImage || null, status: 'DRAFT' }
    const project = existing ? await db.project.update({ where: { id: existing.id }, data }) : await db.project.create({ data })
    return { status: existing ? 'updated' : 'created', entityId: project.id, affectedPaths: ['/projects', '/admin/projects', `/projects/${project.slug}`] }
  },
}
