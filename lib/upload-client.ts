export type PresignResponse = {
  uploadUrl: string
  objectUrl?: string
  publicUrl?: string
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

function logUploadIssue(context: string, details: Record<string, unknown>) {
  console.error(`[upload-client] ${context}`, details)
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
    logUploadIssue('presign_failed', { endpoint, status: res.status, message: msg })
    throw new Error(String(msg))
  }

  if (!payload || !payload.uploadUrl) {
    throw new Error('Presign response missing uploadUrl')
  }

  return payload as PresignResponse
}

export function uploadToSignedUrl(uploadUrl: string, file: File, onProgress?: (percent: number) => void) {
  if (!uploadUrl) throw new Error('Missing upload URL')
  return new Promise<boolean>((resolve, reject) => {
    const request = new XMLHttpRequest()
    request.open('PUT', String(uploadUrl))
    request.setRequestHeader('Content-Type', file.type || 'application/octet-stream')
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress?.(Math.round((event.loaded / event.total) * 100))
    }
    request.onerror = () => reject(new Error('Upload to storage failed. Please retry.'))
    request.onload = () => {
      if (request.status >= 200 && request.status < 300) { onProgress?.(100); resolve(true); return }
      logUploadIssue('upload_failed', { uploadUrl, status: request.status, body: request.responseText })
      reject(new Error('Upload to storage failed: ' + (request.responseText || request.statusText || request.status)))
    }
    request.send(file)
  })
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
