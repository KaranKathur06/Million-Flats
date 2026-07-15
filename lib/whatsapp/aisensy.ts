import crypto from "crypto";
import type { WhatsAppMessageResult } from "./types";
import { resolveUserName } from "../userDisplayService";

const DEFAULT_AISENSY_ENDPOINT = "https://backend.aisensy.com/campaign/t1/api/v2";
const DEFAULT_AISENSY_CAMPAIGN_NAME = "millionflats_auth_otp";
const DEFAULT_AISENSY_SOURCE = "millionflats-auth";
const DEFAULT_AISENSY_USER_NAME = "MillionFlats User";
const DEFAULT_AISENSY_MIN_USERNAME_LENGTH = 2;
const DEFAULT_AISENSY_MAX_USERNAME_LENGTH = 50;
const DEFAULT_OTP_LENGTH = 6;
const DEFAULT_OTP_EXPIRY_MINUTES = 5;
const DEFAULT_OTP_PROVIDER = "aisensy";
const DEFAULT_BUTTON_SUB_TYPE = "url";
const DEFAULT_EXAMPLE_BUTTON_INDEX = 0;
const DEFAULT_TIMEOUT_MS = 10000;
const DEFAULT_RETRY_COUNT = 3;
const DEFAULT_RETRY_DELAY_MS = 300;
const E164_DESTINATION_REGEX = /^\+[1-9]\d{6,14}$/;
const INDIA_COUNTRY_CODE = "91";

type AiSensyConfig = ReturnType<typeof getConfig>;
type AiSensyErrorType = NonNullable<WhatsAppMessageResult["errorType"]>;
export type NotificationErrorCode =
  | "INVALID_CAMPAIGN"
  | "INVALID_DESTINATION"
  | "INVALID_TEMPLATE"
  | "INVALID_API_KEY"
  | "INVALID_USERNAME"
  | "CONFIG_ERROR"
  | "NETWORK_ERROR"
  | "PROVIDER_ERROR"
  | "PROVIDER_VALIDATION_ERROR";

export class NotificationProviderError extends Error {
  constructor(
    public readonly code: NotificationErrorCode,
    message: string,
    public readonly status?: number,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "NotificationProviderError";
  }
}

function getExpectedTemplatePlaceholderCount(): number {
  const parsed = Number(process.env.AISENSY_OTP_TEMPLATE_PLACEHOLDER_COUNT || 1);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 1;
}

function getOtpLength(): number {
  const parsed = Number(process.env.OTP_LENGTH || DEFAULT_OTP_LENGTH);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : DEFAULT_OTP_LENGTH;
}

function getOtpExpiryMinutes(): number {
  const parsed = Number(process.env.OTP_EXPIRY || DEFAULT_OTP_EXPIRY_MINUTES);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : DEFAULT_OTP_EXPIRY_MINUTES;
}

function getOtpProvider(): string {
  return (process.env.OTP_PROVIDER || DEFAULT_OTP_PROVIDER).trim() || DEFAULT_OTP_PROVIDER;
}

export function buildAiSensyOtpPayload(input: {
  apiKey: string;
  campaignName: string;
  destination: string;
  otp: string;
  userName?: string;
  fallbackUserName?: string;
  source?: string;
  expectedPlaceholderCount?: number;
}): {
  apiKey: string;
  campaignName: string;
  destination: string;
  userName: string;
  source: string;
  templateParams: string[];
  media: Record<string, never>;
  buttons: Array<{
    type: string;
    sub_type: string;
    index: number;
    parameters: Array<{ type: string; text: string }>;
  }>;
  carouselCards: Array<never>;
  location: Record<string, never>;
  attributes: Record<string, never>;
  paramsFallbackValue: Record<string, string>;
} {
  const expectedCount = input.expectedPlaceholderCount ?? getExpectedTemplatePlaceholderCount();
  const templateParams = Array.from({ length: expectedCount }, (_, index) => {
    if (index === 0) return input.otp;
    return "";
  });

  const resolvedUserName =
    normalizeAndValidateUserName(input.userName) ??
    normalizeAndValidateUserName(input.fallbackUserName) ??
    DEFAULT_AISENSY_USER_NAME;

  const source = input.source?.trim() || getConfig().source;

  return {
    apiKey: input.apiKey,
    campaignName: input.campaignName,
    destination: normalizePhoneNumber(input.destination),
    userName: resolvedUserName,
    source,
    templateParams,
    media: {},
    buttons: [
      {
        type: "button",
        sub_type: DEFAULT_BUTTON_SUB_TYPE,
        index: DEFAULT_EXAMPLE_BUTTON_INDEX,
        parameters: [{ type: "text", text: input.otp }],
      },
    ],
    carouselCards: [],
    location: {},
    attributes: {},
    paramsFallbackValue: { FirstName: resolvedUserName },
  };
}

