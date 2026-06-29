/**
 * WhatsApp Configuration Diagnostic Endpoint
 *
 * GET /api/auth/whatsapp/debug-config
 *
 * This endpoint is ONLY accessible in non-production environments.
 * It checks your Meta credentials and returns the exact error so you can
 * fix the configuration without guessing.
 *
 * In production this returns 404. Delete this file once config is confirmed.
 */
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  // Hard block in production
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const accessToken = process.env.META_WHATSAPP_ACCESS_TOKEN || "";
  const phoneNumberId = process.env.META_WHATSAPP_PHONE_NUMBER_ID || "";
  const templateName =
    process.env.META_WHATSAPP_AUTH_TEMPLATE_NAME || "login_millionflats";
  const buttonType = process.env.META_WHATSAPP_BUTTON_TYPE || "copy_code";
  const testMode = process.env.WHATSAPP_TEST_MODE || "false";

  const checks: Record<string, string> = {
    META_WHATSAPP_ACCESS_TOKEN: accessToken
      ? `✅ Set (${accessToken.slice(0, 8)}…)`
      : "❌ MISSING",
    META_WHATSAPP_PHONE_NUMBER_ID: phoneNumberId
      ? `✅ Set (${phoneNumberId})`
      : "❌ MISSING",
    META_WHATSAPP_AUTH_TEMPLATE_NAME: `✅ "${templateName}"`,
    META_WHATSAPP_BUTTON_TYPE: `✅ "${buttonType}"`,
    WHATSAPP_TEST_MODE: testMode === "true" ? "✅ ENABLED (bypass active)" : "⬜ Off",
  };

  if (!accessToken || !phoneNumberId) {
    return NextResponse.json(
      {
        status: "CONFIGURATION_INCOMPLETE",
        checks,
        fix: "Set META_WHATSAPP_ACCESS_TOKEN and META_WHATSAPP_PHONE_NUMBER_ID in your environment variables.",
      },
      { status: 200 },
    );
  }

  // ── Live credential check: GET phone number info from Meta ───────────────
  // This is a read-only call — no message is sent, no cost incurred.
  let metaPhoneCheck: Record<string, unknown> = {};
  try {
    const phoneRes = await fetch(
      `https://graph.facebook.com/v19.0/${phoneNumberId}?fields=display_phone_number,verified_name,quality_rating,platform_type`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );
    const phoneData = await phoneRes.json().catch(() => ({}));
    metaPhoneCheck = {
      httpStatus: phoneRes.status,
      ok: phoneRes.ok,
      data: phoneData,
    };
  } catch (err) {
    metaPhoneCheck = { error: String(err) };
  }

  // ── Template existence check ─────────────────────────────────────────────
  // Extract the WABA ID from the token to list templates
  let templateCheck: Record<string, unknown> = {};
  try {
    // First get the WABA ID via the phone number endpoint
    const wabaRes = await fetch(
      `https://graph.facebook.com/v19.0/${phoneNumberId}?fields=account_mode`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    const wabaData = (await wabaRes.json().catch(() => ({}))) as any;

    templateCheck = {
      note: "Template list requires WABA ID — check Meta Business Manager directly.",
      templateName,
      buttonType,
      phoneEndpointStatus: wabaRes.status,
    };
  } catch (err) {
    templateCheck = { error: String(err) };
  }

  // ── Interpret the phone check result ────────────────────────────────────
  const metaData = metaPhoneCheck.data as any;
  let diagnosis = "UNKNOWN";
  let fix = "";

  if ((metaPhoneCheck as any).ok) {
    diagnosis = "CREDENTIALS_OK";
    fix =
      "Access token and Phone Number ID are valid. If OTP still fails, the template may not be approved or the button type is wrong.";
  } else {
    const errorCode = metaData?.error?.code;
    const errorMsg = metaData?.error?.message || "Unknown error";

    if (errorCode === 190) {
      diagnosis = "TOKEN_EXPIRED";
      fix =
        "Your META_WHATSAPP_ACCESS_TOKEN has expired. Go to Meta Developer Console → WhatsApp → API Setup and generate a new Permanent System User Token.";
    } else if (errorCode === 100) {
      diagnosis = "INVALID_PHONE_NUMBER_ID";
      fix =
        "META_WHATSAPP_PHONE_NUMBER_ID is wrong. Go to Meta Developer Console → WhatsApp → API Setup and copy the exact Phone Number ID (it's a long number like 123456789012345).";
    } else if (errorCode === 200 || errorCode === 10) {
      diagnosis = "PERMISSION_DENIED";
      fix =
        "The access token doesn't have whatsapp_business_messaging permission. Check your app permissions in Meta Developer Console.";
    } else {
      diagnosis = `META_ERROR_${errorCode}`;
      fix = errorMsg;
    }
  }

  return NextResponse.json(
    {
      status: diagnosis,
      fix,
      checks,
      metaPhoneCheck,
      templateCheck,
    },
    { status: 200 },
  );
}
