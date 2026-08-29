export type ImportOperation = 'CREATE' | 'UPDATE' | 'UPSERT'
export type ImportMode = 'STRICT' | 'PARTIAL'
export type ImportEntityType = 'PROPERTY' | 'DEVELOPER' | 'PROJECT' | 'ECOSYSTEM_PARTNER' | 'AGENCY' | 'AGENT' | 'LEAD'
export type ImportFormat = 'csv' | 'json' | 'xlsx'

export interface ImportFieldDefinition {
  field: string
  label: string
  type: 'string' | 'number' | 'boolean' | 'date' | 'enum' | 'array' | 'object'
  requiredness: 'required' | 'recommended' | 'optional'
  aliases: string[]
  options?: string[]
}

export interface MappingSuggestion {
  sourcePath: string
  canonicalField: string | null
  confidence: number
  reason: string
  status: 'accepted' | 'review' | 'ignored'
}

export interface NormalizationInput {
  raw: unknown
  sourcePath: string | null
  mappings: MappingSuggestion[]
}

export interface NormalizationResult {
  normalized: unknown
  warnings: string[]
  errors: string[]
}

export interface CanonicalMappingInput {
  raw: unknown
  normalized: unknown
  mappings: MappingSuggestion[]
}

export interface CanonicalPayloadResult<T> {
  ok: boolean
  canonical: T | null
  warnings: string[]
  errors: string[]
  fieldConfidence: Record<string, number>
}

export interface ValidationInput<T> {
  canonical: T
  raw: unknown
  normalized: unknown
}

export interface ValidationResult {
  ready: boolean
  warnings: string[]
  errors: string[]
}

export interface DuplicateSignalDefinition {
  key: string
  strength: 'deterministic' | 'strong' | 'potential'
}

export interface DuplicateCandidate {
  classification: 'EXACT_DUPLICATE' | 'STRONG_MATCH' | 'POTENTIAL_DUPLICATE' | 'NO_MATCH'
  targetId?: string
  score: number
  signals: string[]
}

export interface RelationInput<T> {
  canonical: T
  raw: unknown
}

export interface RelationResolution {
  ready: boolean
  warnings: string[]
  errors: string[]
  metadata: Record<string, unknown>
}

export interface CommitPreparationInput<T> {
  canonical: T
  operation: ImportOperation
}

export interface CommitPreparation {
  identity: { provider?: string | null; sourceRecordId?: string | null; sourceUrl?: string | null; sourceListingId?: string | null }
}

export interface ImportCommitResult {
  status: 'created' | 'updated' | 'skipped'
  entityId: string
  affectedPaths: string[]
  reason?: string
}

export interface SourceProfileDetection {
  detected: boolean
  sourceProfileKey: string | null
  confidence: number
  reasons: string[]
  fields: string[]
}

export interface ImportAdapter<TCanonical> {
  key: string
  displayName: string
  adapterVersion: number
  supportedFormats: ImportFormat[]
  supportedOperations: ImportOperation[]
  getFieldDefinitions(): ImportFieldDefinition[]
  suggestMappings(input: { fields: string[] }): MappingSuggestion[]
  detectSourceProfile?(input: { fields: string[]; sample?: Record<string, unknown>; fileName?: string; sourceProvider?: string | null }): SourceProfileDetection
  normalize(input: NormalizationInput): NormalizationResult
  mapCanonical(input: CanonicalMappingInput): CanonicalPayloadResult<TCanonical>
  validate(input: ValidationInput<TCanonical>): ValidationResult
  getDuplicateSignals(): DuplicateSignalDefinition[]
  resolveRelations(input: RelationInput<TCanonical>): Promise<RelationResolution>
  prepareCommit(input: CommitPreparationInput<TCanonical>): CommitPreparation
  commit(input: { canonical: TCanonical; operation: ImportOperation; sourceRecordId: string; db: unknown }): Promise<ImportCommitResult>
}
