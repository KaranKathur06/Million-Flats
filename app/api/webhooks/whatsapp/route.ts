import { NextRequest, NextResponse } from "next/server";
import {
  verifyWebhookSignature,
  logWhatsAppEvent,
} from "@/lib/whatsapp";

// POST – Delivery status updates and incoming messages
export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    
    if (!verifyWebhookSignature(req.headers)) {
      console.warn("[WhatsApp Webhook] Invalid signature");
      return new NextResponse("Unauthorized", { status: 401 });
    }

    let body;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ status: "ok" });
    }

    // AiSensy webhook typically sends status updates
    // Extract generic fields
    const status = body?.status || body?.event || "unknown";
    const messageId = body?.messageId || body?.id || body?.campaignId || "";
    const phone = body?.destination || body?.mobile || body?.phone || "unknown";
    
    // Log delivery status updates for analytics / debugging
    if (status) {
      await logWhatsAppEvent({
        phone: phone.startsWith('+') ? phone : `+${phone}`,
        logType: "webhook_received",
        messageId: messageId,
        deliveryStatus: status,
        response: body,
      }).catch(() => null);
    }

    return NextResponse.json({ status: "ok" });
  } catch (err) {
    console.error("[WhatsApp Webhook] Error:", err);
    // Always return 200 to prevent retry storms
    return NextResponse.json({ status: "ok" });
  }
}
