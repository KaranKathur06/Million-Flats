import crypto from "crypto";
import type { MetaMessageResult } from "./types";

const DEFAULT_META_GRAPH_VERSION = "v23.0";
const DEFAULT_AUTH_TEMPLATE_NAME = "login_millionflats";
const DEFAULT_AUTH_TEMPLATE_LANGUAGE = "en_US";

type WhatsAppTemplateButtonType = "copy_code" | "url";
type TemplateParameter =
  | { type: "text"; text: string }
  | { type: "coupon_code"; coupon_code: string };
type TemplateComponent = {
  type: "body" | "button";
  sub_type?: "copy_code" | "url";
  index?: string;
  parameters: TemplateParameter[];
};

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
 * Sends a WhatsApp Authentication Template OTP.
 *
 * Set WHATSAPP_TEST_MODE=true in .env to bypass Meta API entirely. Never use
 * this in production.
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
  const { accessToken, phoneNumberId } = getConfig();

  if (!accessToken || !phoneNumberId) {
    console.error("[WhatsApp Meta] Missing credentials", {
      requestId,
      hasAccessToken: Boolean(accessToken),
      hasPhoneNumberId: Boolean(phoneNumberId),
    });
    return { success: false, error: "API_NOT_CONFIGURED", requestId };
  }

  const cleanPhone = phone.replace(/[^0-9]/g, "");
  const graphVersion = normalizeGraphVersion(
    process.env.META_WHATSAPP_GRAPH_VERSION,
  );
  const endpoint = `https://graph.facebook.com/${graphVersion}/${phoneNumberId}/messages`;
  const templateName = (
    process.env.META_WHATSAPP_AUTH_TEMPLATE_NAME || DEFAULT_AUTH_TEMPLATE_NAME
  ).trim();
  const templateLanguage = (
    process.env.META_WHATSAPP_TEMPLATE_LANGUAGE ||
    DEFAULT_AUTH_TEMPLATE_LANGUAGE
  ).trim();
  const buttonType = normalizeAuthButtonType(process.env.META_WHATSAPP_BUTTON_TYPE);

  const payload = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: cleanPhone,
    type: "template",
    template: {
      name: templateName,
      language: { code: templateLanguage },
      components: [
        {
          type: "body",
          parameters: [{ type: "text", text: otp }],
        },
        buildAuthenticationButtonComponent(buttonType, otp),
      ] satisfies TemplateComponent[],
    },
  };

  logMetaEvent("send_authentication_otp.request", {
    requestId,
    endpoint,
    graphVersion,
    phoneNumberId,
    templateName,
    templateLanguage,
    buttonType,
    payload: redactWhatsAppPayload(payload),
  });

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => ({}));
    const errorCode: number | undefined = (data as any)?.error?.code;
    const errorSubcode: number | undefined = (data as any)?.error?.error_subcode;
    const fbTraceId: string | undefined = (data as any)?.error?.fbtrace_id;

    if (!response.ok) {
      const errorMsg: string = (data as any)?.error?.message || "API_ERROR";
      const hint = metaErrorHint(errorCode);

      console.error("[WhatsApp Meta] Send OTP failed", {
        requestId,
        httpStatus: response.status,
        endpoint,
        graphVersion,
        phoneNumberId,
        templateName,
        templateLanguage,
        buttonType,
        errorCode,
        errorSubcode,
        errorMsg,
        fbTraceId,
        hint,
        payload: redactWhatsAppPayload(payload),
        response: data,
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
      httpStatus: response.status,
      graphVersion,
      phoneNumberId,
      templateName,
      templateLanguage,
      buttonType,
      messageId: (data as any)?.messages?.[0]?.id,
      response: data,
    });

    return {
      success: true,
      messageId: (data as any)?.messages?.[0]?.id,
      requestId,
    };
  } catch (err) {
    console.error("[WhatsApp Meta] Network error", {
      requestId,
      endpoint,
      graphVersion,
      phoneNumberId,
      templateName,
      templateLanguage,
      buttonType,
      payload: redactWhatsAppPayload(payload),
      error: err,
    });
    return { success: false, error: "NETWORK_ERROR", requestId };
  }
}

/** Sends the one-time welcome message after successful first login */
export async function sendWelcomeMessage(
  phone: string,
): Promise<MetaMessageResult> {
  if (process.env.WHATSAPP_TEST_MODE === "true") {
    console.log(`[WhatsApp TEST MODE] Welcome message skipped for ${phone}`);
    return { success: true, messageId: `test_welcome_${Date.now()}` };
  }

  const { accessToken, phoneNumberId } = getConfig();
  if (!accessToken || !phoneNumberId)
    return { success: false, error: "API_NOT_CONFIGURED" };

  const cleanPhone = phone.replace(/[^0-9]/g, "");
  const graphVersion = normalizeGraphVersion(
    process.env.META_WHATSAPP_GRAPH_VERSION,
  );
  const welcomeText = `Access Activated.\n\nWelcome to MillionFlats.\n\nYour account has been verified.\n\nYou have unlocked unrestricted access to our institutional-grade real estate ecosystem.\n\nYou will receive priority, off-market briefings on premium global assets.\n\nTo pause alerts at any time, simply reply STOP.`;

  try {
    const response = await fetch(
      `https://graph.facebook.com/${graphVersion}/${phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
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

function metaErrorHint(code?: number): string {
  if (!code) return "";
  const hints: Record<number, string> = {
    132001:
      "Template translation not found. Check template name, exact language code, WABA ownership, and approval propagation.",
    131030:
      "Template not found or not approved. Check META_WHATSAPP_AUTH_TEMPLATE_NAME.",
    131031: "Template paused or disabled in Meta Business Manager.",
    131047: "Re-engagement window; 24h session expired for this number.",
    131051: "Unsupported message type.",
    190: "Access token expired or invalid. Regenerate META_WHATSAPP_ACCESS_TOKEN.",
    100: "Invalid parameter; check phone number format or phone number ID.",
    200: "WhatsApp Business Account permission issue.",
  };
  return hints[code] ?? `Unknown error code ${code}`;
}

function normalizeGraphVersion(version?: string): string {
  const value = (version || DEFAULT_META_GRAPH_VERSION).trim();
  return /^v\d+\.\d+$/.test(value) ? value : DEFAULT_META_GRAPH_VERSION;
}

function normalizeAuthButtonType(value?: string): WhatsAppTemplateButtonType {
  const normalized = (value || "copy_code").trim().toLowerCase();
  return normalized === "url" ? "url" : "copy_code";
}

function buildAuthenticationButtonComponent(
  buttonType: WhatsAppTemplateButtonType,
  otp: string,
): TemplateComponent {
  if (buttonType === "url") {
    return {
      type: "button",
      sub_type: "url",
      index: "0",
      parameters: [{ type: "text", text: otp }],
    };
  }

  return {
    type: "button",
    sub_type: "copy_code",
    index: "0",
    parameters: [{ type: "coupon_code", coupon_code: otp }],
  };
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
