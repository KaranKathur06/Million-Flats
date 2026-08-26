import * as XLSX from 'xlsx'
import { csvParser, jsonParser, xlsxParser } from '@/lib/imports/parser'
import { normalizeArea, normalizeBedrooms, normalizeBoolean, normalizeDate, normalizePrice } from '@/lib/imports/normalization'

describe('universal import parsers', () => {
  it('parses quoted commas, escaped quotes, and multiline CSV values', async () => {
    const content = 'title,description\n"Luxury, 3 BHK","A ""great"" home\nnear the park"\n'
    const records = []
    for await (const record of csvParser.parse({ content, fileName: 'properties.csv' })) records.push(record)

    expect(records).toHaveLength(1)
    expect(records[0].raw).toEqual({
      title: 'Luxury, 3 BHK',
      description: 'A "great" home\nnear the park',
    })
    expect(records[0].sourceRow).toBe(2)
  })

  it('detects a semicolon delimiter and metadata rows before headers', async () => {
    const content = 'Exported;2026\nProperties;Source\ntitle;city\nVilla;Dubai\n'
    const discovery = await csvParser.inspect({ content, fileName: 'properties.csv' })

    expect(discovery.delimiter).toBe(';')
    expect(discovery.fields).toEqual(['title', 'city'])
  })

  it('discovers nested JSON collections and preserves source paths', async () => {
    const content = JSON.stringify({ data: { results: [{ id: 'p-1', title: 'Villa' }] } })
    const discovery = await jsonParser.inspect({ content, fileName: 'properties.json' })
    const records = []
    for await (const record of jsonParser.parse({ content, fileName: 'properties.json' })) records.push(record)

    expect(discovery.collectionPath).toBe('data.results')
    expect(records[0].sourceRecordId).toBe('p-1')
    expect(records[0].sourcePath).toBe('data.results[0]')
  })

  it('lists workbook sheets and parses the selected sheet', async () => {
    const book = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet([['metadata'], ['name', 'city'], ['Project', 'Dubai']]), 'Projects')
    XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet([['name'], ['Other']]), 'Other')
    const content = XLSX.write(book, { type: 'buffer', bookType: 'xlsx' })
    const input = { content, fileName: 'source.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', sheetName: 'Projects' }
    const discovery = await xlsxParser.inspect(input)
    expect(discovery.sheets?.map((sheet) => sheet.name)).toEqual(['Projects', 'Other'])
    expect(discovery.fields).toEqual(['name', 'city'])
    const records = []
    for await (const record of xlsxParser.parse(input)) records.push(record)
    expect(records[0].raw).toEqual({ name: 'Project', city: 'Dubai' })
  })
})

describe('property normalization', () => {
  it('normalizes INR crore and lakh values without losing display text', () => {
    expect(normalizePrice('₹1.85 Cr')).toEqual({
      amount: 18500000,
      currency: 'INR',
      display: '₹1.85 Cr',
      unresolved: false,
    })
    expect(normalizePrice('Contact for Price')).toEqual({
      amount: null,
      currency: null,
      display: 'Contact for Price',
      unresolved: true,
    })
  })

  it('normalizes BHK labels and rejects uncertain bedroom values', () => {
    expect(normalizeBedrooms('3 BHK')).toBe(3)
    expect(normalizeBedrooms('Studio')).toBe(0)
    expect(normalizeBedrooms('Large')).toBeNull()
  })

  it('normalizes area units without inventing unresolved values', () => {
    expect(normalizeArea('100 sqm')).toMatchObject({ amount: 1076.39, unresolved: false })
    expect(normalizeArea('Large')).toMatchObject({ amount: null, unresolved: true })
  })

  it('normalizes dates and booleans conservatively', () => {
    expect(normalizeDate('2026-08-22').unresolved).toBe(false)
    expect(normalizeDate('unknown').unresolved).toBe(true)
    expect(normalizeBoolean('yes')).toBe(true)
    expect(normalizeBoolean('maybe')).toBeNull()
  })
})
