import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import type { WhatsAppSession } from "./types";

/** Generates a session ID like MF-2026-8QK19D6H */
export function generateSessionId(): string {
  const year = new Date().getFullYear();
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.randomBytes(8);
  let random = "";
  for (let i = 0; i < 8; i++) {
    random += chars[bytes[i] % chars.length];
  }
  return `MF-${year}-${random}`;
}

export async function createAuthSession(
  phone: string,
  ipAddress: string,
  userAgent: string,
): Promise<{ sessionId: string; expiresAt: Date }> {
  const sessionId = generateSessionId();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

  await (prisma as any).whatsAppAuthSession.create({
    data: {
      sessionId,
      phone,
      status: "PENDING",
      ipAddress,
      userAgent,
      expiresAt,
    },
  });

  return { sessionId, expiresAt };
}

export async function getSession(
  sessionId: string,
): Promise<WhatsAppSession | null> {
  return (prisma as any).whatsAppAuthSession.findUnique({
    where: { sessionId },
  });
}

export async function markOtpSent(sessionId: string): Promise<void> {
  await (prisma as any).whatsAppAuthSession.update({
    where: { sessionId },
    data: { status: "OTP_SENT", otpSentAt: new Date() },
  });
}

export async function markVerified(
  sessionId: string,
  userId: string,
): Promise<void> {
  await (prisma as any).whatsAppAuthSession.update({
    where: { sessionId },
    data: { status: "VERIFIED", verifiedAt: new Date(), userId },
  });
}

export async function markFailed(sessionId: string): Promise<void> {
  await (prisma as any).whatsAppAuthSession.update({
    where: { sessionId },
    data: { status: "FAILED" },
  });
}
