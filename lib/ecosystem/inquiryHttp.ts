import { isIP } from 'node:net'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthenticatedEcosystemUser } from '@/lib/ecosystem/auth'
import { EcosystemInquiryError, submitEcosystemInquiry } from '@/lib/ecosystem/inquiries'

const MAX_BODY_BYTES = 16 * 1024
const CONSENT_VERSION = 'ecosystem-inquiry-consent-v1'
const PHONE_CHARACTERS = /^[+0-9() .-]+$/
const PHONE_DIGITS = /^\+?\d+$/

const OptionalText = (max: number) =>
  z.union([z.string().max(max), z.null()]).optional().transform((value) => {
    const trimmed = value?.trim()
    return trimmed ? trimmed : null
  })

export const EcosystemInquiryRequestSchema = z
  .object({
    categorySlug: z.string().regex(/^[a-z0-9-]{1,100}$/).optional(),
    partnerId: z.string().min(1).max(100).nullable().optional(),
    name: z.string().trim().min(2).max(120),
    email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
    phone: z
      .string()
      .trim()
      .min(5)
      .max(30)
      .regex(PHONE_CHARACTERS)
      .refine((value) => {
        const digits = value.replace(/\D/g, '')
        return digits.length >= 7 && digits.length <= 15 && PHONE_DIGITS.test(value.replace(/[() .-]/g, ''))
      })
      .transform((value) => {
        const digits = value.replace(/\D/g, '')
        return `${value.trim().startsWith('+') ? '+' : ''}${digits}`
      }),
    city: OptionalText(120),
    propertyType: OptionalText(80),
    budget: OptionalText(100),
    requirement: OptionalText(500),
    message: z.string().trim().min(1).max(5000),
    consentToShare: z.literal(true),
    websiteConfirm: z.string().max(200).optional(),
  })
  .strict()

type RequestFailure = {
  status: number
  code: string
  message: string
}

class InquiryRequestError extends Error {
  constructor(public readonly failure: RequestFailure) {
    super(failure.message)
    this.name = 'InquiryRequestError'
  }
}

const JSON_HEADERS = {
  'Cache-Control': 'no-store',
  'Content-Type': 'application/json; charset=utf-8',
}

const ERRORS: Record<string, RequestFailure> = {
  unsupportedMediaType: {
    status: 415,
    code: 'UNSUPPORTED_MEDIA_TYPE',
    message: 'Send this inquiry as JSON.',
  },
  payloadTooLarge: {
    status: 413,
    code: 'PAYLOAD_TOO_LARGE',
    message: 'Inquiry request is too large.',
  },
  invalidRequest: {
    status: 400,
    code: 'INVALID_REQUEST',
    message: 'Enter valid inquiry details.',
  },
  invalidIdempotencyKey: {
    status: 400,
    code: 'INVALID_IDEMPOTENCY_KEY',
    message: 'A valid inquiry request key is required.',
  },
  originNotAllowed: {
    status: 403,
    code: 'ORIGIN_NOT_ALLOWED',
    message: 'This request origin is not allowed.',
  },
  notFound: {
    status: 404,
    code: 'NOT_FOUND',
    message: 'This inquiry target is unavailable.',
  },
  idempotencyConflict: {
    status: 409,
    code: 'IDEMPOTENCY_CONFLICT',
    message: 'This inquiry key cannot be reused for a different request.',
  },
  rateLimited: {
    status: 429,
    code: 'RATE_LIMITED',
    message: 'Too many inquiries. Please try again later.',
  },
  serviceUnavailable: {
    status: 503,
    code: 'SERVICE_UNAVAILABLE',
    message: 'Inquiry submission is temporarily unavailable.',
  },
}

function jsonError(failure: RequestFailure) {
  return NextResponse.json(
    { error: { code: failure.code, message: failure.message } },
    { status: failure.status, headers: JSON_HEADERS }
  )
}

function isJsonContentType(value: string | null): boolean {
  if (!value) return false
  return /^\s*application\/json\s*(?:;\s*charset\s*=\s*(?:"utf-8"|utf-8)\s*)?$/i.test(value)
}

async function readJsonBody(request: Request): Promise<unknown> {
  if (!request.body) throw new InquiryRequestError(ERRORS.invalidRequest)
  const reader = request.body.getReader()
  const chunks: Uint8Array[] = []
  let total = 0

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    total += value.byteLength
    if (total > MAX_BODY_BYTES) {
      await reader.cancel()
      throw new InquiryRequestError(ERRORS.payloadTooLarge)
    }
    chunks.push(value)
  }

  const bytes = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.byteLength
  }

  try {
    return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes))
  } catch {
    throw new InquiryRequestError(ERRORS.invalidRequest)
  }
}

