import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import {
  getSession,
  verifyOtp,
  markVerified,
  markFailed,
  logWhatsAppEvent,
  sendWelcomeMessage,
} from "@/lib/whatsapp";

/**
 * Generates a deterministic synthetic email for phone-only WhatsApp users.
 * Format: wa_<digits>@millionflats.auth
 * This is stored internally and never shown to the user.
 */
function getSyntheticEmail(phone: string): string {
  const digits = phone.replace(/[^0-9]/g, "");
  return `wa_${digits}@millionflats.auth`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { sessionId, otp } = body as { sessionId?: string; otp?: string };

    if (!sessionId || !otp) {
      return NextResponse.json(
        { message: "Session ID and OTP are required." },
        { status: 400 },
      );
    }

    // ── 1. Validate session ───────────────────────────────────────────────────
    const session = await getSession(sessionId);
    if (!session) {
      return NextResponse.json(
        {
          message: "Session not found or expired. Please start again.",
          error: "SESSION_EXPIRED",
        },
        { status: 400 },
      );
    }

    if (session.status !== "OTP_SENT") {
      const errMsgMap: Record<string, string> = {
        VERIFIED: "This session has already been used.",
        FAILED: "This session failed. Please start again.",
        EXPIRED: "Session expired. Please start again.",
        PENDING: "WhatsApp message not yet received.",
        MESSAGE_RECEIVED: "OTP not yet sent.",
      };
      return NextResponse.json(
        {
          message:
            errMsgMap[session.status] ||
            "Invalid session state. Please start again.",
          error: "SESSION_INVALID",
        },
        { status: 400 },
      );
    }

    if (new Date() > new Date(session.expiresAt)) {
      await markFailed(sessionId).catch(() => null);
      return NextResponse.json(
        {
          message: "Session expired. Please start again.",
          error: "SESSION_EXPIRED",
        },
        { status: 400 },
      );
    }

    // ── 2. Verify OTP ─────────────────────────────────────────────────────────
    const otpResult = await verifyOtp(sessionId, otp);
    if (!otpResult.valid) {
      const msgMap: Record<string, string> = {
        OTP_NOT_FOUND: "OTP expired or not found. Please request a new code.",
        MAX_ATTEMPTS_REACHED:
          "Too many incorrect attempts. Please start a new login.",
        INVALID_OTP: "Incorrect OTP. Please check and try again.",
        SESSION_NOT_FOUND: "Session not found. Please start again.",
        SESSION_INVALID: "Invalid session. Please start again.",
      };
      return NextResponse.json(
        {
          message:
            msgMap[otpResult.error || ""] ||
            "OTP verification failed. Please try again.",
          error: otpResult.error,
        },
        { status: 400 },
      );
    }

    // ── 3. Find or create buyer account ──────────────────────────────────────
    const phone = session.phone;

    // Hotfix: In WhatsApp OTP confirmation flow, never project `full_name/fullName`.
    // Some production DBs may temporarily not have `users.full_name`, causing P2022.
    const userSelect = {
      id: true,
      phone: true,
      email: true,
      status: true,
      role: true,
      verified: true,
      whatsappVerified: true,
      phoneVerified: true,
      lastWhatsappLogin: true,
      welcomeWhatsappSent: true,
      authProvider: true,
      // buyer relation is used only for existence; selecting it avoids pulling full user fields
      buyer: { select: { id: true } },
    } as const

    let user = (await prisma.user.findFirst({
      where: { phone },
      select: userSelect,
    })) as any

    let isNewUser = false;

    if (!user) {
      // No user found by phone → create a new buyer account
      isNewUser = true;
      const syntheticEmail = getSyntheticEmail(phone);

      // Edge case: synthetic email already exists (previous failed creation)
      const existingByEmail = (await prisma.user.findUnique({
        where: { email: syntheticEmail },
      })) as any;

      if (existingByEmail) {
        // Reclaim that account: attach phone and mark verified
        user = await (prisma as any).user.update({
          where: { id: existingByEmail.id },
          data: {
            phone,
            phoneVerified: true,
            whatsappVerified: true,
            lastWhatsappLogin: new Date(),
            emailVerified: true,
            verified: true,
          },
        });
        isNewUser = false;
      } else {
        user = await (prisma as any).user.create({
          data: {
            email: syntheticEmail,
            emailVerified: true,
            verified: true,
            phone,
            phoneVerified: true,
            whatsappVerified: true,
            lastWhatsappLogin: new Date(),
            role: "USER",
            status: "ACTIVE",
            authProvider: "whatsapp",
            profileCompletion: 15,
            buyer: { create: {} },
          },
        });
      }
    } else {
      // Existing user – refresh WhatsApp verification metadata
      await (prisma as any).user.update({
        where: { id: user.id },
        data: {
          lastWhatsappLogin: new Date(),
          whatsappVerified: true,
          phoneVerified: true,
          // Trust phone-verified accounts the same as email-verified
          emailVerified: true,
          verified: true,
          // Preserve existing authProvider if set
          ...(!user.authProvider ? { authProvider: "whatsapp" } : {}),
        },
      });
    }

    // ── 4. Guard: banned / suspended ─────────────────────────────────────────
    const userStatus = String(user.status || "ACTIVE").toUpperCase();
    if (userStatus === "BANNED") {
      return NextResponse.json(
        {
          message: "This account has been permanently suspended.",
          error: "ACCOUNT_BANNED",
        },
        { status: 403 },
      );
    }
    if (userStatus === "SUSPENDED") {
      return NextResponse.json(
        {
          message: "This account is temporarily disabled.",
          error: "ACCOUNT_SUSPENDED",
        },
        { status: 403 },
      );
    }

    // ── 5. Mark session verified ──────────────────────────────────────────────
    await markVerified(sessionId, user.id).catch(() => null);

    // ── 6. Audit log ─────────────────────────────────────────────────────────
    await logWhatsAppEvent({ sessionId, phone, logType: "otp_verified" });
    await logWhatsAppEvent({ sessionId, phone, logType: "login_success" });

    // ── 7. Send one-time welcome message (fire-and-forget) ───────────────────
    if (isNewUser || !user.welcomeWhatsappSent) {
      sendWelcomeMessage(phone)
        .then(async (res) => {
          if (res.success) {
            await (prisma as any).user
              .update({
                where: { id: user.id },
                data: { welcomeWhatsappSent: true },
              })
              .catch(() => null);
            await logWhatsAppEvent({
              sessionId,
              phone,
              logType: "welcome_sent",
              messageId: res.messageId,
            });
          }
        })
        .catch(() => null);
    }

    // ── 8. Create NextAuth-compatible login token ─────────────────────────────
    // lib/auth.ts CredentialsProvider uses SHA-256 to verify the loginToken.
    // It looks up a LoginOtp record: { email, role:'USER', consumed:true,
    //   usedAt:null, loginTokenHash: sha256(token), loginTokenExpiresAt: gt now }
    const loginToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto
      .createHash("sha256")
      .update(loginToken)
      .digest("hex");
    const tokenExpiry = new Date(Date.now() + 3 * 60 * 1000); // 3-minute window

    await (prisma as any).loginOtp.create({
      data: {
        email: user.email,
        role: "USER",
        codeHash: tokenHash, // required column – mirrors loginTokenHash
        consumed: true, // pre-consumed: OTP already verified above
        loginTokenHash: tokenHash,
        loginTokenExpiresAt: tokenExpiry,
        expiresAt: tokenExpiry,
      },
    });

    return NextResponse.json({
      success: true,
      email: user.email,
      loginToken,
      isNewUser,
    });
  } catch (err) {
    console.error("[WhatsApp Confirm OTP] Error:", err);
    return NextResponse.json(
      { message: "Internal error. Please try again." },
      { status: 500 },
    );
  }
}