export function validateAiSensyPayload(
  payload: {
    apiKey?: string;
    campaignName?: string;
    destination?: string;
    templateParams?: unknown;
    userName?: unknown;
    source?: unknown;
    buttons?: unknown;
    paramsFallbackValue?: unknown;
  },
  options?: { expectedPlaceholderCount?: number },
): { valid: boolean; error?: string } {
  if (!payload.apiKey || typeof payload.apiKey !== "string" || !payload.apiKey.trim()) {
    return { valid: false, error: "AiSensy API key is required." };
  }

  if (!payload.campaignName || typeof payload.campaignName !== "string" || !payload.campaignName.trim()) {
    return { valid: false, error: "AiSensy campaignName is required." };
  }

  if (!payload.destination || typeof payload.destination !== "string" || !payload.destination.trim()) {
    return { valid: false, error: "AiSensy destination is required." };
  }

  if (!E164_DESTINATION_REGEX.test(payload.destination.trim())) {
    return { valid: false, error: "AiSensy destination must be a valid E.164 phone number." };
  }

  if (!payload.source || typeof payload.source !== "string" || !payload.source.trim()) {
    return { valid: false, error: "AiSensy source is required." };
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
    return { valid: false, error: `AiSensy userName must be at least ${DEFAULT_AISENSY_MIN_USERNAME_LENGTH} characters.` };
  }

  if (trimmedUserName.length > DEFAULT_AISENSY_MAX_USERNAME_LENGTH) {
    return { valid: false, error: `AiSensy userName must be at most ${DEFAULT_AISENSY_MAX_USERNAME_LENGTH} characters.` };
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
    return { valid: false, error: "AiSensy templateParams contains empty or invalid values." };
  }

  if (!Array.isArray(payload.buttons)) {
    return { valid: false, error: "AiSensy buttons must be an array." };
  }

  const firstButton = payload.buttons[0];
  if (!firstButton || typeof firstButton !== "object") {
    return { valid: false, error: "AiSensy buttons must contain at least one button." };
  }

  const buttonParameters = (firstButton as { parameters?: unknown }).parameters;
  if (!Array.isArray(buttonParameters) || buttonParameters.length < 1) {
    return { valid: false, error: "AiSensy button parameters are required." };
  }

  const buttonText = buttonParameters[0];
  if (!buttonText || typeof buttonText !== "object") {
    return { valid: false, error: "AiSensy button parameters must contain a text object." };
  }

  const buttonTextValue = (buttonText as { text?: unknown }).text;
  if (typeof buttonTextValue !== "string" || !buttonTextValue.trim()) {
    return { valid: false, error: "AiSensy button parameter text is required." };
  }

  if (!payload.paramsFallbackValue || typeof payload.paramsFallbackValue !== "object") {
    return { valid: false, error: "AiSensy paramsFallbackValue is required." };
  }

  return { valid: true };
}

