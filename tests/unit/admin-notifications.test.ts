import { afterAll, beforeEach, describe, expect, it, jest } from '@jest/globals'

jest.mock('@/lib/email/sendEmail', () => ({
  buildAbsoluteUrl: (path: string) => `https://millionflats.com${path}`,
  sendEmail: jest.fn(),
}))

import { getAdminNotificationEmail, notifyAdminRegistration } from '@/lib/email/adminNotifications'
import { sendEmail } from '@/lib/email/sendEmail'

const mockedSendEmail = sendEmail as jest.MockedFunction<typeof sendEmail>

describe('admin email notifications', () => {
  const previousEnv = {
    ADMIN_NOTIFY_EMAIL: process.env.ADMIN_NOTIFY_EMAIL,
    LEADS_NOTIFY_EMAIL: process.env.LEADS_NOTIFY_EMAIL,
    THREE_D_TOUR_LEADS_NOTIFY_EMAIL: process.env.THREE_D_TOUR_LEADS_NOTIFY_EMAIL,
    ECOSYSTEM_LEADS_NOTIFY_EMAIL: process.env.ECOSYSTEM_LEADS_NOTIFY_EMAIL,
  }

  beforeEach(() => {
    jest.clearAllMocks()
    delete process.env.ADMIN_NOTIFY_EMAIL
    delete process.env.LEADS_NOTIFY_EMAIL
    delete process.env.THREE_D_TOUR_LEADS_NOTIFY_EMAIL
    delete process.env.ECOSYSTEM_LEADS_NOTIFY_EMAIL
  })

  it('uses the configured shared inbox before legacy recipient settings', () => {
    process.env.ADMIN_NOTIFY_EMAIL = 'admin@example.com'
    process.env.LEADS_NOTIFY_EMAIL = 'leads@example.com'
    expect(getAdminNotificationEmail()).toBe('admin@example.com')
  })

  it('sends registration details without including credentials or verification secrets', async () => {
    mockedSendEmail.mockResolvedValue({ ok: true, id: 'email-1' })

    await notifyAdminRegistration({
      type: 'Developer',
      registrationId: 'profile-1',
      name: 'Example Admin',
      email: 'example@example.com',
      phone: '+100000000',
      businessName: 'Example Developments',
      adminPath: '/admin/developers',
    })

    const email = mockedSendEmail.mock.calls[0][0]
    expect(email).toMatchObject({ to: expect.any(String), subject: 'New Developer registration' })
    expect('text' in email ? email.text : '').toContain('Registration ID: profile-1')
    expect('text' in email ? email.text : '').not.toMatch(/password|otp|token/i)
  })

  afterAll(() => {
    for (const [key, value] of Object.entries(previousEnv)) {
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    }
  })
})
