import { NextRequest, NextResponse } from "next/server";
import {
  createAuthSession,
  generateWhatsAppDeeplink,
  checkSessionInitRateLimit,
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
    // E.164 validation: starts with +, followed by 7–15 digits
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

    // IP-based session init rate limit (10 per 10 minutes)
    const { allowed } = await checkSessionInitRateLimit(ipAddress);
    if (!allowed) {
      return NextResponse.json(
        { message: "Too many requests. Please try again in a few minutes." },
        { status: 429 },
      );
    }

    const { sessionId, expiresAt } = await createAuthSession(
      cleanPhone,
      ipAddress,
      userAgent,
    );
    const whatsappUrl = generateWhatsAppDeeplink(sessionId);

    return NextResponse.json({ sessionId, whatsappUrl, expiresAt });
  } catch (err) {
    console.error("[WhatsApp Init] Error:", err);
    return NextResponse.json(
      { message: "Failed to initialize session. Please try again." },
      { status: 500 },
    );
  }
}
