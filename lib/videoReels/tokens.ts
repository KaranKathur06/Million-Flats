import crypto from 'node:crypto'

export const VIDEO_VIEWER_COOKIE = 'mf_video_viewer'
export const VIDEO_VIEWER_COOKIE_MAX_AGE = 60 * 60 * 24 * 30
export const VIDEO_DELIVERY_TOKEN_TTL_SECONDS = 10 * 60
const FEED_CURSOR_TTL_SECONDS = 60 * 60 * 24

export type VideoDeliveryTokenPayload = {
  version: 1
  id: string
  campaignId: string
  reelId: string
  viewerHmac: string
  issuedAt: number
  expiresAt: number
}

function hmac(secret: string, value: string) {
  return crypto.createHmac('sha256', secret).update(value).digest('hex')
}

export function getViewerHmac(viewerToken: string) {
  const secret = String(process.env.VIDEO_VIEWER_HMAC_SECRET || '')
  if (secret.length < 32) throw new Error('Video viewer HMAC secret is not configured')
  return hmac(secret, viewerToken)
}

export function getViewerHmacCandidates(viewerToken: string) {
  const current = String(process.env.VIDEO_VIEWER_HMAC_SECRET || '')
  if (current.length < 32) throw new Error('Video viewer HMAC secret is not configured')
  const previous = String(process.env.VIDEO_VIEWER_HMAC_SECRET_PREVIOUS || '')
  return [
    hmac(current, viewerToken),
    ...(previous.length >= 32 ? [hmac(previous, viewerToken)] : []),
  ]
}

export function signVideoDeliveryToken(payload: VideoDeliveryTokenPayload) {
  const secret = String(process.env.VIDEO_DELIVERY_TOKEN_SECRET || '')
  if (secret.length < 32) throw new Error('Video delivery token secret is not configured')
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url')
  return `${encoded}.${hmac(secret, encoded)}`
}

export function verifyVideoDeliveryToken(token: string): VideoDeliveryTokenPayload | null {
  const secret = String(process.env.VIDEO_DELIVERY_TOKEN_SECRET || '')
  if (secret.length < 32) return null
  const [encoded, signature, extra] = token.split('.')
  if (!encoded || !signature || extra) return null

  const expected = hmac(secret, encoded)
  const receivedBytes = Buffer.from(signature, 'hex')
  const expectedBytes = Buffer.from(expected, 'hex')
  if (receivedBytes.length !== expectedBytes.length || !crypto.timingSafeEqual(receivedBytes, expectedBytes)) {
    return null
  }

  try {
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as VideoDeliveryTokenPayload
    const now = Math.floor(Date.now() / 1000)
    if (
      payload.version !== 1
      || typeof payload.id !== 'string'
      || typeof payload.campaignId !== 'string'
      || typeof payload.reelId !== 'string'
      || typeof payload.viewerHmac !== 'string'
      || !Number.isSafeInteger(payload.issuedAt)
      || !Number.isSafeInteger(payload.expiresAt)
      || payload.issuedAt > now + 30
      || payload.expiresAt <= now
      || payload.expiresAt - payload.issuedAt > VIDEO_DELIVERY_TOKEN_TTL_SECONDS
    ) return null
    return payload
  } catch {
    return null
  }
}

export function readCookie(request: Request, name: string) {
  const cookieHeader = request.headers.get('cookie') || ''
  for (const part of cookieHeader.split(';')) {
    const separator = part.indexOf('=')
    if (separator < 0) continue
    if (part.slice(0, separator).trim() !== name) continue
    try {
      return decodeURIComponent(part.slice(separator + 1).trim())
    } catch {
      return null
    }
  }
  return null
}

export function createViewerToken() {
  return crypto.randomBytes(32).toString('base64url')
}

export function signFeedCursor(offset: number, organicOffset: number) {
  const secret = String(process.env.VIDEO_FEED_CURSOR_SECRET || '')
  if (secret.length < 32) return null
  const payload = {
    offset,
    organicOffset,
    expiresAt: Math.floor(Date.now() / 1000) + FEED_CURSOR_TTL_SECONDS,
  }
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url')
  return `${encoded}.${hmac(secret, encoded)}`
}

export function verifyFeedCursor(value: string): { offset: number; organicOffset: number } | null {
  const secret = String(process.env.VIDEO_FEED_CURSOR_SECRET || '')
  if (secret.length < 32) return null
  const [encoded, signature, extra] = value.split('.')
  if (!encoded || !signature || extra) return null
  const expected = hmac(secret, encoded)
  const supplied = Buffer.from(signature, 'hex')
  const expectedBytes = Buffer.from(expected, 'hex')
  if (supplied.length !== expectedBytes.length || !crypto.timingSafeEqual(supplied, expectedBytes)) return null

  try {
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as {
      offset?: unknown
      organicOffset?: unknown
      expiresAt?: unknown
    }
    if (
      !Number.isSafeInteger(payload.offset)
      || (payload.offset as number) < 0
      || !Number.isSafeInteger(payload.organicOffset)
      || (payload.organicOffset as number) < 0
      || !Number.isSafeInteger(payload.expiresAt)
      || (payload.expiresAt as number) <= Math.floor(Date.now() / 1000)
    ) return null
    return { offset: payload.offset as number, organicOffset: payload.organicOffset as number }
  } catch {
    return null
  }
}
