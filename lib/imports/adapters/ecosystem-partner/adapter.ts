import { applyApprovalDefaults } from '@/lib/ecosystem/partnerVisibility'
import { revalidatePartnerSurfaces } from '@/lib/ecosystem/revalidatePartner'
import { slugifyPartnerName } from '@/lib/ecosystem/slugify'
import type { CanonicalPayloadResult, CommitPreparation, DuplicateSignalDefinition, ImportAdapter, ImportFieldDefinition, MappingSuggestion, NormalizationInput, NormalizationResult, RelationInput, RelationResolution, ValidationInput, ValidationResult } from '@/lib/imports/core/types'
import { normalizeImportField, readImportField, suggestImportMappings } from '@/lib/imports/field-utils'

interface CanonicalEcosystemPartner {
  categoryId?: string | null
  categorySlug?: string | null
  name: string
  slug?: string | null
  tagline?: string | null
  shortDescription?: string | null
  description?: string | null
  logo?: string | null
  coverImage?: string | null
  rating?: number | null
  yearsExperience?: number | null
  experienceDisplay?: string | null
  projectsCompleted?: number | null
  teamSize?: number | null
  partnerSince?: number | null
  locationCoverage?: string | null
  pricingRange?: string | null
  contactEmail?: string | null
  contactPhone?: string | null
  website?: string | null
  categoryData?: unknown
  status?: 'PENDING' | 'APPROVED' | 'REJECTED'
}

const fields: ImportFieldDefinition[] = [
  { field: 'name', label: 'Business name', type: 'string', requiredness: 'required', aliases: ['business_name', 'company_name', 'partner_name'] },
  { field: 'categoryId', label: 'Category ID', type: 'string', requiredness: 'recommended', aliases: ['category_id'] },
  { field: 'categorySlug', label: 'Category', type: 'string', requiredness: 'recommended', aliases: ['category', 'category_slug', 'partner_category'] },
  { field: 'contactEmail', label: 'Contact email', type: 'string', requiredness: 'optional', aliases: ['email', 'contact_email'] },
  { field: 'website', label: 'Website', type: 'string', requiredness: 'optional', aliases: ['website_url', 'url'] },
  { field: 'shortDescription', label: 'Short description', type: 'string', requiredness: 'recommended', aliases: ['short_description', 'tagline'] },
  { field: 'locationCoverage', label: 'Location coverage', type: 'string', requiredness: 'optional', aliases: ['service_areas', 'locations'] },
  { field: 'yearsExperience', label: 'Years of experience', type: 'number', requiredness: 'optional', aliases: ['years_experience', 'years of experience'] },
  { field: 'experienceDisplay', label: 'Experience display', type: 'string', requiredness: 'optional', aliases: ['experience_display'] },
  { field: 'loanTypes', label: 'Loan types', type: 'string', requiredness: 'optional', aliases: ['loan_types', 'loan types'] },
  { field: 'interestRateMin', label: 'Interest rate minimum', type: 'number', requiredness: 'optional', aliases: ['interest_rate_min', 'interest rate min (%)'] },
  { field: 'interestRateMax', label: 'Interest rate maximum', type: 'number', requiredness: 'optional', aliases: ['interest_rate_max', 'interest rate max (%)'] },
  { field: 'processingFee', label: 'Processing fee', type: 'string', requiredness: 'optional', aliases: ['processing_fee', 'processing fee'] },
  { field: 'rbiRegistration', label: 'RBI registration', type: 'string', requiredness: 'optional', aliases: ['rbi_registration', 'rbi registration'] },
]
const text = (value: unknown) => value == null ? null : String(value).trim() || null
const read = readImportField
const number = (value: unknown) => { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : null }
const leadingNumber = (value: unknown) => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  const match = String(value ?? '').trim().match(/^\d+(?:\.\d+)?/)
  return match ? number(match[0]) : null
}
const list = (value: unknown) => String(value || '').split(';').map((item) => item.trim()).filter(Boolean)
const mappings = (input: { fields: string[] }): MappingSuggestion[] => suggestImportMappings(input.fields, fields)

