/**
 * aisensy-provider.ts
 *
 * Production-grade AiSensy WhatsApp messaging provider.
 * Handles OTP dispatch, welcome messages, and future template campaigns
 * via the AiSensy Campaign API v2.
 *
 * Key design decisions:
 *   - Centralized configuration (all env vars in one place)
 *   - Dynamic payload builder matching the approved template structure exactly
 *   - URL button parameter always included (fixes Meta template rejection)
 *   - Comprehensive validation before every API call
 *   - Structured logging for observability
 *   - Reusable sendTemplate() engine for future campaigns
 *
 * Env vars required:
 *   AISENSY_API_KEY              — JWT bearer token from AiSensy dashboard
 *   AISENSY_AUTH_CAMPAIGN_NAME   — Name of the approved OTP template campaign
 *   AISENSY_WELCOME_CAMPAIGN_NAME — Name of the welcome template campaign (optional)
 *
 * Optional env vars:
 *   AISENSY_USERNAME             — Display name sent to AiSensy (default: "Millionflats Pvt. Ltd.")
 *   AISENSY_SOURCE               — Source identifier for campaigns (default: "millionflats-auth")
 *   AISENSY_API_URL              — API endpoint override (default: AiSensy v2 endpoint)
 */

// ─── Types & Interfaces ─────────────────────────────────────────────────────

/** Result returned by all AiSensy send operations */
export interface AiSensySendResult {
  success: boolean
  messageId?: string
  error?: string
  errorCode?: AiSensyErrorCode
  httpStatus?: number
}

/** Structured error codes for downstream consumers */
export type AiSensyErrorCode =
  | 'VALIDATION_ERROR'
  | 'MISSING_API_KEY'
  | 'MISSING_CAMPAIGN'
  | 'MISSING_DESTINATION'
  | 'MISSING_TEMPLATE_PARAMS'
  | 'MISSING_BUTTON_PARAMS'
  | 'INVALID_PHONE'
  | 'INVALID_TEMPLATE_PARAMS'
  | 'CAMPAIGN_INACTIVE'
  | 'INVALID_API_KEY'
  | 'RECIPIENT_NOT_ON_WHATSAPP'
  | 'META_REJECTED'
  | 'TEMPLATE_MISMATCH'
  | 'TIMEOUT'
  | 'NETWORK_ERROR'
  | 'API_ERROR'
  | 'UNKNOWN_ERROR'

/** A single button in the AiSensy template payload */
export interface AiSensyButton {
  type: 'button'
  sub_type: 'url' | 'quick_reply'
  index: number
  parameters: Array<{
    type: 'text'
    text: string
  }>
}

/** Complete AiSensy campaign payload */
export interface AiSensyPayload {
  apiKey: string
  campaignName: string
  destination: string
  userName: string
  templateParams: string[]
  source: string
  media: Record<string, unknown>
  buttons: AiSensyButton[]
  carouselCards: unknown[]
  location: Record<string, unknown>
  attributes: Record<string, unknown>
  paramsFallbackValue: Record<string, string>
}

/** Input for the OTP payload builder */
export interface OtpPayloadInput {
  phone: string
  firstName?: string | null
  otp: string
}

/** Input for the generic template sender */
export interface SendTemplateInput {
  campaign: string
  phone: string
  templateParams: string[]
  buttons?: AiSensyButton[]
  media?: Record<string, unknown>
  attributes?: Record<string, unknown>
  paramsFallbackValue?: Record<string, string>
  source?: string
}

// ─── Centralized Configuration ───────────────────────────────────────────────

