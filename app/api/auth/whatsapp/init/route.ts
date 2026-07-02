import { NextRequest, NextResponse } from "next/server";
import {
  createAuthSession,
  createOtp,
  sendAuthenticationOtp,
  markOtpSent,
  markFailed,
  checkSessionInitRateLimit,
  checkOtpRateLimit,
  logWhatsAppEvent,
} from "@/lib/whatsapp";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { phone } = body as { phone?: string };

    if (!phone || typeof phone !== "string") {
      return NextResponse.json(
        { message: "Phone number is required." },
        { status: 400 },
      );
    }

    const cleanPhone = phone.replace(/\s/g, "");
    if (!/^\+[1-9]\d{6,14}$/.test(cleanPhone)) {
      return NextResponse.json(
        {
          message:
            "Invalid phone number. Please use international format (e.g. +971501234567).",
        },
        { status: 400 },
      );
    }

    const ipAddress =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "unknown";
    const userAgent = req.headers.get("user-agent") || "";

    // IP-level rate limit
    const sessionLimit = await checkSessionInitRateLimit(ipAddress);
    if (!sessionLimit.allowed) {
      return NextResponse.json(
        { message: "Too many requests. Please try again in a few minutes." },
        {
          status: 429,
          headers: { "Retry-After": "120" },
        },
      );
    }

    // Phone-level OTP rate limit (5/hour, 20/day)
    const otpLimit = await checkOtpRateLimit(cleanPhone);
    if (!otpLimit.allowed) {
      const retryMsg =
        otpLimit.reason === "HOURLY_LIMIT"
          ? "Hourly limit reached. Please try again in an hour."
          : "Daily limit reached. Please try again tomorrow.";
      const retryAfter = otpLimit.reason === "HOURLY_LIMIT" ? "3600" : "86400";
      return NextResponse.json(
        { message: retryMsg, error: "RATE_LIMIT" },
        { status: 429, headers: { "Retry-After": retryAfter } },
      );
    }

    // Create auth session
    const { sessionId, expiresAt } = await createAuthSession(
      cleanPhone,
      ipAddress,
      userAgent,
    );

    // Generate and hash OTP immediately
    const otp = await createOtp(sessionId);

    // Send OTP via Meta Authentication Template
    const sendResult = await sendAuthenticationOtp(cleanPhone, otp);

    if (!sendResult.success) {
      await markFailed(sessionId);
      await logWhatsAppEvent({
        sessionId,
        phone: cleanPhone,
        logType: "error",
        errorCode: sendResult.error,
        response: {
          event: "otp_send_failed_on_init",
          metaErrorCode: sendResult.errorCode,
          metaErrorSubcode: sendResult.errorSubcode,
          fbTraceId: sendResult.fbTraceId,
          requestId: sendResult.requestId,
        },
      });

      // Classify error type for better client messaging and monitoring
      let message =
        "Unable to send WhatsApp code right now. Please try again in a moment.";
      let errorType = "PROVIDER_ERROR";

      if (sendResult.error === "API_NOT_CONFIGURED") {
        // Config issue — don't expose details in production
        message =
          "WhatsApp delivery is not yet configured. Please contact support.";
        errorType = "CONFIG_ERROR";
        console.error("[WhatsApp Init] CONFIG_ERROR: API credentials missing or malformed. Check META_WHATSAPP_ACCESS_TOKEN and META_WHATSAPP_PHONE_NUMBER_ID in environment variables.");
      } else if (sendResult.error === "NETWORK_ERROR") {
        message =
          "Network error reaching WhatsApp. Please check your connection and try again.";
        errorType = "NETWORK_ERROR";
      } else if (
        sendResult.errorCode === 132001 ||
        sendResult.errorCode === 131030 ||
        sendResult.errorCode === 131031
      ) {
        // Template not found / paused — config issue, not user's fault
        message =
          "WhatsApp delivery is temporarily unavailable. Please contact support.";
        errorType = "TEMPLATE_ERROR";
        console.error(`[WhatsApp Init] TEMPLATE_ERROR: code=${sendResult.errorCode}. Check META_WHATSAPP_AUTH_TEMPLATE_NAME, META_WHATSAPP_TEMPLATE_LANGUAGE, and template approval status in Meta Business Manager.`);
      } else if (sendResult.errorCode === 190) {
        // Expired token
        message =
          "WhatsApp service configuration error. Please contact support.";
        errorType = "TOKEN_EXPIRED";
        console.error("[WhatsApp Init] TOKEN_EXPIRED: META_WHATSAPP_ACCESS_TOKEN may have expired. Regenerate at developers.facebook.com.");
      } else if (sendResult.errorCode === 100) {
        // Invalid parameter
        message =
          "WhatsApp service configuration error. Please contact support.";
        errorType = "INVALID_PARAM";
        console.error(`[WhatsApp Init] INVALID_PARAM (code=100): Check phone number format and META_WHATSAPP_PHONE_NUMBER_ID.`);
      }

      const status = errorType === "PROVIDER_ERROR" || errorType === "NETWORK_ERROR" || errorType === "TEMPLATE_ERROR" ? 503 : 500;

      return NextResponse.json(
        {
          message,
          error: errorType,
          // Expose detailed debug info only outside production
          ...(process.env.NODE_ENV !== "production"
            ? {
                debug: {
                  metaError: sendResult.error,
                  metaCode: sendResult.errorCode,
                  metaSubcode: sendResult.errorSubcode,
                  fbTraceId: sendResult.fbTraceId,
                  requestId: sendResult.requestId,
                  hint: "Check that META_WHATSAPP_ACCESS_TOKEN and META_WHATSAPP_PHONE_NUMBER_ID have no leading/trailing spaces in your .env file.",
                },
              }
            : {}),
        },
        { status },
      );
    }

    // Mark session as OTP_SENT
    await markOtpSent(sessionId);
    await logWhatsAppEvent({
      sessionId,
      phone: cleanPhone,
      logType: "otp_sent",
      template:
        process.env.META_WHATSAPP_AUTH_TEMPLATE_NAME || "login_millionflats",
      messageId: sendResult.messageId,
      sentAt: new Date(),
      response: { requestId: sendResult.requestId },
    });

    return NextResponse.json({ sessionId, expiresAt });
  } catch (err) {
    console.error("[WhatsApp Init] Unexpected error:", err);
    return NextResponse.json(
      { message: "Failed to send code. Please try again." },
      { status: 500 },
    );
  }
}
