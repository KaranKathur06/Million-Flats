import { parsePhoneNumberFromString } from 'libphonenumber-js'

const AISENSY_CAMPAIGN_URL = 'https://backend.aisensy.com/campaign/t1/api/v2'

export class AiSensyError extends Error {
  constructor(message: string, readonly retryable: boolean) {
    super(message)
    this.name = 'AiSensyError'
  }
}

function normalizeDestination(phone: string) {
  const parsed = parsePhoneNumberFromString(phone)
  if (!parsed?.isValid() || !parsed.number) throw new AiSensyError('A valid WhatsApp number is required.', false)
  return parsed.number
}

function configuredButtonIndex() {
  const value = process.env.AISENSY_AUTH_OTP_URL_BUTTON_INDEX?.trim()
  if (!value) return null
  const index = Number(value)
  if (!Number.isInteger(index) || index < 0) throw new AiSensyError('AiSensy button configuration is invalid.', false)
  return index
}

export async function sendAiSensyAuthOtp(input: { phone: string; userName?: string | null; otp: string }) {
  const apiKey = process.env.AISENSY_API_KEY?.trim()
  const campaignName = process.env.AISENSY_AUTH_OTP_CAMPAIGN?.trim()
  if (!apiKey || !campaignName) {
    throw new AiSensyError('WhatsApp verification is not configured.', false)
  }

  const buttonIndex = configuredButtonIndex()
  const payload: Record<string, unknown> = {
    apiKey,
    campaignName,
    destination: normalizeDestination(input.phone),
    userName: input.userName?.trim() || 'MillionFlats user',
    source: 'millionflats-auth',
    // The approved template's first body placeholder is the OTP.
    templateParams: [input.otp],
  }

  // Authentication templates with a copy-OTP URL button require the same code here.
  if (buttonIndex !== null) {
    payload.buttons = [{
      type: 'button',
      sub_type: 'url',
      index: buttonIndex,
      parameters: [{ type: 'text', text: input.otp }],
    }]
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10_000)
  try {
    const response = await fetch(AISENSY_CAMPAIGN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    })
    if (!response.ok) {
      throw new AiSensyError('WhatsApp verification could not be sent. Please try again.', response.status >= 500 || response.status === 429)
    }
  } catch (error) {
    if (error instanceof AiSensyError) throw error
    throw new AiSensyError('WhatsApp verification could not be sent. Please try again.', true)
  } finally {
    clearTimeout(timeout)
  }
}
