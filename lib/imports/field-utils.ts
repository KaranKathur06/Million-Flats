import type { ImportFieldDefinition, MappingSuggestion } from './core/types'

export function normalizeImportField(value: string) {
  return String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '')
}

export function readImportField(raw: Record<string, unknown>, aliases: string[]) {
  const keys = new Map(Object.keys(raw).map((key) => [normalizeImportField(key), key]))
  for (const alias of aliases) {
    const directValue = alias.split('.').reduce<unknown>((current, segment) => {
      if (!current || typeof current !== 'object') return undefined
      return (current as Record<string, unknown>)[segment]
    }, raw)
    const value = directValue ?? raw[alias] ?? raw[keys.get(normalizeImportField(alias)) || '']
    if (value !== undefined && value !== null && String(value).trim() !== '') return value
  }
  return undefined
}

export function suggestImportMappings(fields: string[], definitions: ImportFieldDefinition[]): MappingSuggestion[] {
  return definitions.flatMap((definition) => {
    const accepted = [definition.field, ...definition.aliases].map(normalizeImportField)
    const match = fields.find((field) => accepted.includes(normalizeImportField(field)))
    return match
      ? [{ sourcePath: match, canonicalField: definition.field, confidence: 99, reason: 'Exact field or known alias', status: 'accepted' }]
      : []
  })
}