import crypto from "crypto";
import type { WhatsAppMessageResult } from "./types";

const DEFAULT_AUTH_CAMPAIGN_NAME = "login_millionflats";
const DEFAULT_AISENSY_USER_NAME = "MillionFlats User";
const DEFAULT_AISENSY_MIN_USERNAME_LENGTH = 2;
const DEFAULT_AISENSY_MAX_USERNAME_LENGTH = 50;
const DEFAULT_WELCOME_CAMPAIGN_NAME = "welcome_millionflats";
const DEFAULT_OTP_CONTEXT = "login";
const DEFAULT_SUPPORT_CONTACT = "1800-555-1234";
const DEFAULT_OTP_TEMPLATE_PLACEHOLDER_COUNT = 1;
const AISENSY_CAMPAIGN_API = "https://backend.aisensy.com/campaign/t1/api/v2";

type AiSensyConfig = ReturnType<typeof getConfig>;
type AiSensyErrorType = NonNullable<WhatsAppMessageResult['errorType']>;
const E164_DESTINATION_REGEX = /^\+[1-9]\d{6,14}$/;

function getExpectedTemplatePlaceholderCount(): number {
  const parsed = Number(
    process.env.AISENSY_OTP_TEMPLATE_PLACEHOLDER_COUNT ||
      DEFAULT_OTP_TEMPLATE_PLACEHOLDER_COUNT,
  );

  return Number.isFinite(parsed) && parsed > 0
    ? Math.floor(parsed)
    : DEFAULT_OTP_TEMPLATE_PLACEHOLDER_COUNT;
}

export function buildAiSensyOtpPayload(input: {
  apiKey: string;
  campaignName: string;
  destination: string;
  otp: string;
  context?: string;
  supportContact?: string;
  userName?: string;
  expectedPlaceholderCount?: number;
}): {
  apiKey: string;
  campaignName: string;
  destination: string;
  userName: string;
  templateParams: string[];
} {
  const expectedCount =
    input.expectedPlaceholderCount ?? getExpectedTemplatePlaceholderCount();
  const templateParams = Array.from({ length: expectedCount }, (_, index) => {
    if (index === 0) return input.otp;
    if (index === 1) return input.context ?? "";
    if (index === 2) return input.supportContact ?? "";
    return "";
  });

  const resolvedUserName = normalizeAndValidateUserName(input.userName) ?? DEFAULT_AISENSY_USER_NAME;

  return {
    apiKey: input.apiKey,
    campaignName: input.campaignName,
    destination: normalizeDestination(input.destination),
    userName: resolvedUserName,
    templateParams,
  };
}

