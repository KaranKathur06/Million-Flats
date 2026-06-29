import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getSession,
  createOtp,
  sendAuthenticationOtp,
  logWhatsAppEvent,
} from "@/lib/whatsapp";

const RESEND_COOLDOWN_MS = 30 * 1000; // 30 seconds
const MAX_RESENDS = 3;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { sessionId } = body as { sessionId?: string };

    if (!sessionId) {
      return NextResponse.json(
        { message: "Session ID is required." },
        { status: 400 },
      );
    }

    const session = await getSession(sessionId);
    if (!session) {
      return NextResponse.json(
        {
          message: "Session not found or expired.",
          error: "SESSION_NOT_FOUND",
        },
        { status: 400 },
      );
    }

    if (session.status === "VERIFIED") {
      return NextResponse.json(
        { message: "Session already verified." },
        { status: 400 },
      );
    }

    if (
      session.status === "FAILED" ||
      new Date() > new Date(session.expiresAt)
    ) {
      return NextResponse.json(
        {
          message: "Session expired. Please start again.",
          error: "SESSION_EXPIRED",
        },
        { status: 400 },
      );
    }

    // Count total OTPs for this session (first send + resends)
    const otpCount = await (prisma as any).whatsAppOtp.count({
      where: { sessionId },
    });

    // The first OTP was sent during init; each resend adds one more.
    // Allow up to MAX_RESENDS additional OTPs beyond the first.
    if (otpCount > MAX_RESENDS) {
      return NextResponse.json(
        {
          message: "Maximum resend limit reached. Please start a new login.",
          error: "MAX_RESENDS_REACHED",
        },
        { status: 429 },
      );
    }

    // Enforce cooldown: check the most recent OTP's creation time
    const lastOtp = await (prisma as any).whatsAppOtp.findFirst({
      where: { sessionId },
      orderBy: { createdAt: "desc" },
    });

    if (lastOtp) {
      const msSinceLast = Date.now() - new Date(lastOtp.createdAt).getTime();
      if (msSinceLast < RESEND_COOLDOWN_MS) {
        const retryAfter = Math.ceil((RESEND_COOLDOWN_MS - msSinceLast) / 1000);
        return NextResponse.json(
          {
            message: `Please wait ${retryAfter} seconds before resending.`,
            error: "COOLDOWN_ACTIVE",
            retryAfter,
          },
          { status: 429 },
        );
      }
    }

    // createOtp invalidates any previous unused OTPs and creates a fresh one
    const otp = await createOtp(sessionId);
    const sendResult = await sendAuthenticationOtp(session.phone, otp);

    if (!sendResult.success) {
      await logWhatsAppEvent({
        sessionId,
        phone: session.phone,
        logType: "error",
        errorCode: sendResult.error,
        response: {
          event: "otp_resend_failed",
          metaErrorCode: sendResult.errorCode,
        },
      });
      return NextResponse.json(
        {
          message:
            "Unable to resend WhatsApp code. Please try again in a moment.",
          error: "META_API_ERROR",
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

    await logWhatsAppEvent({
      sessionId,
      phone: session.phone,
      logType: "otp_sent",
      template:
        process.env.META_WHATSAPP_AUTH_TEMPLATE_NAME || "mf_authentication_otp",
      messageId: sendResult.messageId,
      sentAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      message: "Code resent successfully.",
    });
  } catch (err) {
    console.error("[WhatsApp Resend] Error:", err);
    return NextResponse.json(
      { message: "Failed to resend code. Please try again." },
      { status: 500 },
    );
  }
}
