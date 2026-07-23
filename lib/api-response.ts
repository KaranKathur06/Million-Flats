export type ApiSuccessEnvelope<T = unknown> = {
  success: true
  data: T
  message: string
  errors: string[]
}

export type ApiErrorEnvelope = {
  success: false
  error: {
    code: string
    message: string
  }
}

export function buildApiSuccessEnvelope<T>(data: T, message = 'Success'): ApiSuccessEnvelope<T> {
  return {
    success: true,
    data,
    message,
    errors: [],
  }
}

export function buildApiErrorEnvelope(message: string, code = 'UNKNOWN_ERROR'): ApiErrorEnvelope {
  return {
    success: false,
    error: {
      code,
      message,
    },
  }
}

export async function parseJsonResponse<T>(response: Response, fallback: T): Promise<T> {
  try {
    const text = await response.text()
    if (!text) return fallback
    return JSON.parse(text) as T
  } catch {
    return fallback
  }
}