function getConfig() {
  const apiKey = (process.env.AISENSY_API_KEY || "").trim();
  const webhookVerifyToken = (process.env.AISENSY_WEBHOOK_VERIFY_TOKEN || "").trim();
  const campaignName = (process.env.AISENSY_CAMPAIGN_NAME || process.env.AISENSY_AUTH_CAMPAIGN_NAME || DEFAULT_AISENSY_CAMPAIGN_NAME).trim();
  const endpoint = (process.env.AISENSY_ENDPOINT || DEFAULT_AISENSY_ENDPOINT).trim();
  const source = (process.env.AISENSY_SOURCE || DEFAULT_AISENSY_SOURCE).trim();
  const timeoutMs = Number(process.env.AISENSY_TIMEOUT_MS || DEFAULT_TIMEOUT_MS);
  const retryCount = Number(process.env.AISENSY_RETRY_COUNT || DEFAULT_RETRY_COUNT);
  const retryDelayMs = Number(process.env.AISENSY_RETRY_DELAY_MS || DEFAULT_RETRY_DELAY_MS);

  if (process.env.NODE_ENV !== "production" && !apiKey) {
    console.warn("[WhatsApp AiSensy] AISENSY_API_KEY is not set or empty.");
  }

  return {
    apiKey,
    webhookVerifyToken,
    campaignName,
    endpoint,
    source,
    timeoutMs: Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : DEFAULT_TIMEOUT_MS,
    retryCount: Number.isFinite(retryCount) && retryCount > 0 ? retryCount : DEFAULT_RETRY_COUNT,
    retryDelayMs: Number.isFinite(retryDelayMs) && retryDelayMs > 0 ? retryDelayMs : DEFAULT_RETRY_DELAY_MS,
  };
}

export async function sendAuthenticationOtp(
  phone: string,
  otp: string,
  requestContext?: { user?: unknown; registration?: unknown; auth?: unknown },
): Promise<WhatsAppMessageResult> {
  if (process.env.WHATSAPP_TEST_MODE === "true") {
    return { success: true, messageId: `test_${Date.now()}` };
  }

  const requestId = crypto.randomUUID();
  const config = getConfig();

  if (!config.apiKey) {
    const error = new NotificationProviderError("CONFIG_ERROR", "AiSensy API key is required.", 500, { requestId });
    logDeliveryFailure(error, { requestId });
    return { success: false, error: error.message, errorType: "CONFIG_ERROR", requestId };
  }

  const destination = normalizePhoneNumber(phone);
  if (!destination) {
    const error = new NotificationProviderError("INVALID_DESTINATION", "Phone number is invalid.", 400, { requestId });
    logDeliveryFailure(error, { requestId, campaign: config.campaignName, destination: maskDestination(phone) });
    return { success: false, error: error.message, errorType: "INVALID_DESTINATION", requestId };
  }

  const userNameResolution = resolveAiSensyUserNameWithMetadata(requestContext?.user, requestContext?.registration, requestContext?.auth);
  const payload = buildAiSensyOtpPayload({
    apiKey: config.apiKey,
    campaignName: config.campaignName,
    destination,
    otp,
    userName: userNameResolution.value,
    fallbackUserName: DEFAULT_AISENSY_USER_NAME,
    source: config.source,
  });

  const validation = validateAiSensyPayload(payload, { expectedPlaceholderCount: getExpectedTemplatePlaceholderCount() });
  if (!validation.valid) {
    const error = new NotificationProviderError("INVALID_TEMPLATE", validation.error || "Invalid AiSensy payload.", 400, {
      requestId,
      campaign: payload.campaignName,
      destination: maskDestination(payload.destination),
    });
    logDeliveryFailure(error, { requestId, campaign: payload.campaignName, destination: maskDestination(payload.destination) });
    return { success: false, error: error.message, errorType: getValidationErrorType(validation.error), requestId };
  }

  try {
    const sent = await sendWithRetry({
      endpoint: config.endpoint,
      body: payload,
      requestId,
      timeoutMs: config.timeoutMs,
      retryCount: config.retryCount,
      retryDelayMs: config.retryDelayMs,
    });

    if (!sent.ok) {
      const errorMessage = sent.data?.error || sent.data?.message || "AiSensy request failed.";
      const errorType = getAiSensyErrorType(sent.status, sent.data);
      const error = new NotificationProviderError(getNotificationErrorCode(errorType), errorMessage, sent.status, {
        requestId,
        campaign: payload.campaignName,
        destination: maskDestination(payload.destination),
        status: sent.status,
      });
      logDeliveryFailure(error, { requestId, campaign: payload.campaignName, destination: maskDestination(payload.destination), httpCode: sent.status });
      return { success: false, error: error.message, errorType, requestId };
    }

    logDeliverySuccess({ requestId, campaign: payload.campaignName, destination: maskDestination(payload.destination), messageId: sent.data?.messageId || sent.data?.id, latencyMs: sent.latencyMs });
    return { success: true, messageId: sent.data?.messageId || sent.data?.id, requestId };
  } catch (error) {
    const providerError = error instanceof NotificationProviderError ? error : new NotificationProviderError("NETWORK_ERROR", error instanceof Error ? error.message : "Unknown network error.", 0, { requestId });
    logDeliveryFailure(providerError, { requestId, campaign: payload.campaignName, destination: maskDestination(payload.destination) });
    return { success: false, error: providerError.message, errorType: "NETWORK_ERROR", requestId };
  }
}

