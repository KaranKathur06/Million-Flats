import { sendEmail } from '@/lib/email/sendEmail'
import OTPEmail from '@/lib/email/templates/otpEmail'
import { sendAiSensyAuthOtp } from '@/lib/notifications/aisensy'

export type OtpDeliveryChannel = 'email' | 'whatsapp'

export function parseOtpDeliveryChannel(value: unknown): OtpDeliveryChannel | null {
  if (value === undefined || value === null || value === '') return 'email'
  return value === 'email' || value === 'whatsapp' ? value : null
}

export async function deliverOtp(input: {
  channel: OtpDeliveryChannel
  email: string
  phone?: string | null
  userName?: string | null
  otp: string
}) {
  if (input.channel === 'whatsapp') {
    if (!input.phone) throw new Error('Add a WhatsApp-enabled mobile number to use WhatsApp verification.')
    await sendAiSensyAuthOtp({ phone: input.phone, userName: input.userName, otp: input.otp })
    return
  }

  await sendEmail({
    to: input.email,
    subject: 'Your MillionFlats verification code',
    react: OTPEmail({ otp: input.otp }),
  })
}
