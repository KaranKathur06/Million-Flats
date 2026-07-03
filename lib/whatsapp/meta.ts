import crypto from "crypto";
import type { MetaMessageResult } from "./types";

const DEFAULT_META_GRAPH_VERSION = "v23.0";
const DEFAULT_AUTH_TEMPLATE_NAME = "login_millionflats";
const DEFAULT_AUTH_TEMPLATE_LANGUAGE = "en_US";
const DEFAULT_OTP_CONTEXT = "MillionFlats login";
const DEFAULT_SUPPORT_CONTACT = "1800-555-1234";
const TEMPLATE_CACHE_TTL_MS = 5 * 60 * 1000;

type WhatsAppTemplateButtonType = "url" | "copy_code";
type TemplateParameter =
  | { type: "text"; text: string }
  | { type: "coupon_code"; coupon_code: string };
type TemplateComponent = {
  type: "body" | "button";
  sub_type?: WhatsAppTemplateButtonType;
  index?: string;
  parameters: TemplateParameter[];
};
type TemplatePayload = {
  messaging_product: "whatsapp";
  recipient_type: "individual";
  to: string;
  type: "template";
  template: {
    name: string;
    language: { code: string };
    components: TemplateComponent[];
  };
};
type GraphTemplateComponent = {
  type?: string;
  text?: string;
  buttons?: Array<{
    type?: string;
    text?: string;
    url?: string;
    otp_type?: string;
  }>;
};
type GraphTemplate = {
  id?: string;
  name: string;
  status: string;
  language: string;
  category: string;
  sub_category?: string;
  components?: GraphTemplateComponent[];
};
type TemplateRegistryEntry = {
  template: GraphTemplate;
  wabaId: string;
  fetchedAt: number;
};
type MetaConfig = ReturnType<typeof getConfig>;
type GraphError = {
  message?: string;
  code?: number;
  error_subcode?: number;
  fbtrace_id?: string;
};

const templateCache = new Map<string, TemplateRegistryEntry>();

function getConfig() {
  const accessToken = (process.env.META_WHATSAPP_ACCESS_TOKEN || "").trim();
  const phoneNumberId = (process.env.META_WHATSAPP_PHONE_NUMBER_ID || "").trim();
  const appSecret = (process.env.META_WHATSAPP_APP_SECRET || "").trim();
  const webhookVerifyToken = (
    process.env.META_WHATSAPP_WEBHOOK_VERIFY_TOKEN || ""
  ).trim();

  if (process.env.NODE_ENV !== "production" && !accessToken) {
    console.warn("[WhatsApp Meta] META_WHATSAPP_ACCESS_TOKEN is not set or empty.");
  }
  if (process.env.NODE_ENV !== "production" && !phoneNumberId) {
    console.warn("[WhatsApp Meta] META_WHATSAPP_PHONE_NUMBER_ID is not set or empty.");
  }

  return { accessToken, phoneNumberId, appSecret, webhookVerifyToken };
}

/**
 * Sends the login OTP using the login_millionflats Authentication template.
 *
 * Verified template shape:
 * BODY: {{1}}, {{2}}, {{3}}
 * URL button: https://www.whatsapp.com/otp/code/?...&code=otp{{1}}
 */
