export type WhatsAppSessionStatus =
  | 'PENDING'
  | 'MESSAGE_RECEIVED'
  | 'OTP_SENT'
  | 'VERIFIED'
  | 'EXPIRED'
  | 'FAILED'

export interface WhatsAppSession {
  id: string
  sessionId: string
  phone: string
  status: WhatsAppSessionStatus
  userId: string | null
  device: string | null
  ipAddress: string | null
  userAgent: string | null
  messageReceivedAt: Date | null
  otpSentAt: Date | null
  verifiedAt: Date | null
  expiresAt: Date
  createdAt: Date
}

export interface MetaMessageResult {
  success: boolean
  messageId?: string
  error?: string
}

export interface InitSessionResult {
  sessionId: string
  whatsappUrl: { mobile: string; web: string }
  expiresAt: Date
}

export interface OtpVerifyResult {
  valid: boolean
  error?: 'OTP_NOT_FOUND' | 'MAX_ATTEMPTS_REACHED' | 'INVALID_OTP' | 'SESSION_NOT_FOUND' | 'SESSION_INVALID'
}
