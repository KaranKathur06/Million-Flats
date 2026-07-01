import crypto from "crypto";
import type { MetaMessageResult } from "./types";

const META_API_BASE = "https://graph.facebook.com/v19.0";

function getConfig() {
  // .trim() is critical — env vars with leading/trailing spaces produce malformed
  // Authorization headers (e.g. "Bearer  EAAV...") that Meta's API rejects with 401,
  // which the init route surfaces as a 503 to the client.
  const accessToken = (process.env.META_WHATSAPP_ACCESS_TOKEN || "").trim();
  const phoneNumberId = (process.env.META_WHATSAPP_PHONE_NUMBER_ID || "").trim();
  const appSecret = (process.env.META_WHATSAPP_APP_SECRET || "").trim();
  const webhookVerifyToken = (process.env.META_WHATSAPP_WEBHOOK_VERIFY_TOKEN || "").trim();

  // Log config validation once in non-production so developers catch missing vars fast
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
 * Set WHATSAPP_TEST_MODE=true in .env to bypass Meta API entirely —
 * the OTP will be printed to the server console instead of delivered.
 * Never use this in production.
 */
export async function sendAuthenticationOtp(
  phone: string,
  otp: string,
): Promise<MetaMessageResult> {
  // ── Test / development bypass ─────────────────────────────────────────────
  if (process.env.WHATSAPP_TEST_MODE === "true") {
    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("  [WhatsApp TEST MODE] OTP not sent via Meta API");
    console.log(`  Phone : ${phone}`);
    console.log(`  OTP   : ${otp}`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
    return { success: true, messageId: `test_${Date.now()}` };
  }

  // ── Config validation ─────────────────────────────────────────────────────
  const { accessToken, phoneNumberId } = getConfig();
  if (!accessToken || !phoneNumberId) {
    console.error(
      "[WhatsApp Meta] Missing credentials. Set META_WHATSAPP_ACCESS_TOKEN and META_WHATSAPP_PHONE_NUMBER_ID.",
    );
    return { success: false, error: "API_NOT_CONFIGURED" };
  }

  const cleanPhone = phone.replace(/[^0-9]/g, "");

  // Template name — set META_WHATSAPP_AUTH_TEMPLATE_NAME in env vars
  const templateName =
    process.env.META_WHATSAPP_AUTH_TEMPLATE_NAME || "login_millionflats";

  // Button type — set META_WHATSAPP_BUTTON_TYPE=copy_code OR url
  // Meta's newer auth templates use "copy_code"; older ones use "url"
  const buttonType = (
    process.env.META_WHATSAPP_BUTTON_TYPE || "copy_code"
  ).toLowerCase();

  const buttonComponent =
    buttonType === "url"
      ? {
          type: "button",
          sub_type: "url",
          index: "0",
          parameters: [{ type: "text", text: otp }],
        }
      : {
          type: "button",
          sub_type: "COPY_CODE",
          index: "0",
          parameters: [{ type: "coupon_code", coupon_code: otp }],
        };

  try {
    const response = await fetch(`${META_API_BASE}/${phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: cleanPhone,
        type: "template",
        template: {
          name: templateName,
          language: { code: "en" },
          components: [
            {
              type: "body",
              parameters: [{ type: "text", text: otp }],
            },
            buttonComponent,
          ],
        },
      }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errorCode: number | undefined = (data as any)?.error?.code;
      const errorMsg: string = (data as any)?.error?.message || "API_ERROR";
      const errorSubcode: number | undefined = (data as any)?.error
        ?.error_subcode;
      const fbTraceId: string | undefined = (data as any)?.error?.fbtrace_id;

      // Human-readable hint for the most common Meta error codes
      const hint = metaErrorHint(errorCode);

      console.error("[WhatsApp Meta] Send OTP failed:", {
        errorCode,
        errorSubcode,
        errorMsg,
        fbTraceId,
        hint,
        phone: cleanPhone,
      });

      return { success: false, error: errorMsg, errorCode };
    }

    return { success: true, messageId: (data as any)?.messages?.[0]?.id };
  } catch (err) {
    console.error("[WhatsApp Meta] Network error:", err);
    return { success: false, error: "NETWORK_ERROR" };
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
  const welcomeText = `🔒 Access Activated.\n\nWelcome to MillionFlats.\n\nYour account has been verified.\n\nYou have unlocked unrestricted access to our institutional-grade real estate ecosystem.\n\nYou will receive priority, off-market briefings on premium global assets.\n\nTo pause alerts at any time, simply reply STOP.`;

  try {
    const response = await fetch(`${META_API_BASE}/${phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: cleanPhone,
        type: "text",
        text: { body: welcomeText },
      }),
    });

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

// ── Internal helpers ──────────────────────────────────────────────────────────

function metaErrorHint(code?: number): string {
  if (!code) return "";
  const hints: Record<number, string> = {
    131030:
      "Template not found or not approved. Check META_WHATSAPP_AUTH_TEMPLATE_NAME.",
    131031: "Template paused or disabled in Meta Business Manager.",
    131047: "Re-engagement window — 24h session expired for this number.",
    131051: "Unsupported message type.",
    190: "Access token expired or invalid. Regenerate META_WHATSAPP_ACCESS_TOKEN.",
    100: "Invalid parameter — check phone number format or phone number ID.",
    200: "WhatsApp Business Account permission issue.",
  };
  return hints[code] ?? `Unknown error code ${code}`;
}