export async function sendAuthenticationOtp(
  phone: string,
  otp: string,
): Promise<MetaMessageResult> {
  if (process.env.WHATSAPP_TEST_MODE === "true") {
    console.log("[WhatsApp TEST MODE] OTP not sent via Meta API", {
      phone: maskPhone(phone.replace(/[^0-9]/g, "")),
      otp: maskOtp(otp),
    });
    return { success: true, messageId: `test_${Date.now()}` };
  }

  const requestId = crypto.randomUUID();
  const config = getConfig();
  const graphVersion = normalizeGraphVersion(
    process.env.META_WHATSAPP_GRAPH_VERSION,
  );
  const templateName = (
    process.env.META_WHATSAPP_AUTH_TEMPLATE_NAME || DEFAULT_AUTH_TEMPLATE_NAME
  ).trim();
  const templateLanguage = (
    process.env.META_WHATSAPP_TEMPLATE_LANGUAGE ||
    DEFAULT_AUTH_TEMPLATE_LANGUAGE
  ).trim();

  if (!config.accessToken || !config.phoneNumberId) {
    console.error("[WhatsApp Meta] Missing credentials", {
      requestId,
      hasAccessToken: Boolean(config.accessToken),
      hasPhoneNumberId: Boolean(config.phoneNumberId),
    });
    return { success: false, error: "API_NOT_CONFIGURED", requestId };
  }

  const cleanPhone = phone.replace(/[^0-9]/g, "");
  const endpoint = graphEndpoint(
    graphVersion,
    `${config.phoneNumberId}/messages`,
  );
  const payload = buildAuthenticationOtpPayload({
    to: cleanPhone,
    otp,
    templateName,
    templateLanguage,
  });

  const validation = await validateAuthenticationTemplate({
    requestId,
    config,
    graphVersion,
    templateName,
    templateLanguage,
    payload,
  });

  if (!validation.ok) {
    console.error("[WhatsApp Meta] Template validation failed", validation.log);
    return {
      success: false,
      error: validation.error,
      errorCode: validation.errorCode,
      errorSubcode: validation.errorSubcode,
      fbTraceId: validation.fbTraceId,
      requestId,
    };
  }

  logMetaEvent("send_authentication_otp.request", {
    requestId,
    endpoint,
    graphVersion,
    phoneNumberId: config.phoneNumberId,
    wabaId: validation.wabaId,
    templateName,
    templateLanguage,
    bodyParameterCount: getBodyParameterCount(payload),
    buttonParameterCount: getButtonParameterCount(payload),
    payload: redactWhatsAppPayload(payload),
  });

  const sent = await graphRequestWithRetry({
    endpoint,
    token: config.accessToken,
    method: "POST",
    body: payload,
  });

  if (!sent.ok) {
    const graphError = sent.data?.error as GraphError | undefined;
    const errorCode = graphError?.code;
    const errorSubcode = graphError?.error_subcode;
    const fbTraceId = graphError?.fbtrace_id;
    const errorMsg = graphError?.message || "API_ERROR";

    console.error("[WhatsApp Meta] Send OTP failed", {
      requestId,
      httpStatus: sent.status,
      endpoint,
      graphVersion,
      phoneNumberId: config.phoneNumberId,
      wabaId: validation.wabaId,
      templateName,
      templateLanguage,
      errorCode,
      errorSubcode,
      errorMsg,
      fbTraceId,
      hint: metaErrorHint(errorCode),
      payload: redactWhatsAppPayload(payload),
      response: sent.data,
    });

    return {
      success: false,
      error: errorMsg,
      errorCode,
      errorSubcode,
      fbTraceId,
      requestId,
    };
  }

  logMetaEvent("send_authentication_otp.response", {
    requestId,
    httpStatus: sent.status,
    graphVersion,
    phoneNumberId: config.phoneNumberId,
    wabaId: validation.wabaId,
    templateName,
    templateLanguage,
    messageId: sent.data?.messages?.[0]?.id,
    response: sent.data,
  });

  return {
    success: true,
    messageId: sent.data?.messages?.[0]?.id,
    requestId,
  };
}