function getCanonicalOrigin(): string | null {
  const configured = process.env.NEXT_PUBLIC_BASE_URL === undefined
    ? process.env.NEXTAUTH_URL
    : process.env.NEXT_PUBLIC_BASE_URL
  if (!configured) return null

  try {
    const url = new URL(configured)
    if (
      !['http:', 'https:'].includes(url.protocol) ||
      url.username ||
      url.password ||
      url.pathname !== '/' ||
      url.search ||
      url.hash
    ) {
      return null
    }
    return url.origin
  } catch {
    return null
  }
}

function hasAllowedOrigin(request: Request, canonicalOrigin: string): boolean {
  const origin = request.headers.get('origin')
  if (!origin || origin === 'null') return false

  try {
    const parsed = new URL(origin)
    if (
      !['http:', 'https:'].includes(parsed.protocol) ||
      parsed.username ||
      parsed.password ||
      parsed.pathname !== '/' ||
      parsed.search ||
      parsed.hash
    ) {
      return false
    }
    return parsed.origin === canonicalOrigin
  } catch {
    return false
  }
}

function getCanonicalSourceIp(request: Request): string | null {
  const source = request.headers.get('x-real-ip')?.trim()
  if (!source || source.includes(',') || isIP(source) === 0) return null

  if (isIP(source) === 4) return source
  try {
    const hostname = new URL(`http://[${source}]/`).hostname
    return hostname.slice(1, -1).toLowerCase()
  } catch {
    return null
  }
}

function isUuidV4(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

function serviceError(status: number): RequestFailure {
  if (status === 404) return ERRORS.notFound
  if (status === 409) return ERRORS.idempotencyConflict
  if (status === 429) return ERRORS.rateLimited
  if (status === 400) return ERRORS.invalidRequest
  return ERRORS.serviceUnavailable
}

export async function handleEcosystemInquiry(
  request: Request,
  route: { categorySlug?: string; partnerSlug?: string } = {}
) {
  if (process.env.ECOSYSTEM_PUBLIC_INQUIRIES_ENABLED !== 'true') {
    return jsonError(ERRORS.serviceUnavailable)
  }
  if (!isJsonContentType(request.headers.get('content-type'))) {
    return jsonError(ERRORS.unsupportedMediaType)
  }

  let body: unknown
  try {
    body = await readJsonBody(request)
  } catch (error) {
    return jsonError(error instanceof InquiryRequestError ? error.failure : ERRORS.invalidRequest)
  }

  const parsed = EcosystemInquiryRequestSchema.safeParse(body)
  if (!parsed.success || (parsed.data.websiteConfirm ?? '').trim()) {
    return jsonError(ERRORS.invalidRequest)
  }
  delete parsed.data.websiteConfirm
  if (route.categorySlug && parsed.data.categorySlug && parsed.data.categorySlug !== route.categorySlug) {
    return jsonError(ERRORS.invalidRequest)
  }
  if (!route.categorySlug && !parsed.data.categorySlug) return jsonError(ERRORS.invalidRequest)

  const canonicalOrigin = getCanonicalOrigin()
  if (!canonicalOrigin) return jsonError(ERRORS.serviceUnavailable)
  if (!hasAllowedOrigin(request, canonicalOrigin)) return jsonError(ERRORS.originNotAllowed)

  const idempotencyKey = request.headers.get('idempotency-key')?.trim() || ''
  if (!isUuidV4(idempotencyKey)) return jsonError(ERRORS.invalidIdempotencyKey)

  let userId: string | null = null
  try {
    const user = await getAuthenticatedEcosystemUser()
    userId = user?.id ?? null
  } catch {
    console.error('[ecosystem-inquiry] User attribution lookup failed')
    return jsonError(ERRORS.serviceUnavailable)
  }

  const sourceIp = getCanonicalSourceIp(request)

  try {
    const result = await submitEcosystemInquiry({
      ...parsed.data,
      categorySlug: route.categorySlug || parsed.data.categorySlug || '',
      partnerSlug: route.partnerSlug || null,
      idempotencyKey,
      userId,
      sourceIp,
      consentVersion: CONSENT_VERSION,
    })
    return NextResponse.json(
      { success: true, ...result },
      { status: result.reused ? 200 : 201, headers: JSON_HEADERS }
    )
  } catch (error) {
    if (error instanceof EcosystemInquiryError) return jsonError(serviceError(error.status))
    console.error('[ecosystem-inquiry] Inquiry processing failed')
    return jsonError(ERRORS.serviceUnavailable)
  }
}
