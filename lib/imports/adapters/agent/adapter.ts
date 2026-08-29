import type { CanonicalPayloadResult, CommitPreparation, DuplicateSignalDefinition, ImportAdapter, ImportFieldDefinition, MappingSuggestion, NormalizationInput, NormalizationResult, RelationInput, RelationResolution, ValidationInput, ValidationResult } from '@/lib/imports/core/types'
import { readImportField, suggestImportMappings } from '@/lib/imports/field-utils'

interface CanonicalAgent { userId: string; agencyId?: string | null; company?: string | null; license?: string | null; countryCode?: 'UAE' | 'INDIA'; countryIso2?: string | null; yearsExperience?: number | null; websiteUrl?: string | null; bio?: string | null }
const fields: ImportFieldDefinition[] = [
  { field: 'userId', label: 'Existing user ID', type: 'string', requiredness: 'required', aliases: ['user_id'] },
  { field: 'agencyId', label: 'Agency ID', type: 'string', requiredness: 'optional', aliases: ['agency_id'] },
  { field: 'company', label: 'Company', type: 'string', requiredness: 'optional', aliases: ['company_name'] },
  { field: 'license', label: 'License', type: 'string', requiredness: 'recommended', aliases: ['license_number'] },
  { field: 'countryIso2', label: 'Country', type: 'string', requiredness: 'recommended', aliases: ['country', 'country_code'] },
]
const text = (value: unknown) => value == null ? null : String(value).trim() || null
const read = readImportField
const mappings = (input: { fields: string[] }): MappingSuggestion[] => suggestImportMappings(input.fields, fields)

export const agentImportAdapter: ImportAdapter<CanonicalAgent> = {
  key: 'agent', displayName: 'Agents', adapterVersion: 1, supportedFormats: ['csv', 'json', 'xlsx'], supportedOperations: ['CREATE', 'UPDATE', 'UPSERT'],
  getFieldDefinitions: () => fields, suggestMappings: mappings,
  normalize(input: NormalizationInput): NormalizationResult {
    const raw = (input.raw && typeof input.raw === 'object' ? input.raw : {}) as Record<string, unknown>
    const country = String(read(raw, ['countryIso2', 'country_iso2', 'country_code', 'country']) || '').trim().toUpperCase()
    const countryIso2 = country === 'IN' || country === 'INDIA' ? 'IN' : country === 'AE' || country === 'UAE' ? 'AE' : null
    return { normalized: { ...raw, userId: text(read(raw, ['userId', 'user_id'])), agencyId: text(read(raw, ['agencyId', 'agency_id'])), company: text(read(raw, ['company', 'company_name'])), license: text(read(raw, ['license', 'license_number'])), countryIso2, countryCode: countryIso2 === 'IN' ? 'INDIA' : 'UAE', yearsExperience: Number(read(raw, ['yearsExperience', 'years_experience'])) || null, websiteUrl: text(read(raw, ['websiteUrl', 'website_url', 'website'])), bio: text(read(raw, ['bio', 'description'])) }, warnings: [], errors: [] }
  },
  mapCanonical(input: { raw: unknown; normalized: unknown; mappings: MappingSuggestion[] }): CanonicalPayloadResult<CanonicalAgent> {
    const value = (input.normalized || {}) as Record<string, unknown>
    const canonical: CanonicalAgent = { userId: text(value.userId) || '', agencyId: text(value.agencyId), company: text(value.company), license: text(value.license), countryCode: value.countryCode === 'INDIA' ? 'INDIA' : 'UAE', countryIso2: text(value.countryIso2), yearsExperience: Number(value.yearsExperience) || null, websiteUrl: text(value.websiteUrl), bio: text(value.bio) }
    return { ok: Boolean(canonical.userId), canonical, warnings: [], errors: canonical.userId ? [] : ['An existing userId is required.'], fieldConfidence: Object.fromEntries(input.mappings.filter((mapping) => mapping.canonicalField).map((mapping) => [mapping.canonicalField, mapping.confidence])) }
  },
  validate(input: ValidationInput<CanonicalAgent>): ValidationResult { const errors = input.canonical.userId ? [] : ['An existing userId is required.']; return { ready: errors.length === 0, warnings: [], errors } },
  getDuplicateSignals: (): DuplicateSignalDefinition[] => [{ key: 'userId', strength: 'deterministic' }, { key: 'license', strength: 'strong' }],
  resolveRelations: async (input: RelationInput<CanonicalAgent>): Promise<RelationResolution> => ({ ready: Boolean(input.canonical.userId), warnings: [], errors: input.canonical.userId ? [] : ['Existing user relation is required.'], metadata: {} }),
  prepareCommit: (): CommitPreparation => ({ identity: { sourceRecordId: null, sourceUrl: null, provider: null } }),
  async commit(input) {
    const db = input.db as any
    const user = await db.user.findUnique({ where: { id: input.canonical.userId }, select: { id: true } })
    if (!user) throw new Error('The referenced user does not exist.')
    const existing = await db.agent.findUnique({ where: { userId: input.canonical.userId }, select: { id: true } })
    if (existing && input.operation === 'CREATE') return { status: 'skipped', entityId: existing.id, affectedPaths: [], reason: 'An agent profile already exists for this user.' }
    const agent = existing ? await db.agent.update({ where: { id: existing.id }, data: input.canonical }) : await db.agent.create({ data: { ...input.canonical, status: 'REGISTERED', approved: false } })
    return { status: existing ? 'updated' : 'created', entityId: agent.id, affectedPaths: ['/agents', '/admin/agents'] }
  },
}