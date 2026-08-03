/**
 * aisensy-provider.ts
 *
 * AiSensy WhatsApp OTP dispatch provider.
 * Sends OTP messages via the AiSensy campaign API using the approved template.
 *
 * Env vars required:
 *   AISENSY_API_KEY           — JWT bearer token from AiSensy dashboard
 *   AISENSY_AUTH_CAMPAIGN_NAME — Name of the approved OTP template campaign
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export interface AiSensySendResult {
  success: boolean
  messageId?: string
  error?: string
}

// ─── Configuration ───────────────────────────────────────────────────────────

const AISENSY_API_URL = 'https://backend.aisensy.com/campaign/t1/api/v2'

function getAiSensyConfig() {
  const apiKey = process.env.AISENSY_API_KEY
  const campaignName = process.env.AISENSY_AUTH_CAMPAIGN_NAME || 'millionflats_auth_otp'

  if (!apiKey) {
    throw new Error('[aisensy] AISENSY_API_KEY is not configured')
  }

  return { apiKey, campaignName }
}

// ─── Send OTP via AiSensy ────────────────────────────────────────────────────

/**
 * Sends a 6-digit OTP to a phone number via AiSensy WhatsApp campaign API.
 *
 * The approved template should have a single variable placeholder for the OTP code.
 * AiSensy template example: "Your MillionFlats verification code is {{1}}. Valid for 5 minutes."
 *
 * @param phone - E.164 format phone number (e.g. "+919876543210")
 * @param otp   - 6-digit OTP string
 * @returns AiSensySendResult with success status and optional messageId
 */
export async function sendOtpViaAiSensy(
  phone: string,
  otp: string,
): Promise<AiSensySendResult> {
  const config = getAiSensyConfig()

  // AiSensy expects phone without the + prefix
  const phoneWithoutPlus = phone.startsWith('+') ? phone.slice(1) : phone

  const payload = {
    apiKey: config.apiKey,
    campaignName: config.campaignName,
    destination: phoneWithoutPlus,
    userName: 'MillionFlats User',
    templateParams: [otp],
    source: 'millionflats-auth',
    // Optional: media not needed for OTP
  }

  try {
    const response = await fetch(AISENSY_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    const data = await response.json().catch(() => null)

    if (response.ok && data) {
      console.log('[aisensy] OTP sent successfully to', phoneWithoutPlus.slice(0, 4) + '****')
      return {
        success: true,
        messageId: data?.data?.messageId || data?.messageId || data?.id || undefined,
      }
    }

    const errorMsg = data?.message || data?.error || `HTTP ${response.status}`
    console.error('[aisensy] Failed to send OTP:', errorMsg)
    return {
      success: false,
      error: errorMsg,
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Network error'
    console.error('[aisensy] Network error sending OTP:', msg)
    return {
      success: false,
      error: msg,
    }
  }
}

/**
 * Sends a welcome message via AiSensy after successful registration.
 * Uses a separate campaign template.
 */
export async function sendWelcomeMessage(phone: string, userName: string): Promise<void> {
  const apiKey = process.env.AISENSY_API_KEY
  const campaignName = process.env.AISENSY_WELCOME_CAMPAIGN_NAME
  if (!apiKey || !campaignName) return

  const phoneWithoutPlus = phone.startsWith('+') ? phone.slice(1) : phone

  try {
    await fetch(AISENSY_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        apiKey,
        campaignName,
        destination: phoneWithoutPlus,
        userName: userName || 'User',
        templateParams: [userName || 'there'],
        source: 'millionflats-welcome',
      }),
    })
  } catch {
    // Welcome message is fire-and-forget; don't block auth flow
    console.warn('[aisensy] Failed to send welcome message (non-critical)')
  }
}