/** Sends the one-time welcome message after successful first login */
export async function sendWelcomeMessage(
  phone: string,
): Promise<MetaMessageResult> {
  if (process.env.WHATSAPP_TEST_MODE === "true") {
    console.log(`[WhatsApp TEST MODE] Welcome message skipped for ${phone}`);
    return { success: true, messageId: `test_welcome_${Date.now()}` };
  }

  const config = getConfig();
  if (!config.accessToken || !config.phoneNumberId)
    return { success: false, error: "API_NOT_CONFIGURED" };

  const cleanPhone = phone.replace(/[^0-9]/g, "");
  const graphVersion = normalizeGraphVersion(
    process.env.META_WHATSAPP_GRAPH_VERSION,
  );
  const welcomeText = `Access Activated.\n\nWelcome to MillionFlats.\n\nYour account has been verified.\n\nYou have unlocked unrestricted access to our institutional-grade real estate ecosystem.\n\nYou will receive priority, off-market briefings on premium global assets.\n\nTo pause alerts at any time, simply reply STOP.`;

  try {
    const response = await fetch(
      graphEndpoint(graphVersion, `${config.phoneNumberId}/messages`),
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: cleanPhone,
          type: "text",
          text: { body: welcomeText },
        }),
      },
    );

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return { success: false, error: (data as any)?.error?.message };
    }
    return { success: true, messageId: (data as any)?.messages?.[0]?.id };
  } catch {
    return { success: false, error: "NETWORK_ERROR" };
  }
}

/** Verifies a webhook POST signature from Meta */
export function verifyWebhookSignature(
  rawBody: string,
  signature: string,
): boolean {
  const { appSecret } = getConfig();
  if (!appSecret) return false;

  const expected = `sha256=${crypto
    .createHmac("sha256", appSecret)
    .update(rawBody, "utf8")
    .digest("hex")}`;

  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expected),
    );
  } catch {
    return false;
  }
}

export { getConfig as getMetaConfig };

function buildAuthenticationOtpPayload(input: {
  to: string;
  otp: string;
  templateName: string;
  templateLanguage: string;
}): TemplatePayload {
  const context = (
    process.env.META_WHATSAPP_OTP_CONTEXT || DEFAULT_OTP_CONTEXT
  ).trim();
  const supportContact = (
    process.env.META_WHATSAPP_SUPPORT_CONTACT || DEFAULT_SUPPORT_CONTACT
  ).trim();

  return {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: input.to,
    type: "template",
    template: {
      name: input.templateName,
      language: { code: input.templateLanguage },
      components: [
        {
          type: "body",
          parameters: [
            { type: "text", text: input.otp },
            { type: "text", text: context },
            { type: "text", text: supportContact },
          ],
        },
        {
          type: "button",
          sub_type: "url",
          index: "0",
          parameters: [{ type: "text", text: input.otp }],
        },
      ],
    },
  };
}

async function validateAuthenticationTemplate(input: {
  requestId: string;
  config: MetaConfig;
  graphVersion: string;
  templateName: string;
  templateLanguage: string;
  payload: TemplatePayload;
}): Promise<
  | { ok: true; wabaId: string }
  | {
      ok: false;
      error: string;
      errorCode?: number;
      errorSubcode?: number;
      fbTraceId?: string;
      log: Record<string, unknown>;
    }