/** All AiSensy configuration in one place — never hardcoded elsewhere */
const AISENSY_CONFIG = {
  /** AiSensy Campaign API v2 endpoint */
  get apiUrl(): string {
    return process.env.AISENSY_API_URL || 'https://backend.aisensy.com/campaign/t1/api/v2'
  },
  /** JWT bearer token from AiSensy dashboard */
  get apiKey(): string {
    return process.env.AISENSY_API_KEY || ''
  },
  /** Approved OTP template campaign name */
  get otpCampaignName(): string {
    return process.env.AISENSY_AUTH_CAMPAIGN_NAME || 'millionflats_auth_otp'
  },
  /** Welcome template campaign name */
  get welcomeCampaignName(): string {
    return process.env.AISENSY_WELCOME_CAMPAIGN_NAME || ''
  },
  /** Display name sent with every request */
  get userName(): string {
    return process.env.AISENSY_USERNAME || 'Millionflats Pvt. Ltd.'
  },
  /** Source identifier for campaign tracking */
  get source(): string {
    return process.env.AISENSY_SOURCE || 'millionflats-auth'
  },
  /** Request timeout in milliseconds */
  timeoutMs: 15_000,
} as const

// ─── Phone Normalization for AiSensy ─────────────────────────────────────────

/**
 * Normalizes a phone number to AiSensy's required format: digits only, with
 * country code (e.g., "919876543210").
 *
 * Supports:
 *   +91XXXXXXXXXX  →  91XXXXXXXXXX
 *   91XXXXXXXXXX   →  91XXXXXXXXXX
 *   XXXXXXXXXX     →  91XXXXXXXXXX  (assumes India if 10 digits)
 *
 * @param phone - Raw phone input
 * @returns Normalized phone string or null if invalid
 */
export function normalizePhoneForAiSensy(phone: string): string | null {
  // Strip everything except digits
  const digits = phone.replace(/\D/g, '')

  if (digits.length === 0) return null

  // Already has country code (e.g., 919876543210)
  if (digits.length >= 11 && digits.startsWith('91')) {
    return digits
  }

  // 10-digit Indian number without country code
  if (digits.length === 10 && /^[6-9]/.test(digits)) {
    return `91${digits}`
  }

  // International number with country code (non-India)
  if (digits.length >= 10 && digits.length <= 15) {
    return digits
  }

  return null
}

/**
 * Validates that a normalized phone number is valid for AiSensy dispatch.
 * Must be 10-15 digits, starting with a valid country code.
 */
function isValidAiSensyPhone(normalizedPhone: string): boolean {
  return /^[1-9]\d{9,14}$/.test(normalizedPhone)
}

// ─── Payload Validation ──────────────────────────────────────────────────────

interface ValidationResult {
  valid: boolean
  errors: string[]
}

/**
 * Validates the complete AiSensy payload before dispatch.
 * Catches missing fields, null/undefined values, and structural issues
 * that would cause Meta to reject the message.
 */
function validatePayload(payload: AiSensyPayload): ValidationResult {
  const errors: string[] = []

  if (!payload.apiKey) {
    errors.push('API key is missing')
  }
  if (!payload.campaignName) {
    errors.push('Campaign name is missing')
  }
  if (!payload.destination) {
    errors.push('Destination phone is missing')
  } else if (!isValidAiSensyPhone(payload.destination)) {
    errors.push(`Destination phone is invalid: ${payload.destination.slice(0, 4)}****`)
  }
  if (!payload.source) {
    errors.push('Source is missing')
  }
  if (!payload.userName) {
    errors.push('Username is missing')
  }

  // Template params: must be non-empty array with no null/undefined/empty values
  if (!Array.isArray(payload.templateParams) || payload.templateParams.length === 0) {
    errors.push('Template parameters array is empty or missing')
  } else {
    payload.templateParams.forEach((param, idx) => {
      if (param === null || param === undefined || param === '') {
        errors.push(`Template parameter at index ${idx} is null/undefined/empty`)
      }
    })
  }

  // Buttons: if present, validate structure
  if (Array.isArray(payload.buttons) && payload.buttons.length > 0) {
    payload.buttons.forEach((button, idx) => {
      if (!button.parameters || button.parameters.length === 0) {
        errors.push(`Button at index ${idx} has no parameters`)
      } else {
        button.parameters.forEach((param, pIdx) => {
          if (!param.text && param.text !== '0') {
            errors.push(`Button ${idx} parameter ${pIdx} has empty text`)
          }
        })
      }
    })
  }

  // Check for undefined/null in critical fields
  const criticalFields = ['apiKey', 'campaignName', 'destination', 'userName', 'source'] as const
  for (const field of criticalFields) {
    if (payload[field] === undefined || payload[field] === null) {
      errors.push(`Field '${field}' is undefined or null`)
    }
  }

  return { valid: errors.length === 0, errors }
}