export async function sendWelcomeMessage(
  phone: string,
  requestContext?: { user?: unknown; registration?: unknown; auth?: unknown },
): Promise<WhatsAppMessageResult> {
  if (process.env.WHATSAPP_TEST_MODE === "true") {
    return { success: true, messageId: `test_welcome_${Date.now()}` };
  }

  const config = getConfig();
  if (!config.apiKey) {
    return { success: false, errorType: "CONFIG_ERROR" };
  }

  const destination = normalizePhoneNumber(phone);
  if (!destination) {
    return { success: false, errorType: "INVALID_DESTINATION" };
  }

  const userNameResolution = resolveAiSensyUserNameWithMetadata(requestContext?.user, requestContext?.registration, requestContext?.auth);
  const payload = {
    apiKey: config.apiKey,
    campaignName: process.env.AISENSY_WELCOME_CAMPAIGN_NAME || "welcome_millionflats",
    destination,
    userName: userNameResolution.value,
    source: config.source,
    templateParams: [],
    media: {},
    buttons: [],
    carouselCards: [],
    location: {},
    attributes: {},
    paramsFallbackValue: { FirstName: userNameResolution.value },
  };

  const validation = validateAiSensyPayload(payload, { expectedPlaceholderCount: 0 });
  if (!validation.valid) {
    return { success: false, error: validation.error, errorType: getValidationErrorType(validation.error) };
  }

  const sent = await sendWithRetry({ endpoint: config.endpoint, body: payload, requestId: crypto.randomUUID(), timeoutMs: config.timeoutMs, retryCount: config.retryCount, retryDelayMs: config.retryDelayMs });
  if (!sent.ok) {
    return { success: false, errorType: getAiSensyErrorType(sent.status, sent.data), error: sent.data?.error || sent.data?.message };
  }

  return { success: true, messageId: sent.data?.messageId || sent.data?.id };
}

export function verifyWebhookSignature(reqHeaders: Headers): boolean {
  const { webhookVerifyToken } = getConfig();
  if (!webhookVerifyToken) return true;

  const authHeader = reqHeaders.get("authorization") || reqHeaders.get("x-webhook-secret");
  return authHeader === webhookVerifyToken;
}

export { getConfig as getProviderConfig };

export function normalizePhoneNumber(phone: string): string {
  const digits = (phone || "").replace(/\D/g, "");
  if (!digits) return "";

  let normalized = digits;
  if (normalized.startsWith("00")) {
    normalized = normalized.slice(2);
  }

  if (normalized.startsWith("0") && normalized.length === 11) {
    normalized = normalized.slice(1);
  }

  if (normalized.length === 10) {
    normalized = `${INDIA_COUNTRY_CODE}${normalized}`;
  }

  if (normalized.length === 12 && normalized.startsWith(INDIA_COUNTRY_CODE)) {
    normalized = normalized;
  } else if (normalized.length > 10 && !normalized.startsWith(INDIA_COUNTRY_CODE)) {
    normalized = `${INDIA_COUNTRY_CODE}${normalized}`;
  }

  return normalized ? `+${normalized}` : "";
}

