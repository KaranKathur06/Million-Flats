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
        response: { event: "otp_send_failed_on_init" },
      });
      return NextResponse.json(
        {
          message:
            "Failed to send WhatsApp code. Please check your number and try again.",
          error: "META_API_ERROR",
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
        process.env.META_WHATSAPP_AUTH_TEMPLATE_NAME || "mf_authentication_otp",
      messageId: sendResult.messageId,
      sentAt: new Date(),
    });

    return NextResponse.json({ sessionId, expiresAt });
  } catch (err) {
    console.error("[WhatsApp Init] Error:", err);
    return NextResponse.json(
      { message: "Failed to send code. Please try again." },
      { status: 500 },
    );
  }
}
