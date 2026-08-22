import { parse } from 'csv-parse/sync'
import {
  decodeInput,
  detectDelimiter,
  type ParserInput,
  type RawSourceRecord,
  type StructureDiscovery,
  type UniversalParser,
} from './parser'

function parseRows(input: ParserInput) {
  const text = decodeInput(input.content)
  const delimiter = input.delimiter || detectDelimiter(text)
  const rows = parse(text, {
    delimiter,
    bom: true,
    relax_column_count: true,
    skip_empty_lines: false,
    trim: false,
  }) as string[][]
  return { text, delimiter, rows }
}

function findHeaderRow(rows: string[][], explicitHeaderRow?: number) {
  if (explicitHeaderRow !== undefined && rows[explicitHeaderRow]) return explicitHeaderRow
  const knownFields = new Set([
    'title', 'property_name', 'listing_title', 'price', 'asking_price', 'city',
    'community', 'location', 'bedrooms', 'bhk', 'bathrooms', 'squarefeet',
    'square_feet', 'built_up_area', 'source_url', 'source_listing_id',
  ])
  let bestIndex = 0
  let bestScore = -1
  rows.slice(0, 20).forEach((row, index) => {
    const nonEmpty = row.filter((cell) => String(cell || '').trim()).length
    const unique = new Set(row.map((cell) => String(cell || '').trim().toLowerCase()).filter(Boolean)).size
    const known = row.filter((cell) => knownFields.has(String(cell || '').trim().toLowerCase())).length
    const score = known * 10 + nonEmpty + unique * 0.25
    if (score > bestScore) {
      bestScore = score
      bestIndex = index
    }
  })
  return bestIndex
}

function buildHeaders(row: string[]) {
  const seen = new Map<string, number>()
  return row.map((cell, index) => {
    const base = String(cell || '').trim() || `column_${index + 1}`
    const count = seen.get(base) || 0
    seen.set(base, count + 1)
    return count === 0 ? base : `${base}_${count + 1}`
  })
}

export const csvParser: UniversalParser = {
  canParse(input) {
    const name = String(input.fileName || '').toLowerCase()
    return input.mimeType === 'text/csv' || name.endsWith('.csv')
  },

  async inspect(input): Promise<StructureDiscovery> {
    const { delimiter, rows } = parseRows(input)
    const headerRow = findHeaderRow(rows, input.headerRow)
    const fields = buildHeaders(rows[headerRow] || [])
    const recordCount = Math.max(0, rows.slice(headerRow + 1).filter((row) => row.some((cell) => String(cell || '').trim())).length)
    return { format: 'csv', encoding: 'utf-8', delimiter, headerRow, fields, recordCount }
  },

  async *parse(input): AsyncIterable<RawSourceRecord> {
    const { text, delimiter, rows } = parseRows(input)
    const headerRow = findHeaderRow(rows, input.headerRow)
    const headers = buildHeaders(rows[headerRow] || [])
    const parsedRecords = parse(text, {
      delimiter,
      bom: true,
      columns: headers,
      from_line: headerRow + 2,
      relax_column_count: true,
      skip_empty_lines: true,
      info: true,
      trim: false,
    }) as Array<{ record: Record<string, string>; info: { lines: number; records: number } }>

    for (const entry of parsedRecords) {
      const raw = entry.record
      const multilineLines = Object.values(raw).reduce((max, value) => Math.max(max, String(value || '').split(/\r?\n/).length - 1), 0)
      yield {
        sourceRecordId: String(raw.id || raw.sourceRecordId || entry.info.records),
        sourceRow: Math.max(headerRow + 2, entry.info.lines - multilineLines),
        sourcePath: null,
        raw,
      }
    }
  },
}
