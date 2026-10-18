import { lookup } from 'node:dns/promises'
import https from 'node:https'
import { isIP } from 'node:net'

const MAX_ASSET_BYTES = 10 * 1024 * 1024
const MAX_FETCH_MS = 15_000
const MAX_REDIRECTS = 2

export class RemoteAssetError extends Error {
  constructor(
    message: string,
    readonly status: 400 | 408 | 413,
  ) {
    super(message)
  }
}

export type FetchedRemoteAsset = {
  finalUrl: string
  contentType: string
  data: Buffer
}

function isPublicAddress(address: string): boolean {
  const family = isIP(address)
  if (family === 4) {
    const octets = address.split('.').map(Number)
    const [a, b, c] = octets
    if (octets.length !== 4 || octets.some((part) => part < 0 || part > 255)) return false
    if (a === 0 || a === 10 || a === 127 || a >= 224) return false
    if (a === 100 && b >= 64 && b <= 127) return false
    if (a === 169 && b === 254) return false
    if (a === 172 && b >= 16 && b <= 31) return false
    if (a === 192 && (b === 0 || b === 168)) return false
    if (a === 192 && b === 88 && c === 99) return false
    if (a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100))) return false
    if (a === 203 && b === 0 && c === 113) return false
    return true
  }
  if (family !== 6) return false

  const firstWord = Number.parseInt(address.split(':')[0] || '0', 16)
  if (firstWord < 0x2000 || firstWord > 0x3fff) return false
  if (address.toLowerCase().startsWith('2001:db8:')) return false
  return true
}

async function resolvePinnedAddresses(url: URL, signal: AbortSignal) {
  const host = url.hostname.replace(/^\[|\]$/g, '').toLowerCase()
  if (
    url.protocol !== 'https:' ||
    (url.port && url.port !== '443') ||
    url.username ||
    url.password ||
    !host ||
    host === 'localhost' ||
    host.endsWith('.localhost') ||
    host.endsWith('.local') ||
    host.endsWith('.internal') ||
    isIP(host)
  ) {
    throw new RemoteAssetError('Unsupported or unsafe asset URL', 400)
  }

  const addresses = await Promise.race([
    lookup(host, { all: true, verbatim: true }),
    new Promise<never>((_, reject) => {
      signal.addEventListener('abort', () => reject(new RemoteAssetError('Asset fetch timed out', 408)), { once: true })
    }),
  ])
  if (!addresses.length || addresses.some(({ address }) => !isPublicAddress(address))) {
    throw new RemoteAssetError('Asset host resolves to a non-public address', 400)
  }
  return { host, addresses }
}

function requestPinned(
  url: URL,
  host: string,
  addresses: Awaited<ReturnType<typeof lookup>> extends never ? never : Array<{ address: string; family: number }>,
  signal: AbortSignal,
): Promise<
  | { redirect: string }
  | { contentType: string; data: Buffer }
> {
  return new Promise((resolve, reject) => {
    let settled = false
    const finishError = (error: Error) => {
      if (settled) return
      settled = true
      reject(error)
    }
    const pinnedAddress = addresses[0]
    const request = https.request(url, {
      method: 'GET',
      headers: { Accept: '*/*', 'Accept-Encoding': 'identity' },
      lookup: (_hostname, options, callback) => {
        if (options && typeof options === 'object' && 'all' in options && options.all) {
          callback(null, addresses)
          return
        }
        callback(null, pinnedAddress.address, pinnedAddress.family)
      },
      servername: host,
    }, (response) => {
      const status = response.statusCode || 0
      const location = response.headers.location
      if (status >= 300 && status < 400 && location) {
        response.resume()
        if (settled) return
        settled = true
        resolve({ redirect: location })
        return
      }
      if (status < 200 || status >= 300) {
        response.resume()
        finishError(new RemoteAssetError('Remote asset could not be fetched', 400))
        return
      }

      const contentLength = Number(response.headers['content-length'] || 0)
      if (contentLength > MAX_ASSET_BYTES) {
        response.destroy()
        finishError(new RemoteAssetError('Remote asset exceeds the 10 MB limit', 413))
        return
      }

      const chunks: Buffer[] = []
      let size = 0
      response.on('data', (chunk: Buffer | string) => {
        const data = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
        size += data.byteLength
        if (size > MAX_ASSET_BYTES) {
          response.destroy()
          finishError(new RemoteAssetError('Remote asset exceeds the 10 MB limit', 413))
          return
        }
        chunks.push(data)
      })
      response.on('end', () => {
        if (settled) return
        settled = true
        resolve({
          contentType: String(response.headers['content-type'] || '').split(';')[0].trim().toLowerCase(),
          data: Buffer.concat(chunks),
        })
      })
      response.on('error', finishError)
    })

    signal.addEventListener('abort', () => {
      request.destroy(new RemoteAssetError('Asset fetch timed out', 408))
    }, { once: true })
    request.setTimeout(MAX_FETCH_MS, () => {
      request.destroy(new RemoteAssetError('Asset fetch timed out', 408))
    })
    request.on('error', finishError)
    request.end()
  })
}

export async function fetchPublicRemoteAsset(
  value: string,
  expectedKind: 'image' | 'document',
): Promise<FetchedRemoteAsset> {
  let current: URL
  try {
    current = new URL(value)
  } catch {
    throw new RemoteAssetError('Asset URL is invalid', 400)
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), MAX_FETCH_MS)
  try {
    for (let redirects = 0; ; redirects += 1) {
      const { host, addresses } = await resolvePinnedAddresses(current, controller.signal)
      const result = await requestPinned(current, host, addresses, controller.signal)
      if ('redirect' in result) {
        if (redirects >= MAX_REDIRECTS) {
          throw new RemoteAssetError('Asset redirect limit exceeded', 400)
        }
        try {
          current = new URL(result.redirect, current)
        } catch {
          throw new RemoteAssetError('Asset redirect URL is invalid', 400)
        }
        continue
      }
      if (expectedKind === 'image' && !result.contentType.startsWith('image/')) {
        throw new RemoteAssetError('Image URLs must return an image', 400)
      }
      return { ...result, finalUrl: current.toString() }
    }
  } finally {
    clearTimeout(timer)
  }
}
