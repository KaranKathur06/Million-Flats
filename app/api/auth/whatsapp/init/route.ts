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
        { status: 429 },
      );
    }

    // Phone-level OTP rate limit (5/hour, 20/day)
    const otpLimit = await checkOtpRateLimit(cleanPhone);
    if (!otpLimit.allowed) {
      const retryMsg =
        otpLimit.reason === "HOURLY_LIMIT"
          ? "Hourly limit reached. Please try again in an hour."
          : "Daily limit reached. Please try again tomorrow.";
      return NextResponse.json({ message: retryMsg }, { status: 429 });
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
        },
      });

      // Determine user-facing message based on error type
      let message =
        "Unable to send WhatsApp code right now. Please try again in a moment.";

      if (sendResult.error === "API_NOT_CONFIGURED") {
        message =
          "WhatsApp delivery is not yet configured. Please contact support.";
      } else if (sendResult.error === "NETWORK_ERROR") {
        message =
          "Network error reaching WhatsApp. Please check your connection and try again.";
      } else if (
        sendResult.errorCode === 131030 ||
        sendResult.errorCode === 131031
      ) {
        // Template not found / paused — config issue, not user's fault
        message =
          "WhatsApp delivery is temporarily unavailable. Please contact support.";
      } else if (sendResult.errorCode === 190 || sendResult.errorCode === 100) {
        // Expired token / invalid param
        message =
          "WhatsApp service configuration error. Please contact support.";
      }

      return NextResponse.json(
        {
          message,
          error: "META_API_ERROR",
          // Expose error code only outside production for easier debugging
          ...(process.env.NODE_ENV !== "production"
            ? {
                debug: {
                  metaError: sendResult.error,
                  metaCode: sendResult.errorCode,
                },
              }
            : {}),
        },
        { status: 503 },
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
