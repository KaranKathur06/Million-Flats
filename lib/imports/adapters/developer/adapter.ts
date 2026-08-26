import { normalizeBoolean } from '@/lib/imports/normalization'
import type { CanonicalPayloadResult, CommitPreparation, DuplicateSignalDefinition, ImportAdapter, ImportFieldDefinition, MappingSuggestion, NormalizationInput, NormalizationResult, RelationInput, RelationResolution, ValidationInput, ValidationResult } from '@/lib/imports/core/types'

interface CanonicalDeveloper { name: string; slug?: string | null; countryCode?: 'UAE' | 'INDIA'; countryIso2?: string | null; city?: string | null; description?: string | null; shortDescription?: string | null; website?: string | null; foundedYear?: number | null; email?: string | null; phone?: string | null; address?: string | null; metaTitle?: string | null; metaDescription?: string | null; metaKeywords?: string | null; isFeatured?: boolean; featuredRank?: number | null; status?: 'ACTIVE' | 'INACTIVE'; sourceState?: string | null; sourceDuplicateCheck?: string | null }
const fields: ImportFieldDefinition[] = [
  { field: 'name', label: 'Name', type: 'string', requiredness: 'required', aliases: ['developer_name', 'company_name'] },
  { field: 'slug', label: 'Slug', type: 'string', requiredness: 'optional', aliases: ['developer_slug'] },
  { field: 'countryIso2', label: 'Country', type: 'string', requiredness: 'recommended', aliases: ['country', 'country_code'] },
  { field: 'city', label: 'City', type: 'string', requiredness: 'optional', aliases: ['location.city'] },
  { field: 'website', label: 'Website', type: 'string', requiredness: 'optional', aliases: ['website_url', 'url'] },
  { field: 'shortDescription', label: 'Short description', type: 'string', requiredness: 'recommended', aliases: ['short_description', 'tagline'] },
  { field: 'description', label: 'Full description', type: 'string', requiredness: 'optional', aliases: ['full_description', 'about'] },
  { field: 'foundedYear', label: 'Founded year', type: 'number', requiredness: 'optional', aliases: ['founded_year', 'year_founded'] },
  { field: 'email', label: 'Email', type: 'string', requiredness: 'optional', aliases: ['email_address', 'contact_email'] },
  { field: 'phone', label: 'Phone', type: 'string', requiredness: 'optional', aliases: ['phone_number', 'contact_phone'] },
  { field: 'address', label: 'Address', type: 'string', requiredness: 'optional', aliases: ['office_address', 'headquarters_address'] },
  { field: 'metaTitle', label: 'Meta title', type: 'string', requiredness: 'optional', aliases: ['meta_title', 'seo_title'] },
  { field: 'metaDescription', label: 'Meta description', type: 'string', requiredness: 'optional', aliases: ['meta_description', 'seo_description'] },
  { field: 'metaKeywords', label: 'Meta keywords', type: 'string', requiredness: 'optional', aliases: ['meta_keywords', 'seo_keywords'] },
]
const text = (value: unknown) => value == null ? null : String(value).trim() || null
const slugify = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 120)
const normalizeKey = (value: string) => value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '')
const read = (raw: Record<string, unknown>, aliases: string[]) => {
  const keys = new Map(Object.keys(raw).map((key) => [normalizeKey(key), key]))
  return aliases.map((key) => raw[key] ?? raw[keys.get(normalizeKey(key)) || '']).find((value) => value != null && String(value).trim() !== '')
}
const mappings = (input: { fields: string[] }): MappingSuggestion[] => fields.flatMap((definition) => { const match = input.fields.find((field) => [definition.field, ...definition.aliases].some((alias) => normalizeKey(alias) === normalizeKey(field))); return match ? [{ sourcePath: match, canonicalField: definition.field, confidence: 99, reason: 'Exact field or known alias', status: 'accepted' }] : [] })

