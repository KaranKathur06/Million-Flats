import fs from 'fs'
import path from 'path'
import { buildProjectImportPreview } from '../../lib/projectImportV2'

const target = process.argv.find((arg) => arg.startsWith('--input='))
const inputPath = target ? target.split('=')[1] : path.join(process.cwd(), 'tools', 'millionflats-data-ingestion', 'output', 'millionflats-projects.json')

if (!fs.existsSync(inputPath)) {
  console.error(`Input file not found: ${inputPath}`)
  process.exit(1)
}

const content = JSON.parse(fs.readFileSync(inputPath, 'utf8'))
const preview = buildProjectImportPreview(content)

console.log(JSON.stringify({
  ok: preview.ok,
  summary: preview.summary,
  errors: preview.errors,
  warnings: preview.warnings,
}, null, 2))

if (!preview.ok) {
  process.exit(1)
}
