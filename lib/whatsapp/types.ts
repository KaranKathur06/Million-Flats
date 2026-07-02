export type WhatsAppSessionStatus =
  | "PENDING"
  | "MESSAGE_RECEIVED"
  | "OTP_SENT"
  | "VERIFIED"
  | "EXPIRED"
  | "FAILED";

export interface WhatsAppSession {
  id: string;
  sessionId: string;
  phone: string;
  status: WhatsAppSessionStatus;
  userId: string | null;
  device: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  messageReceivedAt: Date | null;
  otpSentAt: Date | null;
  verifiedAt: Date | null;
  expiresAt: Date;
  createdAt: Date;
}

export interface MetaMessageResult {
  success: boolean;
  messageId?: string;
  error?: string;
  /** Meta error code (e.g. 131030 = template not found, 190 = token expired) */
  errorCode?: number;
  errorSubcode?: number;
  fbTraceId?: string;
  requestId?: string;
}

export interface InitSessionResult {
  sessionId: string;
  whatsappUrl: { mobile: string; web: string };
  expiresAt: Date;
}

export interface OtpVerifyResult {
  valid: boolean;
  error?:
    | "OTP_NOT_FOUND"
    | "MAX_ATTEMPTS_REACHED"
    | "INVALID_OTP"
    | "SESSION_NOT_FOUND"
    | "SESSION_INVALID";
}
