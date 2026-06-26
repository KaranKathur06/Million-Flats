import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/whatsapp";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("sessionId");

    if (!sessionId) {
      return NextResponse.json(
        { error: "Session ID is required." },
        { status: 400 },
      );
    }

    const session = await getSession(sessionId);
    if (!session) {
      return NextResponse.json(
        { error: "Session not found.", expired: true },
        { status: 404 },
      );
    }

    const expired = new Date() > new Date(session.expiresAt);

    return NextResponse.json({
      status: session.status,
      expired,
      createdAt: session.createdAt,
      expiresAt: session.expiresAt,
    });
  } catch (err) {
    console.error("[WhatsApp Session Status] Error:", err);
    return NextResponse.json({ error: "Internal error." }, { status: 500 });
  }
}
