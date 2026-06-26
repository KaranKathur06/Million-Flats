import { prisma } from '@/lib/prisma'

export async function logWhatsAppEvent(data: {
  sessionId?: string
  phone: string
  logType: 'otp_sent' | 'welcome_sent' | 'message_received' | 'otp_verified' | 'login_success' | 'error' | 'webhook_received'
  template?: string
  messageId?: string
  deliveryStatus?: string
  sentAt?: Date
  errorCode?: string
  response?: unknown
}): Promise<void> {
  try {
    await (prisma as any).whatsAppLog.create({
      data: {
        sessionId: data.sessionId ?? null,
        phone: data.phone,
        logType: data.logType,
        template: data.template ?? null,
        messageId: data.messageId ?? null,
        deliveryStatus: data.deliveryStatus ?? null,
        sentAt: data.sentAt ?? null,
        errorCode: data.errorCode ?? null,
        response: data.response ? (data.response as any) : undefined,
      },
    })
  } catch {
    // Logging is non-critical
  }
}
