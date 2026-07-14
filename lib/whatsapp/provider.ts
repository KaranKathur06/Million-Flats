import {
  sendAuthenticationOtp as sendAiSensyAuthenticationOtp,
  sendWelcomeMessage as sendAiSensyWelcomeMessage,
} from "./aisensy";
import type { WhatsAppMessageResult } from "./types";

export interface OtpNotificationProvider {
  sendOtp(
    phone: string,
    otp: string,
    requestContext?: { user?: unknown; registration?: unknown; auth?: unknown },
  ): Promise<WhatsAppMessageResult>;
  sendWelcomeMessage(
    phone: string,
    requestContext?: { user?: unknown; registration?: unknown; auth?: unknown },
  ): Promise<WhatsAppMessageResult>;
}

export function createOtpNotificationProvider(): OtpNotificationProvider {
  const providerName = (process.env.OTP_PROVIDER || "aisensy").trim().toLowerCase();

  if (providerName !== "aisensy") {
    throw new Error(`Unsupported OTP provider: ${providerName}`);
  }

  return {
    async sendOtp(phone, otp, requestContext) {
      return sendAiSensyAuthenticationOtp(phone, otp, requestContext);
    },
    async sendWelcomeMessage(phone, requestContext) {
      return sendAiSensyWelcomeMessage(phone, requestContext);
    },
  };
}