export const developerImportAdapter: ImportAdapter<CanonicalDeveloper> = {
  key: 'developer', displayName: 'Developers', adapterVersion: 1, supportedFormats: ['csv', 'json', 'xlsx'], supportedOperations: ['CREATE', 'UPDATE', 'UPSERT'],
  getFieldDefinitions: () => fields,
  suggestMappings: mappings,
  normalize(input: NormalizationInput): NormalizationResult {
    const raw = (input.raw && typeof input.raw === 'object' ? input.raw : {}) as Record<string, unknown>
    const name = text(read(raw, ['name', 'developer_name', 'company_name']))
    const countryInput = text(read(raw, ['countryIso2', 'country_iso2', 'country_code', 'country']))?.toUpperCase() || ''
    const countryIso2 = countryInput === 'IN' || countryInput === 'INDIA' ? 'IN' : countryInput === 'AE' || countryInput === 'UAE' ? 'AE' : null
    const normalized = { ...raw, name, slug: text(read(raw, ['slug', 'developer_slug'])) || (name ? slugify(name) : null), countryIso2, countryCode: countryIso2 === 'IN' ? 'INDIA' : 'UAE', city: text(read(raw, ['city', 'location.city'])), website: text(read(raw, ['website', 'website_url', 'url'])), shortDescription: text(read(raw, ['shortDescription', 'short_description', 'tagline'])), description: text(read(raw, ['description', 'full_description', 'about'])), foundedYear: Number(read(raw, ['foundedYear', 'founded_year', 'year_founded'])) || null, email: text(read(raw, ['email', 'email_address', 'contact_email']))?.toLowerCase(), phone: text(read(raw, ['phone', 'phone_number', 'contact_phone'])), address: text(read(raw, ['address', 'office_address', 'headquarters_address'])), metaTitle: text(read(raw, ['metaTitle', 'meta_title', 'seo_title'])), metaDescription: text(read(raw, ['metaDescription', 'meta_description', 'seo_description'])), metaKeywords: text(read(raw, ['metaKeywords', 'meta_keywords', 'seo_keywords'])), sourceState: text(read(raw, ['state', 'province', 'region'])), sourceDuplicateCheck: text(read(raw, ['duplicateCheck', 'duplicate_check'])), isFeatured: normalizeBoolean(read(raw, ['isFeatured', 'is_featured'])), status: String(read(raw, ['status']) || 'ACTIVE').toUpperCase() === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE' }
    return { normalized, warnings: [], errors: [] }
  },
  mapCanonical(input: { raw: unknown; normalized: unknown; mappings: MappingSuggestion[] }): CanonicalPayloadResult<CanonicalDeveloper> {
    const value = (input.normalized || {}) as Record<string, unknown>
    const canonical: CanonicalDeveloper = { name: text(value.name) || '', slug: text(value.slug), countryCode: value.countryCode === 'INDIA' ? 'INDIA' : 'UAE', countryIso2: text(value.countryIso2), city: text(value.city), website: text(value.website), shortDescription: text(value.shortDescription), description: text(value.description), foundedYear: Number(value.foundedYear) || null, email: text(value.email), phone: text(value.phone), address: text(value.address), metaTitle: text(value.metaTitle), metaDescription: text(value.metaDescription), metaKeywords: text(value.metaKeywords), sourceState: text(value.sourceState), sourceDuplicateCheck: text(value.sourceDuplicateCheck), isFeatured: Boolean(value.isFeatured), status: value.status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE' }
    return { ok: Boolean(canonical.name), canonical, warnings: [], errors: canonical.name ? [] : ['Developer name is required.'], fieldConfidence: Object.fromEntries(input.mappings.filter((mapping) => mapping.canonicalField).map((mapping) => [mapping.canonicalField, mapping.confidence])) }
  },
  validate(input: ValidationInput<CanonicalDeveloper>): ValidationResult { const errors = input.canonical.name ? [] : ['Developer name is required.']; const warnings = input.canonical.website && !/^https?:\/\//i.test(input.canonical.website) ? ['Website should use http or https.'] : []; return { ready: errors.length === 0, errors, warnings } },
  getDuplicateSignals: (): DuplicateSignalDefinition[] => [{ key: 'name', strength: 'deterministic' }, { key: 'slug', strength: 'strong' }, { key: 'website', strength: 'potential' }],
  resolveRelations: (): RelationResolution => ({ ready: true, warnings: [], errors: [], metadata: {} }),
  prepareCommit: (input): CommitPreparation => ({ identity: { sourceRecordId: null, sourceUrl: null, provider: null } }),
  async commit(input) {
    const db = input.db as any
    const value = input.canonical
    const slug = value.slug || slugify(value.name)
    const existing = await db.developer.findFirst({ where: { OR: [{ name: value.name }, { slug }] }, select: { id: true, slug: true } })
    if (existing && input.operation === 'CREATE') return { status: 'skipped', entityId: existing.id, affectedPaths: [], reason: 'Matching developer already exists.' }
    const data = { name: value.name, slug, countryCode: value.countryCode || 'UAE', countryIso2: value.countryIso2 || null, city: value.city || null, description: value.description || null, shortDescription: value.shortDescription || null, website: value.website || null, foundedYear: value.foundedYear ?? null, email: value.email || null, phone: value.phone || null, address: value.address || null, metaTitle: value.metaTitle || null, metaDescription: value.metaDescription || null, metaKeywords: value.metaKeywords || null, isFeatured: Boolean(value.isFeatured), featuredRank: value.featuredRank ?? null, status: value.status || 'ACTIVE' }
    const developer = existing ? await db.developer.update({ where: { id: existing.id }, data }) : await db.developer.create({ data })
    return { status: existing ? 'updated' : 'created', entityId: developer.id, affectedPaths: ['/developers', '/admin/developers', `/developers/${developer.slug || slug}`] }
  },
}
