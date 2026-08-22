import type { ImportFieldDefinition, MappingSuggestion } from '@/lib/imports/core/types'

export function suggestPropertyMappings(fields: string[], definitions: ImportFieldDefinition[]): MappingSuggestion[] {
  const normalizedFields = fields.map((field) => ({ raw: field, normalized: field.trim().toLowerCase().replace(/\s+/g, '_') }))
  return definitions.flatMap<MappingSuggestion>((definition) => {
    const canonical = definition.field.toLowerCase()
    const aliases = new Set([canonical, ...definition.aliases.map((alias) => alias.toLowerCase())])
    const exact = normalizedFields.find((field) => aliases.has(field.normalized))
    if (exact) {
      return [{ sourcePath: exact.raw, canonicalField: definition.field, confidence: 99, reason: 'Exact field or known alias', status: 'accepted' }]
    }

    const semantic = normalizedFields.find((field) => field.normalized.includes(canonical) || canonical.includes(field.normalized))
    if (semantic) {
      return [{ sourcePath: semantic.raw, canonicalField: definition.field, confidence: 72, reason: 'Deterministic semantic match', status: 'review' }]
    }

    return []
  })
}