> {
  const templateResult = await getTemplateFromRegistry(input);

  if (!templateResult.ok) {
    const graphError = templateResult.data?.error as GraphError | undefined;
    return {
      ok: false,
      error: graphError?.message || templateResult.error,
      errorCode: graphError?.code,
      errorSubcode: graphError?.error_subcode,
      fbTraceId: graphError?.fbtrace_id,
      log: {
        requestId: input.requestId,
        graphVersion: input.graphVersion,
        phoneNumberId: input.config.phoneNumberId,
        templateName: input.templateName,
        templateLanguage: input.templateLanguage,
        error: templateResult.error,
        response: templateResult.data,
      },
    };
  }

  const { template, wabaId } = templateResult;
  const templateBodyCount = getTemplateBodyVariableCount(template);
  const payloadBodyCount = getBodyParameterCount(input.payload);
  const templateButton = getFirstTemplateButton(template);
  const templateButtonUrlCount = countTemplateVariables(templateButton?.url || "");
  const payloadButtonCount = getButtonParameterCount(input.payload);
  const templateButtonType = (templateButton?.type || "").toLowerCase();
  const payloadButtonType = getPayloadButtonSubtype(input.payload);
  const errors: string[] = [];

  if (template.status !== "APPROVED") {
    errors.push(`Template status is ${template.status}, expected APPROVED.`);
  }
  if (template.language !== input.templateLanguage) {
    errors.push(
      `Template locale is ${template.language}, payload locale is ${input.templateLanguage}.`,
    );
  }
  if (template.category !== "AUTHENTICATION") {
    errors.push(`Template category is ${template.category}, expected AUTHENTICATION.`);
  }
  if (templateBodyCount !== payloadBodyCount) {
    errors.push(
      `Template body expects ${templateBodyCount} parameters, payload sends ${payloadBodyCount}.`,
    );
  }
  if (templateButtonType === "url" && payloadButtonType !== "url") {
    errors.push(`Template button is URL, payload button is ${payloadButtonType}.`);
  }
  if (templateButtonUrlCount !== payloadButtonCount) {
    errors.push(
      `Template button expects ${templateButtonUrlCount} parameters, payload sends ${payloadButtonCount}.`,
    );
  }

  if (errors.length > 0) {
    return {
      ok: false,
      error: `TEMPLATE_VALIDATION_FAILED: ${errors.join(" ")}`,
      log: {
        requestId: input.requestId,
        graphVersion: input.graphVersion,
        phoneNumberId: input.config.phoneNumberId,
        wabaId,
        templateName: input.templateName,
        templateLanguage: input.templateLanguage,
        templateStatus: template.status,
        templateCategory: template.category,
        templateBodyCount,
        payloadBodyCount,
        templateButtonType,
        payloadButtonType,
        templateButtonUrlCount,
        payloadButtonCount,
        errors,
        payload: redactWhatsAppPayload(input.payload),
      },
    };
  }

  return { ok: true, wabaId };
}

async function getTemplateFromRegistry(input: {
  config: MetaConfig;
  graphVersion: string;
  templateName: string;
  templateLanguage: string;
}): Promise<
  | { ok: true; template: GraphTemplate; wabaId: string }
  | { ok: false; error: string; data?: any }
> {
  const cacheKey = [
    input.graphVersion,
    input.config.phoneNumberId,
    input.templateName,
    input.templateLanguage,
  ].join(":");
  const cached = templateCache.get(cacheKey);

  if (cached && Date.now() - cached.fetchedAt < TEMPLATE_CACHE_TTL_MS) {
    return { ok: true, template: cached.template, wabaId: cached.wabaId };
  }

  const phoneLookup = await graphRequestWithRetry({
    endpoint: graphEndpoint(
      input.graphVersion,
      `${input.config.phoneNumberId}?fields=whatsapp_business_account`,
    ),
    token: input.config.accessToken,
    method: "GET",
  });

  if (!phoneLookup.ok) {
    return {
      ok: false,
      error: "PHONE_NUMBER_LOOKUP_FAILED",
      data: phoneLookup.data,
    };
  }

  const wabaId = phoneLookup.data?.whatsapp_business_account?.id;
  if (!wabaId) {
    return {
      ok: false,
      error: "WABA_ID_NOT_FOUND_FOR_PHONE_NUMBER",
      data: phoneLookup.data,
    };
  }

  const templateLookup = await graphRequestWithRetry({
    endpoint: graphEndpoint(
      input.graphVersion,
      `${wabaId}/message_templates?name=${encodeURIComponent(
        input.templateName,
      )}&fields=name,status,language,category,sub_category,components`,
    ),
    token: input.config.accessToken,
    method: "GET",
  });

  if (!templateLookup.ok) {
    return {
      ok: false,
      error: "TEMPLATE_LOOKUP_FAILED",
      data: templateLookup.data,
    };
  }

  const template = (templateLookup.data?.data || []).find(
    (item: GraphTemplate) =>
      item.name === input.templateName && item.language === input.templateLanguage,
  ) as GraphTemplate | undefined;

  if (!template) {
    return {
      ok: false,
      error: "TEMPLATE_TRANSLATION_NOT_FOUND",
      data: templateLookup.data,
    };
  }

  templateCache.set(cacheKey, {
    template,
    wabaId,
    fetchedAt: Date.now(),
  });

  return { ok: true, template, wabaId };
}