// ─── Structured Logging ──────────────────────────────────────────────────────

const LOG_PREFIX = '[aisensy]'

/** Masks a phone number for safe logging: "919876543210" → "9198****3210" */
function maskPhoneForLog(phone: string): string {
  if (phone.length <= 6) return '****'
  return phone.slice(0, 4) + '****' + phone.slice(-4)
}

/** Logs structured pre-request information */
function logPreRequest(payload: AiSensyPayload): void {
  console.log(`${LOG_PREFIX} Sending template message`, {
    destination: maskPhoneForLog(payload.destination),
    campaign: payload.campaignName,
    templateParamsCount: payload.templateParams.length,
    buttonsCount: payload.buttons.length,
    buttonParam: payload.buttons.length > 0
      ? payload.buttons[0]?.parameters?.[0]?.text?.slice(0, 4) + '****'
      : 'none',
    firstName: payload.templateParams[0]?.slice(0, 3) + '***',
    source: payload.source,
  })
}

/** Logs structured post-response information */
function logPostResponse(
  campaign: string,
  httpStatus: number,
  responseData: any,
  durationMs: number,
): void {
  console.log(`${LOG_PREFIX} API response`, {
    campaign,
    httpStatus,
    messageId: responseData?.data?.messageId || responseData?.messageId || responseData?.id || 'N/A',
    status: responseData?.status || responseData?.data?.status || 'N/A',
    durationMs,
  })
}

/** Logs structured error information */
function logError(
  campaign: string,
  errorType: string,
  details: string,
  httpStatus?: number,
): void {
  console.error(`${LOG_PREFIX} ${errorType}`, {
    campaign,
    details,
    httpStatus: httpStatus || 'N/A',
  })
}

// ─── Error Mapping ───────────────────────────────────────────────────────────

/**
 * Maps AiSensy/Meta error responses to structured error codes and messages.
 * Provides actionable error descriptions instead of generic "OTP failed".
 */
function mapAiSensyError(httpStatus: number, responseData: any): { code: AiSensyErrorCode; message: string } {
  const rawMessage = responseData?.message || responseData?.error || responseData?.data?.message || ''
  const lowerMsg = rawMessage.toLowerCase()

  // Template / button errors
  if (lowerMsg.includes('button') && lowerMsg.includes('parameter')) {
    return { code: 'TEMPLATE_MISMATCH', message: 'Template URL button parameter missing or invalid' }
  }
  if (lowerMsg.includes('template') && (lowerMsg.includes('mismatch') || lowerMsg.includes('invalid'))) {
    return { code: 'TEMPLATE_MISMATCH', message: 'Template parameters do not match the approved template' }
  }

  // Campaign errors
  if (lowerMsg.includes('campaign') && lowerMsg.includes('inactive')) {
    return { code: 'CAMPAIGN_INACTIVE', message: 'The messaging campaign is inactive' }
  }
  if (lowerMsg.includes('campaign') && lowerMsg.includes('invalid')) {
    return { code: 'CAMPAIGN_INACTIVE', message: 'Invalid campaign name' }
  }

  // Auth errors
  if (httpStatus === 401 || httpStatus === 403 || lowerMsg.includes('unauthorized') || lowerMsg.includes('api key')) {
    return { code: 'INVALID_API_KEY', message: 'Invalid or expired API key' }
  }

  // Recipient errors
  if (lowerMsg.includes('not on whatsapp') || lowerMsg.includes('invalid number')) {
    return { code: 'RECIPIENT_NOT_ON_WHATSAPP', message: 'Recipient is not registered on WhatsApp' }
  }

  // Meta rejection
  if (lowerMsg.includes('meta') || lowerMsg.includes('rejected') || lowerMsg.includes('facebook')) {
    return { code: 'META_REJECTED', message: `Meta rejected the message: ${rawMessage}` }
  }

  // Rate limiting
  if (httpStatus === 429) {
    return { code: 'API_ERROR', message: 'AiSensy rate limit exceeded. Please retry later.' }
  }

  // Generic HTTP errors
  if (httpStatus >= 500) {
    return { code: 'API_ERROR', message: `AiSensy server error (HTTP ${httpStatus})` }
  }
  if (httpStatus >= 400) {
    return { code: 'API_ERROR', message: rawMessage || `AiSensy request failed (HTTP ${httpStatus})` }
  }

  return { code: 'UNKNOWN_ERROR', message: rawMessage || `Unexpected error (HTTP ${httpStatus})` }
}

