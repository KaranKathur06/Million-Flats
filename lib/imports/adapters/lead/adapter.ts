import { createLead } from '@/lib/leads/createLead'
import { normalizeLeadType, normalizeEcosystemCategory } from '@/lib/leads/types'
import type { CanonicalPayloadResult, CommitPreparation, DuplicateSignalDefinition, ImportAdapter, ImportFieldDefinition, MappingSuggestion, NormalizationInput, NormalizationResult, RelationInput, RelationResolution, ValidationInput, ValidationResult } from '@/lib/imports/core/types'
import type { LeadCountry, LeadType, Prisma } from '@prisma/client'
import { readImportField, suggestImportMappings } from '@/lib/imports/field-utils'

interface CanonicalLead { leadType: LeadType; name: string; email: string; phone?: string | null; whatsapp?: string | null; message?: string | null; category?: string | null; sourceId?: string | null; sourceName?: string | null; projectOrCompany?: string | null; country?: LeadCountry; status?: string; projectId?: string | null; userId?: string | null; propertyType?: string | null; propertyName?: string | null; propertySize?: string | null; budgetRange?: string | null; timeline?: string | null; metadata?: Prisma.InputJsonValue }
const fields: ImportFieldDefinition[] = [
  { field: 'leadType', label: 'Lead type', type: 'enum', requiredness: 'required', aliases: ['lead_type', 'type'] },
  { field: 'name', label: 'Name', type: 'string', requiredness: 'required', aliases: ['contact_name', 'full_name'] },
  { field: 'email', label: 'Email', type: 'string', requiredness: 'required', aliases: ['email_address'] },
  { field: 'phone', label: 'Phone', type: 'string', requiredness: 'recommended', aliases: ['phone_number', 'mobile'] },
  { field: 'category', label: 'Category', type: 'string', requiredness: 'optional', aliases: ['lead_category', 'ecosystem_category'] },
  { field: 'projectId', label: 'Project ID', type: 'string', requiredness: 'optional', aliases: ['project_id'] },
]
const text = (value: unknown) => value == null ? null : String(value).trim() || null
const read = readImportField
const mappings = (input: { fields: string[] }): MappingSuggestion[] => suggestImportMappings(input.fields, fields)

export const leadImportAdapter: ImportAdapter<CanonicalLead> = {
  key: 'lead', displayName: 'Leads', adapterVersion: 1, supportedFormats: ['csv', 'json', 'xlsx'], supportedOperations: ['CREATE', 'UPSERT'],
  getFieldDefinitions: () => fields, suggestMappings: mappings,
  normalize(input: NormalizationInput): NormalizationResult {
    const raw = (input.raw && typeof input.raw === 'object' ? input.raw : {}) as Record<string, unknown>
    const rawType = text(read(raw, ['leadType', 'lead_type', 'type']))
    const rawCategory = text(read(raw, ['category', 'lead_category', 'ecosystem_category']))
    const leadType = normalizeLeadType(rawType) || (rawType?.toUpperCase() as LeadType | undefined) || null
    const category = leadType === 'ECOSYSTEM' ? normalizeEcosystemCategory(rawCategory) || rawCategory : rawCategory
    return { normalized: { ...raw, leadType, name: text(read(raw, ['name', 'contact_name', 'full_name'])), email: text(read(raw, ['email', 'email_address']))?.toLowerCase(), phone: text(read(raw, ['phone', 'phone_number', 'mobile'])), whatsapp: text(read(raw, ['whatsapp'])), message: text(read(raw, ['message', 'notes'])), category, sourceId: text(read(raw, ['sourceId', 'source_id'])), sourceName: text(read(raw, ['sourceName', 'source_name'])), projectOrCompany: text(read(raw, ['projectOrCompany', 'project_or_company', 'company'])), country: String(read(raw, ['country']) || 'INDIA').toUpperCase() === 'UAE' ? 'UAE' : 'INDIA', status: text(read(raw, ['status'])), projectId: text(read(raw, ['projectId', 'project_id'])), userId: text(read(raw, ['userId', 'user_id'])), propertyType: text(read(raw, ['propertyType', 'property_type'])), propertyName: text(read(raw, ['propertyName', 'property_name'])), propertySize: text(read(raw, ['propertySize', 'property_size'])), budgetRange: text(read(raw, ['budgetRange', 'budget_range'])), timeline: text(read(raw, ['timeline'])), metadata: raw.metadata && typeof raw.metadata === 'object' ? raw.metadata : undefined }, warnings: [], errors: [] }
  },
  mapCanonical(input: { raw: unknown; normalized: unknown; mappings: MappingSuggestion[] }): CanonicalPayloadResult<CanonicalLead> {
    const value = (input.normalized || {}) as Record<string, unknown>
    const leadType = typeof value.leadType === 'string' ? normalizeLeadType(value.leadType) || null : null
    const canonical: CanonicalLead = { leadType: leadType as LeadType, name: text(value.name) || '', email: text(value.email) || '', phone: text(value.phone), whatsapp: text(value.whatsapp), message: text(value.message), category: text(value.category), sourceId: text(value.sourceId), sourceName: text(value.sourceName), projectOrCompany: text(value.projectOrCompany), country: value.country === 'UAE' ? 'UAE' : 'INDIA', status: text(value.status) || undefined, projectId: text(value.projectId), userId: text(value.userId), propertyType: text(value.propertyType), propertyName: text(value.propertyName), propertySize: text(value.propertySize), budgetRange: text(value.budgetRange), timeline: text(value.timeline), metadata: value.metadata as Prisma.InputJsonValue | undefined }
    const errors = [!canonical.leadType && 'A valid lead type is required.', !canonical.name && 'Lead name is required.', !canonical.email && 'Lead email is required.'].filter(Boolean) as string[]
    return { ok: errors.length === 0, canonical, warnings: [], errors, fieldConfidence: Object.fromEntries(input.mappings.filter((mapping) => mapping.canonicalField).map((mapping) => [mapping.canonicalField, mapping.confidence])) }
  },
  validate(input: ValidationInput<CanonicalLead>): ValidationResult { const errors = [!input.canonical.leadType && 'A valid lead type is required.', !input.canonical.name && 'Lead name is required.', !/^\S+@\S+\.\S+$/.test(input.canonical.email) && 'A valid lead email is required.'].filter(Boolean) as string[]; return { ready: errors.length === 0, warnings: [], errors } },
  getDuplicateSignals: (): DuplicateSignalDefinition[] => [{ key: 'leadType+email+sourceId', strength: 'strong' }, { key: 'email+phone', strength: 'potential' }],
  resolveRelations: async (input: RelationInput<CanonicalLead>): Promise<RelationResolution> => ({ ready: true, warnings: input.canonical.projectId ? [] : ['No project relation supplied.'], errors: [], metadata: {} }),
  prepareCommit: (): CommitPreparation => ({ identity: { sourceRecordId: null, sourceUrl: null, provider: null } }),
  async commit(input) {
    if (input.operation !== 'CREATE' && input.operation !== 'UPSERT') throw new Error('Lead imports support CREATE and UPSERT only.')
    const lead = await createLead({ ...input.canonical, db: input.db as Prisma.TransactionClient, notify: false })
    return { status: 'created', entityId: lead.id, affectedPaths: ['/admin/leads'] }
  },
}