async function sendWithRetry(input: {
  endpoint: string;
  body: unknown;
  requestId: string;
  timeoutMs: number;
  retryCount: number;
  retryDelayMs: number;
}): Promise<{ ok: boolean; status: number; data: any; latencyMs?: number }> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= input.retryCount; attempt += 1) {
    try {
      const startedAt = Date.now();
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), input.timeoutMs);
      const response = await fetch(input.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": input.requestId,
          "X-Request-Id": input.requestId,
        },
        body: JSON.stringify(input.body),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      const data = await response.json().catch(() => ({}));
      const latencyMs = Date.now() - startedAt;
      if (response.ok || !isRetryableStatus(response.status) || attempt === input.retryCount) {
        return { ok: response.ok, status: response.status, data, latencyMs };
      }

      lastError = data;
      await delay(input.retryDelayMs * 2 ** (attempt - 1));
    } catch (error) {
      lastError = error;
      if (attempt === input.retryCount) break;
      await delay(input.retryDelayMs * 2 ** (attempt - 1));
    }
  }

  return { ok: false, status: 0, data: { error: lastError instanceof Error ? lastError.message : String(lastError) } };
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

function getNotificationErrorCode(errorType: AiSensyErrorType): NotificationErrorCode {
  return errorType === "INVALID_CAMPAIGN"
    ? "INVALID_CAMPAIGN"
    : errorType === "INVALID_DESTINATION"
      ? "INVALID_DESTINATION"
      : errorType === "INVALID_TEMPLATE"
        ? "INVALID_TEMPLATE"
        : errorType === "INVALID_API_KEY"
          ? "INVALID_API_KEY"
          : errorType === "INVALID_USERNAME"
            ? "INVALID_USERNAME"
            : errorType === "CONFIG_ERROR"
              ? "CONFIG_ERROR"
              : errorType === "NETWORK_ERROR"
                ? "NETWORK_ERROR"
                : "PROVIDER_ERROR";
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

function maskDestination(phone: string): string {
  if (!phone) return "";
  const digits = phone.replace(/\D/g, "");
  if (digits.length <= 4) return "***";
  return `***${digits.slice(-4)}`;
}

function normalizeAndValidateUserName(userName?: string | null): string | null {
  if (typeof userName !== "string") return null;
  const trimmed = userName.trim();
  if (!trimmed) return null;
  const collapsed = trimmed.replace(/\s+/g, " ");
  return isMeaningfulUserName(collapsed) ? collapsed : null;
}

export function resolveAiSensyUserName(user?: unknown, registration?: unknown, auth?: unknown): string {
  return resolveAiSensyUserNameWithMetadata(user, registration, auth).value;
}

function resolveAiSensyUserNameWithMetadata(user?: unknown, registration?: unknown, auth?: unknown): { value: string; source: string } {
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
    const resolved = resolveUserName(candidate as { name?: string | null; fullName?: string | null; firstName?: string | null });
    return normalizeAndValidateUserName(resolved || null);
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

function logDeliverySuccess(input: { requestId: string; campaign: string; destination: string; messageId?: string; latencyMs?: number }): void {
  console.info("[WhatsApp AiSensy] delivery_success", {
    requestId: input.requestId,
    campaign: input.campaign,
    destination: input.destination,
    messageId: input.messageId,
    latencyMs: input.latencyMs,
  });
}

function logDeliveryFailure(error: Error, input: { requestId: string; campaign?: string; destination?: string; httpCode?: number }): void {
  console.error("[WhatsApp AiSensy] delivery_failure", {
    requestId: input.requestId,
    campaign: input.campaign,
    destination: input.destination,
    httpCode: input.httpCode,
    error: error.message,
  });
}

function describeAiSensyPayload(payload: Record<string, unknown>, options?: { apiKey?: string }): Record<string, unknown> {
  const summary: Record<string, unknown> = {
    ...payload,
    apiKey: maskApiKey(options?.apiKey || ""),
  };

  if (typeof payload.userName === "string") {
    summary.userName = { present: true, value: payload.userName };
  }

  if (Array.isArray(payload.templateParams)) {
    summary.templateParams = payload.templateParams;
  }

  return summary;
}
