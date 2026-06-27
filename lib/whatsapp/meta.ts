import crypto from "crypto";
import type { MetaMessageResult } from "./types";

const META_API_BASE = "https://graph.facebook.com/v19.0";

function getConfig() {
  return {
    accessToken: process.env.META_WHATSAPP_ACCESS_TOKEN || "",
    phoneNumberId: process.env.META_WHATSAPP_PHONE_NUMBER_ID || "",
    appSecret: process.env.META_WHATSAPP_APP_SECRET || "",
    webhookVerifyToken: process.env.META_WHATSAPP_WEBHOOK_VERIFY_TOKEN || "",
  };
}

/** Sends a WhatsApp Authentication Template OTP to the buyer's phone */
export async function sendAuthenticationOtp(
  phone: string,
  otp: string,
): Promise<MetaMessageResult> {
  const { accessToken, phoneNumberId } = getConfig();

  if (!accessToken || !phoneNumberId) {
    console.error("[WhatsApp Meta] API not configured");
    return { success: false, error: "API_NOT_CONFIGURED" };
  }

  const cleanPhone = phone.replace(/[^0-9]/g, "");

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
          name:
            process.env.META_WHATSAPP_AUTH_TEMPLATE_NAME ||
            "mf_authentication_otp",
          language: { code: "en" },
          components: [
            {
              type: "body",
              parameters: [{ type: "text", text: otp }],
            },
            {
              type: "button",
              sub_type: "url",
              index: "0",
              parameters: [{ type: "text", text: otp }],
            },
          ],
        },
      }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errorMsg = (data as any)?.error?.message || "API_ERROR";
      console.error("[WhatsApp Meta] Send OTP failed:", errorMsg);
      return { success: false, error: errorMsg };
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
