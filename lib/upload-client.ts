export type PresignResponse = {
  uploadUrl: string
  objectUrl?: string
  key?: string
  bucket?: string
  region?: string
  expiresIn?: number
}

async function parseEnvelope(response: Response): Promise<any> {
  const text = await response.text().catch(() => '')
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

export async function requestPresign(endpoint: string, body: any) {
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  const json = await parseEnvelope(res)

  // Support both envelope { success: true, data: {...} } and legacy direct responses
  const payload = json && json.success && json.data ? json.data : json

  if (!res.ok) {
    const msg = json?.error?.message || json?.message || 'Failed to obtain upload URL'
    throw new Error(String(msg))
  }

  if (!payload || !payload.uploadUrl) {
    throw new Error('Presign response missing uploadUrl')
  }

  return payload as PresignResponse
}

export async function uploadToSignedUrl(uploadUrl: string, file: File) {
  if (!uploadUrl) throw new Error('Missing upload URL')

  const res = await fetch(String(uploadUrl), {
    method: 'PUT',
    headers: { 'Content-Type': file.type || 'application/octet-stream' },
    body: file,
  })

  if (!res.ok) {
    // try to extract error body for diagnostics
    let body = ''
    try {
      body = await res.text()
    } catch {}
    throw new Error('Upload to storage failed: ' + (body || res.statusText || res.status))
  }

  return true
}

export async function saveDocumentRecord(endpoint: string, payload: any) {
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  const json = await parseEnvelope(res)
  if (!res.ok) {
    const msg = json?.error?.message || json?.message || 'Failed to save document record'
    throw new Error(String(msg))
  }

  return json?.data || json
}

export default {
  requestPresign,
  uploadToSignedUrl,
  saveDocumentRecord,
}
