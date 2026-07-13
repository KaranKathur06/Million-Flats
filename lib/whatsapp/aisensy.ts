import crypto from "crypto";
import type { WhatsAppMessageResult } from "./types";

const DEFAULT_AUTH_CAMPAIGN_NAME = "login_millionflats";
const DEFAULT_WELCOME_CAMPAIGN_NAME = "welcome_millionflats";
const DEFAULT_OTP_CONTEXT = "login";
const DEFAULT_SUPPORT_CONTACT = "1800-555-1234";
const AISENSY_CAMPAIGN_API = "https://backend.aisensy.com/campaign/t1/api/v2";

type AiSensyConfig = ReturnType<typeof getConfig>;
type AiSensyErrorType = NonNullable<WhatsAppMessageResult['errorType']>;

function getConfig() {
  const apiKey = (process.env.AISENSY_API_KEY || "").trim();
  const webhookVerifyToken = (
    process.env.AISENSY_WEBHOOK_VERIFY_TOKEN || ""
  ).trim();

  if (process.env.NODE_ENV !== "production" && !apiKey) {
    console.warn("[WhatsApp AiSensy] AISENSY_API_KEY is not set or empty.");
  }

  return { apiKey, webhookVerifyToken };
}

export async function sendAuthenticationOtp(
  phone: string,
  otp: string,
): Promise<WhatsAppMessageResult> {
  if (process.env.WHATSAPP_TEST_MODE === "true") {
    console.log("[WhatsApp TEST MODE] OTP not sent via AiSensy API", {
      phone: phone.replace(/[^0-9]/g, ""),
      otp,
    });
    return { success: true, messageId: `test_${Date.now()}` };
  }

  const requestId = crypto.randomUUID();
  const config = getConfig();
  const campaignName = (
    process.env.AISENSY_AUTH_CAMPAIGN_NAME || DEFAULT_AUTH_CAMPAIGN_NAME
  ).trim();
  const context = (
    process.env.AISENSY_OTP_CONTEXT || DEFAULT_OTP_CONTEXT
  ).trim();
  const supportContact = (
    process.env.AISENSY_SUPPORT_CONTACT || DEFAULT_SUPPORT_CONTACT
  ).trim();

  if (!config.apiKey) {
    console.error("[WhatsApp AiSensy] Missing API Key", { requestId });
    return { success: false, errorType: "CONFIG_ERROR", requestId };
  }

  const cleanPhone = phone.replace(/[^0-9]/g, "");

  const payload = {
    apiKey: config.apiKey,
    campaignName,
    destination: cleanPhone,
    userName: "User",
    source: "millionflats-auth",
    templateParams: [otp, context, supportContact],
    buttons: [
      {
        type: "button",
        sub_type: "url",
        index: "0",
        parameters: [
          {
            type: "text",
            text: otp,
          },
        ],
      },
    ],
  };

  const sent = await aisensyRequestWithRetry({
    endpoint: AISENSY_CAMPAIGN_API,
    body: payload,
  });

  if (!sent.ok) {
    const errorMsg = sent.data?.error || sent.data?.message || "API_ERROR";
    console.error("[WhatsApp AiSensy] Send OTP failed", {
      requestId,
      httpStatus: sent.status,
      campaignName,
      errorMsg,
      response: sent.data,
    });
    
    const errorType = getAiSensyErrorType(sent.status);

    return {
      success: false,
      error: errorMsg,
      errorType,
      requestId,
    };
  }

  return {
    success: true,
    messageId: sent.data?.messageId || sent.data?.id,
    requestId,
  };
}

/** Sends the one-time welcome message after successful first login using Campaign API */
export async function sendWelcomeMessage(
  phone: string,
): Promise<WhatsAppMessageResult> {
  if (process.env.WHATSAPP_TEST_MODE === "true") {
    console.log(`[WhatsApp TEST MODE] Welcome message skipped for ${phone}`);
    return { success: true, messageId: `test_welcome_${Date.now()}` };
  }

  const config = getConfig();
  if (!config.apiKey) return { success: false, errorType: "CONFIG_ERROR" };

  const cleanPhone = phone.replace(/[^0-9]/g, "");
  const campaignName = (
    process.env.AISENSY_WELCOME_CAMPAIGN_NAME || DEFAULT_WELCOME_CAMPAIGN_NAME
  ).trim();

  const payload = {
    apiKey: config.apiKey,
    campaignName,
    destination: cleanPhone,
    userName: "User",
    source: "millionflats-auth",
    templateParams: [],
  };

  const sent = await aisensyRequestWithRetry({
    endpoint: AISENSY_CAMPAIGN_API,
    body: payload,
  });

  if (!sent.ok) {
    return {
      success: false,
      errorType: getAiSensyErrorType(sent.status),
      error: sent.data?.error || sent.data?.message,
    };
  }
  
  return { 
    success: true, 
    messageId: sent.data?.messageId || sent.data?.id 
  };
}

/** 
 * Verifies webhook using an optional custom header secret,
 * as AiSensy doesn't enforce standard HMAC signatures by default.
 */
export function verifyWebhookSignature(reqHeaders: Headers): boolean {
  const { webhookVerifyToken } = getConfig();
  if (!webhookVerifyToken) return true; // If no token is configured, allow all

  const authHeader = reqHeaders.get("authorization") || reqHeaders.get("x-webhook-secret");
  return authHeader === webhookVerifyToken;
}

export { getConfig as getProviderConfig };

async function aisensyRequestWithRetry(input: {
  endpoint: string;
  body: unknown;
}): Promise<{ ok: boolean; status: number; data: any }> {
  const maxAttempts = 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const response = await fetch(input.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(input.body),
      });
      
      const data = await response.json().catch(() => ({}));

      if (
        response.ok ||
        !isRetryableStatus(response.status) ||
        attempt === maxAttempts
      ) {
        return { ok: response.ok, status: response.status, data };
      }

      await delay(200 * 2 ** (attempt - 1));
    } catch (err) {
      if (attempt === maxAttempts) {
        return {
          ok: false,
          status: 0,
          data: { error: String(err) },
        };
      }

      await delay(200 * 2 ** (attempt - 1));
    }
  }

  return { ok: false, status: 0, data: { error: "UNKNOWN_ERROR" } };
}

function isRetryableStatus(status: number): boolean {
  return status === 429 || status >= 500;
}

function getAiSensyErrorType(status: number): AiSensyErrorType {
  if (status === 401 || status === 403) return "CONFIG_ERROR";
  if (status === 400 || status === 404) return "TEMPLATE_ERROR";
  if (status >= 500) return "NETWORK_ERROR";
  return "PROVIDER_ERROR";
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
