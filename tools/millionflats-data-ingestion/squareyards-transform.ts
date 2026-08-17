import fs from 'fs'
import path from 'path'
import { buildProjectImportPreview } from '../../lib/projectImportV2'

function ensureDir(dir: string) {
  fs.mkdirSync(dir, { recursive: true })
}

function slugify(input: string) {
  return String(input || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function normalizeProjectCandidate(record: any, index: number) {
  const projectName = String(record.project_name || record.title || `Project ${index + 1}`).trim()
  const developerName = record.developer_name ? String(record.developer_name).trim() : null
  const city = String(record.city || 'Navi Mumbai').trim() || 'Navi Mumbai'
  const community = String(record.locality || record.community || record.address || 'Ulwe').trim() || 'Ulwe'
  const price = record.price || record.startingPrice || record.asking_price

  return {
    name: projectName,
    developer: developerName ? { slug: slugify(developerName), name: developerName } : null,
    countryIso2: 'IN',
    city,
    community,
    startingPrice: price,
    overview: String(record.description || '').trim() || null,
    description: String(record.description || '').trim() || null,
    status: 'DRAFT',
    featured: false,
    goldenVisa: false,
    sourceMedia: record.image_url ? [{ source: 'SQUAREYARDS', sourceUrl: record.image_url, category: 'GALLERY', status: 'REVIEW_REQUIRED' }] : [],
    location: record.latitude && record.longitude ? { latitude: Number(record.latitude), longitude: Number(record.longitude), address: String(record.address || '').trim() || null } : { address: String(record.address || '').trim() || null },
  }
}

function main() {
  const inputArg = process.argv.find((arg) => arg.startsWith('--input='))
  const inputPath = inputArg ? inputArg.split('=')[1] : path.join(process.cwd(), 'tools', 'millionflats-data-ingestion', 'output', 'raw', 'squareyards', 'sample.json')
  const rawInput = fs.existsSync(inputPath) ? JSON.parse(fs.readFileSync(inputPath, 'utf8')) : { records: [] }

  const records = Array.isArray(rawInput) ? rawInput : Array.isArray(rawInput.records) ? rawInput.records : []
  const transformed = records.map((record: any, idx: number) => normalizeProjectCandidate(record, idx))

  const preview = buildProjectImportPreview({ schemaVersion: '2.0', importType: 'PROJECTS', source: { provider: 'SQUAREYARDS', sourceUrl: 'https://www.squareyards.com', scrapedAt: new Date().toISOString() }, projects: transformed })

  const outDir = path.join(process.cwd(), 'tools', 'millionflats-data-ingestion', 'output')
  ensureDir(outDir)

  const ready = preview.projects.filter((project) => project.validation.errors.length === 0)
  const review = preview.projects.filter((project) => project.validation.errors.length > 0 || project.validation.warnings.length > 0)

  fs.writeFileSync(path.join(outDir, 'millionflats-projects.json'), JSON.stringify({ schemaVersion: '2.0', importType: 'PROJECTS', projects: ready }, null, 2))
  fs.writeFileSync(path.join(outDir, 'millionflats-projects-needing-review.json'), JSON.stringify({ schemaVersion: '2.0', importType: 'PROJECTS', projects: review }, null, 2))
  fs.writeFileSync(path.join(outDir, 'millionflats-import-report.json'), JSON.stringify({
    source: 'SQUAREYARDS',
    generatedAt: new Date().toISOString(),
    inputRecords: records.length,
    projectCandidates: transformed.length,
    readyProjects: ready.length,
    reviewProjects: review.length,
    duplicateCandidates: preview.summary.duplicateCandidates,
    warnings: preview.summary.warnings,
    errors: preview.summary.errors,
    sourceMediaReferences: preview.summary.sourceMediaReferences,
    status: 'READY_FOR_HUMAN_REVIEW',
  }, null, 2))

  console.log(JSON.stringify({
    inputRecords: records.length,
    readyProjects: ready.length,
    reviewProjects: review.length,
    warnings: preview.summary.warnings,
    errors: preview.summary.errors,
    sourceMediaReferences: preview.summary.sourceMediaReferences,
    outputDir: outDir,
  }, null, 2))
}

main()
