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

export interface WhatsAppMessageResult {
  success: boolean;
  messageId?: string;
  error?: string;
  errorType?:
    | "CONFIG_ERROR"
    | "NETWORK_ERROR"
    | "TEMPLATE_ERROR"
    | "TOKEN_EXPIRED"
    | "INVALID_PARAM"
    | "PROVIDER_ERROR"
    | "INVALID_USERNAME"
    | "INVALID_TEMPLATE"
    | "INVALID_CAMPAIGN"
    | "INVALID_DESTINATION"
    | "INVALID_API_KEY"
    | "PROVIDER_VALIDATION_ERROR";
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
