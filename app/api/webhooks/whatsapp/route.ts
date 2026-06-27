import { NextRequest, NextResponse } from "next/server";
import {
  verifyWebhookSignature,
  logWhatsAppEvent,
  getMetaConfig,
} from "@/lib/whatsapp";

// GET – Webhook verification (Meta hub challenge)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const { webhookVerifyToken } = getMetaConfig();

  if (mode === "subscribe" && token === webhookVerifyToken) {
    return new NextResponse(challenge, { status: 200 });
  }

  return new NextResponse("Forbidden", { status: 403 });
}

// POST – Delivery status updates only.
// Incoming messages are no longer part of the auth flow.
// OTP is now sent directly by the backend upon phone submission.
export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-hub-signature-256") || "";

    if (!verifyWebhookSignature(rawBody, signature)) {
      console.warn("[WhatsApp Webhook] Invalid signature");
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = JSON.parse(rawBody);
    if (body?.object !== "whatsapp_business_account") {
      return NextResponse.json({ status: "ok" });
    }

    for (const entry of body?.entry || []) {
      for (const change of entry?.changes || []) {
        const value = change?.value;

        // Log delivery status updates for analytics / debugging
        for (const status of value?.statuses || []) {
          await logWhatsAppEvent({
            phone: status?.recipient_id ? `+${status.recipient_id}` : "unknown",
            logType: "otp_sent",
            messageId: status?.id,
            deliveryStatus: status?.status,
            response: { timestamp: status?.timestamp },
          }).catch(() => null);
        }
      }
    }

    return NextResponse.json({ status: "ok" });
  } catch (err) {
    console.error("[WhatsApp Webhook] Error:", err);
    // Always return 200 to Meta to prevent retry storms
    return NextResponse.json({ status: "ok" });
  }
}