// ─── OTP Payload Builder ─────────────────────────────────────────────────────

/**
 * Builds the complete AiSensy payload for the `millionflats_auth_otp` template.
 *
 * The approved template structure requires:
 *   - templateParams[0] = user's first name (body variable $FirstName)
 *   - buttons[0].parameters[0].text = OTP code (dynamic URL button suffix)
 *   - paramsFallbackValue.FirstName = fallback if name is unavailable
 *
 * This is the ONLY place OTP payloads are constructed. All callers use this
 * function to ensure consistency with the approved template.
 */
export function buildOtpPayload(input: OtpPayloadInput): AiSensyPayload {
  const normalizedPhone = normalizePhoneForAiSensy(input.phone)
  if (!normalizedPhone) {
    throw new Error(`Cannot normalize phone for AiSensy: ${input.phone.slice(0, 4)}****`)
  }

  // Extract first name — never allow null, undefined, or empty string
  const firstName = sanitizeTemplateParam(input.firstName, 'user')

  return {
    apiKey: AISENSY_CONFIG.apiKey,
    campaignName: AISENSY_CONFIG.otpCampaignName,
    destination: normalizedPhone,
    userName: AISENSY_CONFIG.userName,
    templateParams: [firstName],
    source: AISENSY_CONFIG.source,
    media: {},
    buttons: [
      {
        type: 'button',
        sub_type: 'url',
        index: 0,
        parameters: [
          {
            type: 'text',
            text: input.otp,
          },
        ],
      },
    ],
    carouselCards: [],
    location: {},
    attributes: {},
    paramsFallbackValue: {
      FirstName: firstName,
    },
  }
}

// ─── Template Parameter Utilities ────────────────────────────────────────────

/**
 * Sanitizes a template parameter value.
 * Ensures the value is never null, undefined, or empty string.
 * Trims whitespace and applies the fallback if needed.
 */
function sanitizeTemplateParam(
  value: string | null | undefined,
  fallback: string,
): string {
  if (value === null || value === undefined) return fallback
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : fallback
}

/**
 * Extracts the first name from a full name string.
 * "Karan Kathuria" → "Karan"
 * "" → null
 */
export function extractFirstName(fullName: string | null | undefined): string | null {
  if (!fullName) return null
  const trimmed = fullName.trim()
  if (trimmed.length === 0) return null
  return trimmed.split(/\s+/)[0] || null
}

// ─── Generic Template Sender ─────────────────────────────────────────────────

/**
 * Reusable template sending engine. All AiSensy campaigns flow through this
 * single function, ensuring consistent validation, logging, and error handling.
 *
 * Future campaigns (Registration, Welcome, Booking Confirmation, Property Alerts,
 * Lead Assignment, Agent Approval, Developer Verification) should use this
 * function instead of creating separate fetch calls.
 */
