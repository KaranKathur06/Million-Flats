import { NextRequest, NextResponse } from "next/server";
import {
  verifyWebhookSignature,
  extractSessionIdFromMessage,
  validateSessionForMessage,
  markMessageReceived,
  markOtpSent,
  markFailed,
  createOtp,
  sendAuthenticationOtp,
  checkOtpRateLimit,
  logWhatsAppEvent,
  getMetaConfig,
} from "@/lib/whatsapp";

// GET - Webhook verification (Meta hub challenge)
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

// POST - Incoming messages and status updates
export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-hub-signature-256") || "";

    // Verify webhook signature
    if (!verifyWebhookSignature(rawBody, signature)) {
      console.warn("[WhatsApp Webhook] Invalid signature");
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = JSON.parse(rawBody);

    // Only handle WhatsApp Business Account webhooks
    if (body?.object !== "whatsapp_business_account") {
      return NextResponse.json({ status: "ok" });
    }

    const entries = body?.entry || [];
    for (const entry of entries) {
      const changes = entry?.changes || [];
      for (const change of changes) {
        const value = change?.value;

        // Handle incoming messages
        const messages = value?.messages || [];
        for (const message of messages) {
          if (message?.type !== "text") continue;

          const fromPhone = `+${message.from}`; // Meta sends without +
          const messageText = message?.text?.body || "";
          const messageId = message?.id;

          await logWhatsAppEvent({
            phone: fromPhone,
            logType: "webhook_received",
            messageId,
            response: { text: messageText.substring(0, 100) },
          });

          // Extract session ID from message
          const sessionId = extractSessionIdFromMessage(messageText);
          if (!sessionId) {
            console.log(
              "[WhatsApp Webhook] No session ID in message from",
              fromPhone,
            );
            continue;
          }

          // Validate session
          const { valid, session } = await validateSessionForMessage(
            sessionId,
            fromPhone,
          );
          if (!valid || !session) {
            console.warn(
              "[WhatsApp Webhook] Invalid session:",
              sessionId,
              fromPhone,
            );
            continue;
          }

          // Mark message received
          await markMessageReceived(sessionId);

          // Check rate limit before sending OTP
          const { allowed } = await checkOtpRateLimit(session.phone);
          if (!allowed) {
            await markFailed(sessionId);
            console.warn("[WhatsApp Webhook] Rate limited:", session.phone);
            continue;
          }

          // Generate OTP
          const otp = await createOtp(sessionId);

          // Send OTP via Meta Authentication Template
          const sendResult = await sendAuthenticationOtp(session.phone, otp);

          if (sendResult.success) {
            await markOtpSent(sessionId);
            await logWhatsAppEvent({
              sessionId,
              phone: session.phone,
              logType: "otp_sent",
              template:
                process.env.META_WHATSAPP_AUTH_TEMPLATE_NAME ||
                "mf_authentication_otp",
              messageId: sendResult.messageId,
              sentAt: new Date(),
            });
          } else {
            await markFailed(sessionId);
            await logWhatsAppEvent({
              sessionId,
              phone: session.phone,
              logType: "error",
              errorCode: sendResult.error,
              response: { event: "otp_send_failed" },
            });
          }
        }

        // Handle status updates (delivery receipts)
        const statuses = value?.statuses || [];
        for (const status of statuses) {
          await logWhatsAppEvent({
            phone: status?.recipient_id ? `+${status.recipient_id}` : "unknown",
            logType: "otp_sent",
            messageId: status?.id,
            deliveryStatus: status?.status,
            response: { timestamp: status?.timestamp },
          });
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
