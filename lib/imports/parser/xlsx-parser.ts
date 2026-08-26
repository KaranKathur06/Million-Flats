import * as XLSX from 'xlsx'
import type { ParserInput, RawSourceRecord, StructureDiscovery, UniversalParser } from './parser'

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

function workbook(input: ParserInput) {
  const content = typeof input.content === 'string' ? Buffer.from(input.content) : Buffer.from(input.content)
  return XLSX.read(content, { type: 'buffer', cellDates: true, cellFormula: false, cellNF: false })
}

function headers(row: unknown[]) {
  const seen = new Map<string, number>()
  return row.map((cell, index) => {
    const base = String(cell ?? '').trim() || `column_${index + 1}`
    const count = seen.get(base) || 0
    seen.set(base, count + 1)
    return count === 0 ? base : `${base}_${count + 1}`
  })
}

function headerRow(rows: unknown[][], explicit?: number) {
  if (explicit !== undefined && rows[explicit]) return explicit
  let bestIndex = 0
  let bestScore = -1
  rows.slice(0, 20).forEach((row, index) => {
    const nonEmpty = row.filter((cell) => String(cell ?? '').trim()).length
    const unique = new Set(row.map((cell) => String(cell ?? '').trim().toLowerCase()).filter(Boolean)).size
    const score = nonEmpty + unique * 0.25
    if (score > bestScore) { bestScore = score; bestIndex = index }
  })
  return bestIndex
}

function sheetRows(sheet: XLSX.WorkSheet) {
  return XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '', raw: true, blankrows: false })
}

function selectedSheet(input: ParserInput, book: XLSX.WorkBook) {
  const name = input.sheetName || book.SheetNames[0]
  if (!name || !book.Sheets[name]) throw new Error(`XLSX sheet "${name || '(none)'}" was not found.`)
  return { name, sheet: book.Sheets[name] }
}

function inspectSheet(name: string, sheet: XLSX.WorkSheet) {
  const rows = sheetRows(sheet)
  const row = headerRow(rows)
  const fields = headers(rows[row] || [])
  const recordCount = rows.slice(row + 1).filter((entry) => entry.some((cell) => String(cell ?? '').trim())).length
  return { name, row, fields, recordCount, confidence: Math.min(99, 60 + recordCount) }
}

export const xlsxParser: UniversalParser = {
  canParse(input) {
    const name = String(input.fileName || '').toLowerCase()
    return input.mimeType === XLSX_MIME || name.endsWith('.xlsx')
  },

  async inspect(input): Promise<StructureDiscovery> {
    const book = workbook(input)
    const sheets = book.SheetNames.map((name) => inspectSheet(name, book.Sheets[name]))
    const selected = inspectSheet(selectedSheet(input, book).name, selectedSheet(input, book).sheet)
    return {
      format: 'xlsx',
      encoding: 'binary-xlsx',
      headerRow: selected.row,
      fields: selected.fields,
      recordCount: selected.recordCount,
      sheets: sheets.map(({ name, recordCount, confidence }) => ({ name, recordCount, confidence })),
    }
  },

  async *parse(input): AsyncIterable<RawSourceRecord> {
    const book = workbook(input)
    const selected = selectedSheet(input, book)
    const rows = sheetRows(selected.sheet)
    const row = headerRow(rows, input.headerRow)
    const fieldNames = headers(rows[row] || [])
    for (let index = row + 1; index < rows.length; index += 1) {
      const values = rows[index]
      if (!values?.some((cell) => String(cell ?? '').trim())) continue
      const raw = Object.fromEntries(fieldNames.map((field, fieldIndex) => [field, values[fieldIndex] ?? '']))
      const sourceRecordId = String((raw.id || raw.sourceRecordId || raw.externalId || index - row) as unknown)
      yield { sourceRecordId, sourceRow: index + 1, sourcePath: `${selected.name}[${index + 1}]`, raw }
    }
  },
}