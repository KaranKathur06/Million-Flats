import type { CanonicalPayloadResult, CommitPreparation, DuplicateSignalDefinition, ImportAdapter, ImportFieldDefinition, MappingSuggestion, NormalizationInput, NormalizationResult, RelationInput, RelationResolution, ValidationInput, ValidationResult } from '@/lib/imports/core/types'
import { readImportField, suggestImportMappings } from '@/lib/imports/field-utils'

interface CanonicalAgency { name: string; countryCode?: 'UAE' | 'INDIA'; countryIso2?: string | null; isFeatured?: boolean }
const fields: ImportFieldDefinition[] = [
  { field: 'name', label: 'Agency name', type: 'string', requiredness: 'required', aliases: ['agency_name', 'company_name'] },
  { field: 'countryIso2', label: 'Country', type: 'string', requiredness: 'recommended', aliases: ['country', 'country_code'] },
  { field: 'isFeatured', label: 'Featured', type: 'boolean', requiredness: 'optional', aliases: ['is_featured', 'featured'] },
]
const text = (value: unknown) => value == null ? null : String(value).trim() || null
const read = readImportField
const mappings = (input: { fields: string[] }): MappingSuggestion[] => suggestImportMappings(input.fields, fields)

export const agencyImportAdapter: ImportAdapter<CanonicalAgency> = {
  key: 'agency', displayName: 'Agencies', adapterVersion: 1, supportedFormats: ['csv', 'json', 'xlsx'], supportedOperations: ['CREATE', 'UPDATE', 'UPSERT'],
  getFieldDefinitions: () => fields, suggestMappings: mappings,
  normalize(input: NormalizationInput): NormalizationResult {
    const raw = (input.raw && typeof input.raw === 'object' ? input.raw : {}) as Record<string, unknown>
    const country = String(read(raw, ['countryIso2', 'country_iso2', 'country_code', 'country']) || '').trim().toUpperCase()
    const countryIso2 = country === 'IN' || country === 'INDIA' ? 'IN' : country === 'AE' || country === 'UAE' ? 'AE' : null
    return { normalized: { ...raw, name: text(read(raw, ['name', 'agency_name', 'company_name'])), countryIso2, countryCode: countryIso2 === 'IN' ? 'INDIA' : 'UAE', isFeatured: String(read(raw, ['isFeatured', 'is_featured', 'featured']) || '').toLowerCase() === 'true' }, warnings: [], errors: [] }
  },
  mapCanonical(input: { raw: unknown; normalized: unknown; mappings: MappingSuggestion[] }): CanonicalPayloadResult<CanonicalAgency> {
    const value = (input.normalized || {}) as Record<string, unknown>
    const canonical: CanonicalAgency = { name: text(value.name) || '', countryCode: value.countryCode === 'INDIA' ? 'INDIA' : 'UAE', countryIso2: text(value.countryIso2), isFeatured: Boolean(value.isFeatured) }
    return { ok: Boolean(canonical.name), canonical, warnings: [], errors: canonical.name ? [] : ['Agency name is required.'], fieldConfidence: Object.fromEntries(input.mappings.filter((mapping) => mapping.canonicalField).map((mapping) => [mapping.canonicalField, mapping.confidence])) }
  },
  validate(input: ValidationInput<CanonicalAgency>): ValidationResult { const errors = input.canonical.name ? [] : ['Agency name is required.']; return { ready: errors.length === 0, warnings: [], errors } },
  getDuplicateSignals: (): DuplicateSignalDefinition[] => [{ key: 'name+countryIso2', strength: 'deterministic' }],
  resolveRelations: (_input: RelationInput<CanonicalAgency>): RelationResolution => ({ ready: true, warnings: [], errors: [], metadata: {} }),
  prepareCommit: (): CommitPreparation => ({ identity: { sourceRecordId: null, sourceUrl: null, provider: null } }),
  async commit(input) {
    const db = input.db as any
    const existing = await db.agency.findFirst({ where: { name: input.canonical.name, countryIso2: input.canonical.countryIso2 || null }, select: { id: true } })
    if (existing && input.operation === 'CREATE') return { status: 'skipped', entityId: existing.id, affectedPaths: [], reason: 'Matching agency already exists.' }
    const data = { name: input.canonical.name, countryCode: input.canonical.countryCode || 'UAE', countryIso2: input.canonical.countryIso2 || null, isFeatured: Boolean(input.canonical.isFeatured) }
    const agency = existing ? await db.agency.update({ where: { id: existing.id }, data }) : await db.agency.create({ data })
    return { status: existing ? 'updated' : 'created', entityId: agency.id, affectedPaths: ['/agencies', '/admin/agencies'] }
  },
}