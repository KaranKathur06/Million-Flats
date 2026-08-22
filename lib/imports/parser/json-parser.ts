import {
  decodeInput,
  getPathValue,
  type ParserInput,
  type RawSourceRecord,
  type StructureDiscovery,
  type UniversalParser,
} from './parser'

type CollectionCandidate = { path: string; values: unknown[]; confidence: number }

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}

function tokenizePath(path: string) {
  return path.replace(/\[(\d+)\]/g, '.$1').split('.').filter(Boolean)
}

function readPath(root: unknown, path: string): unknown {
  return tokenizePath(path).reduce<unknown>((current, segment) => {
    if (current === null || current === undefined || typeof current !== 'object') return undefined
    return (current as Record<string, unknown>)[segment]
  }, root)
}

function collectCandidates(value: unknown, path = 'root', output: CollectionCandidate[] = []) {
  if (Array.isArray(value)) {
    const objects = value.filter(isRecord)
    if (objects.length > 0) {
      const confidence = Math.min(99, 60 + objects.length + (path === 'root' ? 20 : 0))
      output.push({ path: path === 'root' ? '$' : path, values: objects, confidence })
    }
    value.forEach((entry, index) => collectCandidates(entry, `${path}[${index}]`, output))
    return output
  }

  if (isRecord(value)) {
    Object.entries(value).forEach(([key, nested]) => collectCandidates(nested, path === 'root' ? key : `${path}.${key}`, output))
  }
  return output
}

function chooseCollection(root: unknown, requestedPath?: string) {
  if (requestedPath) {
    const selected = requestedPath === '$' ? root : readPath(root, requestedPath)
    if (Array.isArray(selected) && selected.every(isRecord)) return { path: requestedPath, values: selected, confidence: 100 }
    throw new Error(`JSON collection path "${requestedPath}" is not an array of records.`)
  }

  const candidates = collectCandidates(root).sort((a, b) => b.confidence - a.confidence || b.values.length - a.values.length)
  if (candidates.length > 0) return candidates[0]
  if (isRecord(root)) return { path: '$', values: [root], confidence: 80 }
  throw new Error('JSON must contain an object or a collection of objects.')
}

export const jsonParser: UniversalParser = {
  canParse(input) {
    const name = String(input.fileName || '').toLowerCase()
    return input.mimeType === 'application/json' || name.endsWith('.json')
  },

  async inspect(input): Promise<StructureDiscovery> {
    const root = JSON.parse(decodeInput(input.content)) as unknown
    const selected = chooseCollection(root, input.collectionPath)
    const fields = Array.from(new Set(selected.values.flatMap((value) => Object.keys(value as Record<string, unknown>))))
    const candidates = collectCandidates(root).map((candidate) => ({
      path: candidate.path,
      recordCount: candidate.values.length,
      confidence: candidate.confidence,
    }))
    return {
      format: 'json',
      encoding: 'utf-8',
      collectionPath: selected.path,
      fields,
      recordCount: selected.values.length,
      candidates,
    }
  },

  async *parse(input): AsyncIterable<RawSourceRecord> {
    const root = JSON.parse(decodeInput(input.content)) as unknown
    const selected = chooseCollection(root, input.collectionPath)
    for (let index = 0; index < selected.values.length; index += 1) {
      const raw = selected.values[index]
      const sourceRecordId = isRecord(raw) && (raw.id || raw.sourceRecordId || raw.externalId)
        ? String(raw.id || raw.sourceRecordId || raw.externalId)
        : String(index + 1)
      yield {
        sourceRecordId,
        sourceRow: index + 1,
        sourcePath: selected.path === '$' ? `$[${index}]` : `${selected.path}[${index}]`,
        raw,
      }
    }
  },
}

export function getJsonPathValue(root: unknown, path: string) {
  return path === '$' ? root : getPathValue(root, path)
}
