export type ImportFormat = 'csv' | 'json'

export interface ParserInput {
  content: string | Uint8Array
  fileName?: string
  mimeType?: string
  delimiter?: string
  headerRow?: number
  collectionPath?: string
}

export interface RawSourceRecord {
  sourceRecordId: string
  sourceRow: number | null
  sourcePath: string | null
  raw: unknown
}

export interface StructureDiscovery {
  format: ImportFormat
  encoding: string
  delimiter?: string
  headerRow?: number
  collectionPath?: string
  fields: string[]
  recordCount: number
  candidates?: Array<{ path: string; recordCount: number; confidence: number }>
}

export interface UniversalParser {
  canParse(input: ParserInput): boolean
  inspect(input: ParserInput): Promise<StructureDiscovery>
  parse(input: ParserInput): AsyncIterable<RawSourceRecord>
}

export function decodeInput(content: string | Uint8Array): string {
  const text = typeof content === 'string' ? content : new TextDecoder('utf-8').decode(content)
  return text.replace(/^\uFEFF/, '')
}

export function detectFormat(input: ParserInput): ImportFormat {
  const name = String(input.fileName || '').toLowerCase()
  if (input.mimeType === 'application/json' || name.endsWith('.json')) return 'json'
  if (input.mimeType === 'text/csv' || name.endsWith('.csv')) return 'csv'
  const content = decodeInput(input.content).trimStart()
  return content.startsWith('{') || content.startsWith('[') ? 'json' : 'csv'
}

export function detectDelimiter(sample: string): string {
  const candidates = [',', ';', '\t']
  const lines = sample.split(/\r?\n/).filter(Boolean).slice(0, 10)
  let best = ','
  let bestScore = -1

  for (const candidate of candidates) {
    const score = lines.reduce((total, line) => {
      let quoted = false
      let count = 0
      for (let index = 0; index < line.length; index += 1) {
        const char = line[index]
        if (char === '"') {
          if (quoted && line[index + 1] === '"') index += 1
          else quoted = !quoted
        } else if (!quoted && char === candidate) {
          count += 1
        }
      }
      return total + count
    }, 0)

    if (score > bestScore) {
      best = candidate
      bestScore = score
    }
  }

  return best
}

export function getPathValue(value: unknown, path: string): unknown {
  if (!path) return value
  return path.split('.').reduce<unknown>((current, segment) => {
    if (current === null || current === undefined || typeof current !== 'object') return undefined
    return (current as Record<string, unknown>)[segment]
  }, value)
}