async function graphRequestWithRetry(input: {
  endpoint: string;
  token: string;
  method: "GET" | "POST";
  body?: unknown;
}): Promise<{ ok: boolean; status: number; data: any }> {
  const maxAttempts = 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const response = await fetch(input.endpoint, {
        method: input.method,
        headers: {
          Authorization: `Bearer ${input.token}`,
          "Content-Type": "application/json",
        },
        body: input.body ? JSON.stringify(input.body) : undefined,
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
          data: { error: { message: String(err) } },
        };
      }

      await delay(200 * 2 ** (attempt - 1));
    }
  }

  return { ok: false, status: 0, data: { error: { message: "UNKNOWN_ERROR" } } };
}

function metaErrorHint(code?: number): string {
  if (!code) return "";
  const hints: Record<number, string> = {
    132001:
      "Template translation not found. Check exact name, en_US locale, WABA ownership, and approval propagation.",
    131030:
      "Template not found or not approved. Check META_WHATSAPP_AUTH_TEMPLATE_NAME.",
    131031: "Template paused or disabled in Meta Business Manager.",
    131047: "Re-engagement window; 24h session expired for this number.",
    131051: "Unsupported message type.",
    190: "Access token expired or invalid. Regenerate META_WHATSAPP_ACCESS_TOKEN.",
    100: "Invalid parameter; check component count, parameter types, or phone number ID.",
    200: "WhatsApp Business Account permission issue.",
  };
  return hints[code] ?? `Unknown error code ${code}`;
}

function normalizeGraphVersion(version?: string): string {
  const value = (version || DEFAULT_META_GRAPH_VERSION).trim();
  return /^v\d+\.\d+$/.test(value) ? value : DEFAULT_META_GRAPH_VERSION;
}

function graphEndpoint(version: string, path: string): string {
  return `https://graph.facebook.com/${version}/${path}`;
}

function isRetryableStatus(status: number): boolean {
  return status === 429 || status >= 500;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getBodyParameterCount(payload: TemplatePayload): number {
  return (
    payload.template.components.find((component) => component.type === "body")
      ?.parameters.length || 0
  );
}

function getButtonParameterCount(payload: TemplatePayload): number {
  return (
    payload.template.components.find((component) => component.type === "button")
      ?.parameters.length || 0
  );
}

function getPayloadButtonSubtype(payload: TemplatePayload): string {
  return (
    payload.template.components.find((component) => component.type === "button")
      ?.sub_type || ""
  );
}

function getTemplateBodyVariableCount(template: GraphTemplate): number {
  const body = template.components?.find(
    (component) => (component.type || "").toLowerCase() === "body",
  );
  return countTemplateVariables(body?.text || "");
}

function getFirstTemplateButton(template: GraphTemplate) {
  const buttons = template.components?.find(
    (component) => (component.type || "").toLowerCase() === "buttons",
  );
  return buttons?.buttons?.[0];
}

function countTemplateVariables(value: string): number {
  const matches = value.match(/{{\d+}}/g) || [];
  return new Set(matches).size;
}

function redactWhatsAppPayload<T>(payload: T): T {
  return JSON.parse(
    JSON.stringify(payload, (_key, value) => {
      if (typeof value !== "string") return value;
      if (/^\d{6}$/.test(value)) return maskOtp(value);
      if (/^\d{7,15}$/.test(value)) return maskPhone(value);
      return value;
    }),
  ) as T;
}

function maskOtp(value: string): string {
  if (value.length <= 2) return "***";
  return `${value.slice(0, 1)}****${value.slice(-1)}`;
}

function maskPhone(value: string): string {
  const digits = value.replace(/[^0-9]/g, "");
  if (digits.length <= 6) return "***";
  return `${digits.slice(0, 3)}***${digits.slice(-4)}`;
}

function logMetaEvent(event: string, data: Record<string, unknown>): void {
  console.info(`[WhatsApp Meta] ${event}`, data);
}
