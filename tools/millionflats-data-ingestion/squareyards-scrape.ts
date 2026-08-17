import fs from 'fs'
import path from 'path'

function ensureDir(dir: string) {
  fs.mkdirSync(dir, { recursive: true })
}

async function runApifyIfConfigured() {
  const token = process.env.APIFY_API_TOKEN
  const actorId = process.env.APIFY_SQUAREYARDS_PROJECT_ACTOR_ID || process.env.APIFY_SQUAREYARDS_ACTOR_ID

  if (!token || !actorId) {
    return null
  }

  const response = await fetch(`https://api.apify.com/v2/acts/${actorId}/runs`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      actorId,
      datasetName: 'result',
      build: 'latest',
    }),
  })

  if (!response.ok) {
    throw new Error(`Apify run failed with status ${response.status}`)
  }

  return response.json()
}

async function main() {
  const inputArg = process.argv.find((arg) => arg.startsWith('--input='))
  const inputPath = inputArg ? inputArg.split('=')[1] : null
  const outputDir = path.join(process.cwd(), 'tools', 'millionflats-data-ingestion', 'output', 'raw', 'squareyards')
  ensureDir(outputDir)

  let dataset: any[] = []

  if (inputPath && fs.existsSync(inputPath)) {
    const raw = JSON.parse(fs.readFileSync(inputPath, 'utf8'))
    dataset = Array.isArray(raw) ? raw : raw.records || []
  } else {
    const result = await runApifyIfConfigured().catch(() => null)
    if (!result) {
      console.log('No APIFY_API_TOKEN configured. No live scrape executed; file-only workflow is ready for manual raw JSON input.')
      console.log('Suggested command: npx ts-node tools/millionflats-data-ingestion/squareyards-scrape.ts --input=./path/to/raw.json')
      process.exit(0)
    }
    dataset = Array.isArray(result) ? result : result.data || result.items || []
  }

  const filename = `squareyards-projects-${new Date().toISOString().slice(0, 10)}-raw.json`
  const finalPath = path.join(outputDir, filename)
  fs.writeFileSync(finalPath, JSON.stringify({ source: 'SQUAREYARDS', records: dataset, generatedAt: new Date().toISOString() }, null, 2))

  console.log(JSON.stringify({ outputFile: finalPath, records: dataset.length }, null, 2))
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : 'Unexpected scraper error')
  process.exit(1)
})