export function validateAiSensyPayload(
  payload: {
    apiKey?: string;
    campaignName?: string;
    destination?: string;
    templateParams?: unknown;
    userName?: unknown;
  },
  options?: { expectedPlaceholderCount?: number },
): { valid: boolean; error?: string } {
  if (!payload.apiKey || typeof payload.apiKey !== "string" || !payload.apiKey.trim()) {
    return { valid: false, error: "AiSensy API key is required." };
  }

  if (
    !payload.campaignName ||
    typeof payload.campaignName !== "string" ||
    !payload.campaignName.trim()
  ) {
    return { valid: false, error: "AiSensy campaignName is required." };
  }

  if (
    !payload.destination ||
    typeof payload.destination !== "string" ||
    !payload.destination.trim()
  ) {
    return { valid: false, error: "AiSensy destination is required." };
  }

  if (!E164_DESTINATION_REGEX.test(payload.destination.trim())) {
    return {
      valid: false,
      error: "AiSensy destination must be a valid E.164 phone number.",
    };
  }

  if (payload.userName === undefined || payload.userName === null) {
    return { valid: false, error: "AiSensy userName is required." };
  }

  if (typeof payload.userName !== "string") {
    return { valid: false, error: "AiSensy userName must be a string." };
  }

  const trimmedUserName = payload.userName.trim();
  if (!trimmedUserName) {
    return { valid: false, error: "AiSensy userName must not be empty." };
  }

  if (trimmedUserName.length < DEFAULT_AISENSY_MIN_USERNAME_LENGTH) {
    return {
      valid: false,
      error: `AiSensy userName must be at least ${DEFAULT_AISENSY_MIN_USERNAME_LENGTH} characters.`,
    };
  }

  if (trimmedUserName.length > DEFAULT_AISENSY_MAX_USERNAME_LENGTH) {
    return {
      valid: false,
      error: `AiSensy userName must be at most ${DEFAULT_AISENSY_MAX_USERNAME_LENGTH} characters.`,
    };
  }

  if (!isMeaningfulUserName(trimmedUserName)) {
    return { valid: false, error: "AiSensy userName must contain letters or a meaningful display name." };
  }

  if (!Array.isArray(payload.templateParams)) {
    return { valid: false, error: "AiSensy templateParams must be an array." };
  }

  const expectedCount = options?.expectedPlaceholderCount ?? getExpectedTemplatePlaceholderCount();
  if (payload.templateParams.length !== expectedCount) {
    return {
      valid: false,
      error: `AiSensy templateParams expected ${expectedCount} placeholder(s), received ${payload.templateParams.length}.`,
    };
  }

  const invalidValue = payload.templateParams.find((value) => {
    return value === null || value === undefined || String(value).trim() === "";
  });

  if (invalidValue !== undefined) {
    return {
      valid: false,
      error: "AiSensy templateParams contains empty or invalid values.",
    };
  }

  return { valid: true };
}

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
  requestContext?: { user?: unknown; registration?: unknown; auth?: unknown },
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

  const cleanPhone = normalizeDestination(phone);

  const expectedPlaceholderCount = getExpectedTemplatePlaceholderCount();
  const userNameResolution = resolveAiSensyUserNameWithMetadata(requestContext?.user, requestContext?.registration, requestContext?.auth);
  const userName = userNameResolution.value;
  const payload = buildAiSensyOtpPayload({
    apiKey: config.apiKey,
    campaignName,
    destination: cleanPhone,
    otp,
    context,
    supportContact,
    userName,
    expectedPlaceholderCount,
  });

  const validation = validateAiSensyPayload(payload, {
    expectedPlaceholderCount,
  });

  if (!validation.valid) {
    console.error("[WhatsApp AiSensy] Payload validation failed", {
      requestId,
      error: validation.error,
      payload: {
        ...payload,
        apiKey: maskApiKey(config.apiKey),
      },
    });

    return {
      success: false,
      error: validation.error,
      errorType: getValidationErrorType(validation.error),
      requestId,
    };
  }

  const payloadInspection = describeAiSensyPayload(payload, {
    apiKey: config.apiKey,
  });

  console.log("========== AISENSY REQUEST ==========");
  console.log(JSON.stringify(payload, null, 2));
  console.log("====================================");
  console.info("[WhatsApp AiSensy] Sending OTP request", {
    requestId,
    endpoint: AISENSY_CAMPAIGN_API,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    payload: payloadInspection,
    userNameResolution,
  });

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
    
    const errorType = getAiSensyErrorType(sent.status, sent.data);

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
  requestContext?: { user?: unknown; registration?: unknown; auth?: unknown },
): Promise<WhatsAppMessageResult> {
  if (process.env.WHATSAPP_TEST_MODE === "true") {
    console.log(`[WhatsApp TEST MODE] Welcome message skipped for ${phone}`);
    return { success: true, messageId: `test_welcome_${Date.now()}` };
  }

  const config = getConfig();
  if (!config.apiKey) return { success: false, errorType: "CONFIG_ERROR" };

  const cleanPhone = normalizeDestination(phone);
  const campaignName = (
    process.env.AISENSY_WELCOME_CAMPAIGN_NAME || DEFAULT_WELCOME_CAMPAIGN_NAME
  ).trim();

  const userNameResolution = resolveAiSensyUserNameWithMetadata(requestContext?.user, requestContext?.registration, requestContext?.auth);
  const userName = userNameResolution.value;
  const payload = {
    apiKey: config.apiKey,
    campaignName,
    destination: cleanPhone,
    userName,
    templateParams: [],
  };

  const validation = validateAiSensyPayload(payload, { expectedPlaceholderCount: 0 });
  if (!validation.valid) {
    console.error("[WhatsApp AiSensy] Welcome payload validation failed", {
      error: validation.error,
      payload: {
        ...payload,
        apiKey: maskApiKey(config.apiKey),
      },
    });

    return {
      success: false,
      error: validation.error,
      errorType: getValidationErrorType(validation.error),
    };
  }

  const sent = await aisensyRequestWithRetry({
    endpoint: AISENSY_CAMPAIGN_API,
    body: payload,
  });

  if (!sent.ok) {
    return {
      success: false,
      errorType: getAiSensyErrorType(sent.status, sent.data),
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
      const startedAt = Date.now();
      const response = await fetch(input.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(input.body),
      });
      
      const data = await response.json().catch(() => ({}));
      const latencyMs = Date.now() - startedAt;

      console.info("[WhatsApp AiSensy] HTTP response", {
        endpoint: input.endpoint,
        method: "POST",
        status: response.status,
        latencyMs,
        responseBody: data,
      });

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

function getAiSensyErrorType(status: number, data?: any): AiSensyErrorType {
  const message = [data?.error, data?.message].filter(Boolean).join(" ").toLowerCase();

  if (status === 401 || status === 403) return "CONFIG_ERROR";
  if (status === 400) {
    if (message.includes("username")) return "INVALID_USERNAME";
    if (message.includes("destination")) return "INVALID_DESTINATION";
    if (message.includes("campaign")) return "INVALID_CAMPAIGN";
    if (message.includes("template") || message.includes("parameter")) return "INVALID_TEMPLATE";
    return "PROVIDER_VALIDATION_ERROR";
  }
  if (status === 429) return "PROVIDER_ERROR";
  if (status >= 500) return "NETWORK_ERROR";
  return "PROVIDER_ERROR";
}

function getValidationErrorType(error?: string): AiSensyErrorType {
  const message = (error || "").toLowerCase();

  if (message.includes("api key")) return "INVALID_API_KEY";
  if (message.includes("campaign")) return "INVALID_CAMPAIGN";
  if (message.includes("destination")) return "INVALID_DESTINATION";
  if (message.includes("templateparams")) return "INVALID_TEMPLATE";
  if (message.includes("username")) return "INVALID_USERNAME";
  return "PROVIDER_VALIDATION_ERROR";
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function maskApiKey(apiKey: string): string {
  if (!apiKey) return "";
  if (apiKey.length <= 10) return "***";

  return `${apiKey.slice(0, 6)}...${apiKey.slice(-4)}`;
}

function normalizeDestination(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits ? `+${digits}` : "";
}

function normalizeAndValidateUserName(userName?: string | null): string | null {
  if (typeof userName !== "string") return null;
  const trimmed = userName.trim();
  if (!trimmed) return null;
  const collapsed = trimmed.replace(/\s+/g, " ");
  return isMeaningfulUserName(collapsed) ? collapsed : null;
}

export function resolveAiSensyUserName(
  user?: unknown,
  registration?: unknown,
  auth?: unknown,
): string {
  return resolveAiSensyUserNameWithMetadata(user, registration, auth).value;
}

function resolveAiSensyUserNameWithMetadata(
  user?: unknown,
  registration?: unknown,
  auth?: unknown,
): { value: string; source: string } {
  const candidates: Array<{ source: string; value: string | null }> = [
    { source: "user", value: getNameFromCandidate(user) },
    { source: "registration", value: getNameFromCandidate(registration) },
    { source: "auth", value: getNameFromCandidate(auth) },
    { source: "user.fullName", value: getNameFromCandidate((user as { fullName?: unknown })?.fullName) },
    { source: "user.name", value: getNameFromCandidate((user as { name?: unknown })?.name) },
    { source: "registration.fullName", value: getNameFromCandidate((registration as { fullName?: unknown })?.fullName) },
    { source: "registration.firstName", value: getNameFromCandidate((registration as { firstName?: unknown })?.firstName) },
    { source: "registration.name", value: getNameFromCandidate((registration as { name?: unknown })?.name) },
    { source: "auth.fullName", value: getNameFromCandidate((auth as { fullName?: unknown })?.fullName) },
    { source: "auth.firstName", value: getNameFromCandidate((auth as { firstName?: unknown })?.firstName) },
    { source: "auth.name", value: getNameFromCandidate((auth as { name?: unknown })?.name) },
  ];

  for (const candidate of candidates) {
    if (candidate.value) return { value: candidate.value, source: candidate.source };
  }

  return { value: DEFAULT_AISENSY_USER_NAME, source: "fallback" };
}

function getNameFromCandidate(candidate: unknown): string | null {
  if (typeof candidate === "string") {
    return normalizeAndValidateUserName(candidate);
  }

  if (candidate && typeof candidate === "object") {
    const record = candidate as Record<string, unknown>;
    const direct = [record.fullName, record.name, record.firstName].find((value): value is string => typeof value === "string");
    return normalizeAndValidateUserName(direct ?? null);
  }

  return null;
}

function isMeaningfulUserName(value: string): boolean {
  if (!value) return false;
  if (/^[+\d\s()-]+$/.test(value)) return false;
  if (/^[^a-zA-Z0-9]+$/.test(value)) return false;
  if (/^[0-9]+$/.test(value)) return false;
  if (/^[a-zA-Z]+$/.test(value) && value.length < 2) return false;
  return /[a-zA-Z]/.test(value);
}

function describeAiSensyPayload(
  payload: Record<string, unknown>,
  options?: { apiKey?: string },
): Record<string, unknown> {
  const apiKey = options?.apiKey;
  const summary: Record<string, unknown> = {
    ...payload,
    apiKey: maskApiKey(apiKey || ""),
  };

  if (Object.prototype.hasOwnProperty.call(payload, "userName")) {
    const userName = payload.userName;
    summary.userName = {
      present: true,
      type: typeof userName,
      value: userName,
      trimmed: typeof userName === "string" ? userName.trim() : null,
      length: typeof userName === "string" ? userName.length : null,
    };
  } else {
    summary.userName = {
      present: false,
      reason: "not sent",
    };
  }

  if (Array.isArray(payload.templateParams)) {
    summary.templateParams = payload.templateParams.map((value, index) => ({
      index,
      type: typeof value,
      value,
      trimmed: typeof value === "string" ? value.trim() : null,
      length: typeof value === "string" ? value.length : null,
    }));
  }

  if (typeof payload.campaignName === "string") {
    summary.campaignName = {
      type: typeof payload.campaignName,
      value: payload.campaignName,
      trimmed: payload.campaignName.trim(),
      length: payload.campaignName.length,
    };
  }

  if (typeof payload.destination === "string") {
    summary.destination = {
      type: typeof payload.destination,
      value: payload.destination,
      trimmed: payload.destination.trim(),
      length: payload.destination.length,
    };
  }

  return summary;
}