export async function sendTemplate(input: SendTemplateInput): Promise<AiSensySendResult> {
  const normalizedPhone = normalizePhoneForAiSensy(input.phone)
  if (!normalizedPhone) {
    logError(input.campaign, 'Validation Error', `Invalid phone: ${input.phone.slice(0, 4)}****`)
    return {
      success: false,
      error: 'Invalid phone number format',
      errorCode: 'INVALID_PHONE',
    }
  }

  const payload: AiSensyPayload = {
    apiKey: AISENSY_CONFIG.apiKey,
    campaignName: input.campaign,
    destination: normalizedPhone,
    userName: AISENSY_CONFIG.userName,
    templateParams: input.templateParams,
    source: input.source || AISENSY_CONFIG.source,
    media: input.media || {},
    buttons: input.buttons || [],
    carouselCards: [],
    location: {},
    attributes: input.attributes || {},
    paramsFallbackValue: input.paramsFallbackValue || {},
  }

  // Validate before sending — never call AiSensy with an invalid payload
  const validation = validatePayload(payload)
  if (!validation.valid) {
    const errorDetail = validation.errors.join('; ')
    logError(input.campaign, 'Validation Error', errorDetail)
    return {
      success: false,
      error: `Payload validation failed: ${errorDetail}`,
      errorCode: 'VALIDATION_ERROR',
    }
  }

  // Log pre-request details
  logPreRequest(payload)

  const startTime = Date.now()

  try {
    // Create an AbortController for timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), AISENSY_CONFIG.timeoutMs)

    const response = await fetch(AISENSY_CONFIG.apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    const durationMs = Date.now() - startTime
    const data = await response.json().catch(() => null)

    // Log post-response details
    logPostResponse(input.campaign, response.status, data, durationMs)

    if (response.ok && data) {
      const messageId = data?.data?.messageId || data?.messageId || data?.id || undefined
      console.log(`${LOG_PREFIX} ✓ Message dispatched successfully`, {
        campaign: input.campaign,
        destination: maskPhoneForLog(normalizedPhone),
        messageId: messageId || 'N/A',
        durationMs,
      })
      return {
        success: true,
        messageId,
        httpStatus: response.status,
      }
    }

    // Map the error to a structured code + message
    const mapped = mapAiSensyError(response.status, data)
    logError(input.campaign, mapped.code, mapped.message, response.status)
    return {
      success: false,
      error: mapped.message,
      errorCode: mapped.code,
      httpStatus: response.status,
    }
  } catch (error) {
    const durationMs = Date.now() - startTime

    // Handle timeout
    if (error instanceof DOMException && error.name === 'AbortError') {
      logError(input.campaign, 'Timeout', `Request timed out after ${AISENSY_CONFIG.timeoutMs}ms`)
      return {
        success: false,
        error: `Request timed out after ${AISENSY_CONFIG.timeoutMs}ms`,
        errorCode: 'TIMEOUT',
      }
    }

    // Handle network errors
    const msg = error instanceof Error ? error.message : 'Unknown network error'
    logError(input.campaign, 'Network Error', `${msg} (after ${durationMs}ms)`)
    return {
      success: false,
      error: `Network error: ${msg}`,
      errorCode: 'NETWORK_ERROR',
    }
  }
}

// ─── Send OTP via AiSensy ────────────────────────────────────────────────────

/**
 * Sends a 6-digit OTP to a phone number via AiSensy WhatsApp campaign API.
 *
 * Uses the approved `millionflats_auth_otp` template which requires:
 *   - Body variable: $FirstName (user's first name)
 *   - URL button parameter: the OTP code (dynamic URL suffix)
 *
 * The OTP is placed in the URL button parameter (buttons[0].parameters[0].text),
 * NOT in templateParams. This matches the approved template structure and
 * eliminates the "Button at index 0 of type Url requires a parameter" error.
 *
 * @param input.phone     - Phone number (E.164 or raw digits)
 * @param input.otp       - 6-digit OTP string
 * @param input.firstName - User's first name for template personalization (optional)
 * @returns AiSensySendResult with success status and optional messageId
 */
export async function sendOtpViaAiSensy(
  input: OtpPayloadInput,
): Promise<AiSensySendResult> {
  // Build payload using the centralized builder
  let payload: AiSensyPayload
  try {
    payload = buildOtpPayload(input)
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Payload build failed'
    logError(AISENSY_CONFIG.otpCampaignName, 'Payload Build Error', msg)
    return {
      success: false,
      error: msg,
      errorCode: 'VALIDATION_ERROR',
    }
  }

  // Validate before sending
  const validation = validatePayload(payload)
  if (!validation.valid) {
    const errorDetail = validation.errors.join('; ')
    logError(AISENSY_CONFIG.otpCampaignName, 'Validation Error', errorDetail)
    return {
      success: false,
      error: `Payload validation failed: ${errorDetail}`,
      errorCode: 'VALIDATION_ERROR',
    }
  }

  // Log pre-request
  logPreRequest(payload)

  const startTime = Date.now()

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), AISENSY_CONFIG.timeoutMs)

    const response = await fetch(AISENSY_CONFIG.apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    const durationMs = Date.now() - startTime
    const data = await response.json().catch(() => null)

    // Log post-response
    logPostResponse(AISENSY_CONFIG.otpCampaignName, response.status, data, durationMs)

    if (response.ok && data) {
      const messageId = data?.data?.messageId || data?.messageId || data?.id || undefined
      console.log(`${LOG_PREFIX} ✓ OTP dispatched successfully`, {
        destination: maskPhoneForLog(payload.destination),
        messageId: messageId || 'N/A',
        durationMs,
      })
      return {
        success: true,
        messageId,
        httpStatus: response.status,
      }
    }

    // Map error
    const mapped = mapAiSensyError(response.status, data)
    logError(AISENSY_CONFIG.otpCampaignName, mapped.code, mapped.message, response.status)
    return {
      success: false,
      error: mapped.message,
      errorCode: mapped.code,
      httpStatus: response.status,
    }
  } catch (error) {
    const durationMs = Date.now() - startTime

    if (error instanceof DOMException && error.name === 'AbortError') {
      logError(AISENSY_CONFIG.otpCampaignName, 'Timeout', `Request timed out after ${AISENSY_CONFIG.timeoutMs}ms`)
      return {
        success: false,
        error: `Request timed out after ${AISENSY_CONFIG.timeoutMs}ms`,
        errorCode: 'TIMEOUT',
      }
    }

    const msg = error instanceof Error ? error.message : 'Unknown network error'
    logError(AISENSY_CONFIG.otpCampaignName, 'Network Error', `${msg} (after ${durationMs}ms)`)
    return {
      success: false,
      error: `Network error: ${msg}`,
      errorCode: 'NETWORK_ERROR',
    }
  }
}

// ─── Send Welcome Message ────────────────────────────────────────────────────

/**
 * Sends a welcome message via AiSensy after successful registration.
 * Uses the reusable sendTemplate() engine. Fire-and-forget — never blocks auth flow.
 */
export async function sendWelcomeMessage(phone: string, userName: string): Promise<void> {
  const campaignName = AISENSY_CONFIG.welcomeCampaignName
  if (!AISENSY_CONFIG.apiKey || !campaignName) {
    return // Silently skip if not configured
  }

  const displayName = sanitizeTemplateParam(userName, 'there')

  try {
    await sendTemplate({
      campaign: campaignName,
      phone,
      templateParams: [displayName],
      source: 'millionflats-welcome',
      paramsFallbackValue: {
        FirstName: displayName,
      },
    })
  } catch {
    // Welcome message is fire-and-forget; don't block auth flow
    console.warn(`${LOG_PREFIX} Failed to send welcome message (non-critical)`)
  }
}