export const ecosystemPartnerImportAdapter: ImportAdapter<CanonicalEcosystemPartner> = {
  key: 'ecosystem-partner', displayName: 'Ecosystem Partners', adapterVersion: 1, supportedFormats: ['csv', 'json', 'xlsx'], supportedOperations: ['CREATE', 'UPDATE', 'UPSERT'],
  getFieldDefinitions: () => fields,
  suggestMappings: mappings,
  normalize(input: NormalizationInput): NormalizationResult {
    const raw = (input.raw && typeof input.raw === 'object' ? input.raw : {}) as Record<string, unknown>
    const name = text(read(raw, ['name', 'business_name', 'company_name', 'partner_name']))
    const known = new Set([
      'name', 'business_name', 'company_name', 'partner_name', 'categoryId', 'category_id', 'category', 'categorySlug', 'category_slug', 'partner_category', 'slug', 'tagline', 'shortDescription', 'short_description', 'description', 'logo', 'coverImage', 'cover_image', 'rating', 'yearsExperience', 'years_experience', 'Years of Experience', 'experienceDisplay', 'experience_display', 'projectsCompleted', 'projects_completed', 'teamSize', 'team_size', 'partnerSince', 'partner_since', 'locationCoverage', 'location_coverage', 'service_areas', 'locations', 'pricingRange', 'pricing_range', 'contactEmail', 'contact_email', 'email', 'contactPhone', 'contact_phone', 'phone', 'website', 'website_url', 'url', 'status', 'loanTypes', 'loan_types', 'loan types', 'interestRateMin', 'interest_rate_min', 'Interest Rate Min (%)', 'interestRateMax', 'interest_rate_max', 'Interest Rate Max (%)', 'processingFee', 'processing_fee', 'Processing Fee', 'rbiRegistration', 'rbi_registration', 'RBI Registration',
    ].map(normalizeImportField))
    const categoryData = Object.fromEntries(Object.entries(raw).filter(([key]) => !known.has(normalizeImportField(key))))
    const yearsExperience = leadingNumber(read(raw, ['yearsExperience', 'years_experience', 'Years of Experience']))
    const experienceDisplay = text(read(raw, ['experienceDisplay', 'experience_display', 'Years of Experience']))
    const loanTypes = list(read(raw, ['loanTypes', 'loan_types', 'loan types']))
    const interestRateMin = number(read(raw, ['interestRateMin', 'interest_rate_min', 'Interest Rate Min (%)']))
    const interestRateMax = number(read(raw, ['interestRateMax', 'interest_rate_max', 'Interest Rate Max (%)']))
    const processingFee = text(read(raw, ['processingFee', 'processing_fee', 'Processing Fee']))
    const rbiRegistration = text(read(raw, ['rbiRegistration', 'rbi_registration', 'RBI Registration']))
    if (loanTypes.length > 0) categoryData.loanTypes = loanTypes
    if (interestRateMin !== null) categoryData.interestRateMin = interestRateMin
    if (interestRateMax !== null) categoryData.interestRateMax = interestRateMax
    if (processingFee !== null) categoryData.processingFee = processingFee
    if (rbiRegistration !== null) categoryData.rbiRegistration = rbiRegistration
    return { normalized: { ...raw, name, categoryId: text(read(raw, ['categoryId', 'category_id'])), categorySlug: text(read(raw, ['categorySlug', 'category_slug', 'category', 'partner_category'])), slug: text(read(raw, ['slug'])) || (name ? slugifyPartnerName(name) : null), tagline: text(read(raw, ['tagline'])), shortDescription: text(read(raw, ['shortDescription', 'short_description'])), description: text(read(raw, ['description'])), logo: text(read(raw, ['logo'])), coverImage: text(read(raw, ['coverImage', 'cover_image'])), rating: number(read(raw, ['rating'])), yearsExperience, experienceDisplay, projectsCompleted: number(read(raw, ['projectsCompleted', 'projects_completed'])), teamSize: number(read(raw, ['teamSize', 'team_size'])), partnerSince: number(read(raw, ['partnerSince', 'partner_since'])), locationCoverage: text(read(raw, ['locationCoverage', 'location_coverage', 'service_areas', 'locations'])), pricingRange: text(read(raw, ['pricingRange', 'pricing_range'])), contactEmail: text(read(raw, ['contactEmail', 'contact_email', 'email']))?.toLowerCase(), contactPhone: text(read(raw, ['contactPhone', 'contact_phone', 'phone'])), website: text(read(raw, ['website', 'website_url', 'url'])), status: String(read(raw, ['status']) || 'PENDING').toUpperCase(), categoryData }, warnings: [], errors: [] }
  },
  mapCanonical(input: { raw: unknown; normalized: unknown; mappings: MappingSuggestion[] }): CanonicalPayloadResult<CanonicalEcosystemPartner> {
    const value = (input.normalized || {}) as Record<string, unknown>
    const canonical: CanonicalEcosystemPartner = { categoryId: text(value.categoryId), categorySlug: text(value.categorySlug), name: text(value.name) || '', slug: text(value.slug), tagline: text(value.tagline), shortDescription: text(value.shortDescription), description: text(value.description), logo: text(value.logo), coverImage: text(value.coverImage), rating: number(value.rating), yearsExperience: number(value.yearsExperience), experienceDisplay: text(value.experienceDisplay), projectsCompleted: number(value.projectsCompleted), teamSize: number(value.teamSize), partnerSince: number(value.partnerSince), locationCoverage: text(value.locationCoverage), pricingRange: text(value.pricingRange), contactEmail: text(value.contactEmail), contactPhone: text(value.contactPhone), website: text(value.website), categoryData: value.categoryData, status: value.status === 'APPROVED' || value.status === 'REJECTED' ? value.status : 'PENDING' }
    return { ok: Boolean(canonical.name), canonical, warnings: [], errors: canonical.name ? [] : ['Partner business name is required.'], fieldConfidence: Object.fromEntries(input.mappings.filter((mapping) => mapping.canonicalField).map((mapping) => [mapping.canonicalField, mapping.confidence])) }
  },
  validate(input: ValidationInput<CanonicalEcosystemPartner>): ValidationResult { const errors = input.canonical.name ? [] : ['Partner business name is required.']; const warnings = input.canonical.categoryId || input.canonical.categorySlug ? [] : ['Partner category requires review.']; return { ready: errors.length === 0, errors, warnings } },
  getDuplicateSignals: (): DuplicateSignalDefinition[] => [{ key: 'category+name', strength: 'strong' }, { key: 'category+contactEmail', strength: 'deterministic' }, { key: 'category+website', strength: 'potential' }],
  resolveRelations: (input: RelationInput<CanonicalEcosystemPartner>): RelationResolution => ({ ready: Boolean(input.canonical.categoryId || input.canonical.categorySlug), warnings: [], errors: input.canonical.categoryId || input.canonical.categorySlug ? [] : ['Partner category is required.'], metadata: {} }),
  prepareCommit: (): CommitPreparation => ({ identity: { sourceRecordId: null, sourceUrl: null, provider: null } }),
  async commit(input) {
    const db = input.db as any
    const value = input.canonical
    const category = value.categoryId ? await db.ecosystemCategory.findUnique({ where: { id: value.categoryId }, select: { id: true, slug: true } }) : value.categorySlug ? await db.ecosystemCategory.findUnique({ where: { slug: value.categorySlug }, select: { id: true, slug: true } }) : null
    if (!category) throw new Error(`Ecosystem category "${value.categorySlug || value.categoryId || 'unknown'}" could not be resolved.`)
    const slug = value.slug || slugifyPartnerName(value.name)
    const existing = await db.ecosystemPartner.findFirst({ where: { categoryId: category.id, OR: [{ slug }, ...(value.contactEmail ? [{ contactEmail: value.contactEmail }] : []), { name: value.name }] }, select: { id: true, slug: true } })
    if (existing && input.operation === 'CREATE') return { status: 'skipped', entityId: existing.id, affectedPaths: [], reason: 'Matching ecosystem partner already exists.' }
    const data: Record<string, unknown> = { categoryId: category.id, name: value.name, slug: slug || null, tagline: value.tagline || null, shortDescription: value.shortDescription || null, description: value.description || null, logo: value.logo || null, coverImage: value.coverImage || null, rating: value.rating ?? null, yearsExperience: value.yearsExperience ?? null, experienceDisplay: value.experienceDisplay || null, projectsCompleted: value.projectsCompleted ?? null, teamSize: value.teamSize ?? null, partnerSince: value.partnerSince ?? null, locationCoverage: value.locationCoverage || null, pricingRange: value.pricingRange || null, contactEmail: value.contactEmail || `${slug}@partners.millionflats.local`, contactPhone: value.contactPhone || null, website: value.website || null, categoryData: value.categoryData || null, status: value.status || 'PENDING', isFeatured: false, isVerified: false, isActive: true }
    applyApprovalDefaults(data)
    const partner = existing ? await db.ecosystemPartner.update({ where: { id: existing.id }, data }) : await db.ecosystemPartner.create({ data })
    revalidatePartnerSurfaces(category.slug, partner.slug)
    return { status: existing ? 'updated' : 'created', entityId: partner.id, affectedPaths: ['/ecosystem-partners', `/ecosystem-partners/${category.slug}`, partner.slug ? `/partners/${category.slug}/${partner.slug}` : '/ecosystem-partners'] }
  },
}