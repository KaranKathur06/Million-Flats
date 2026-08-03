import { buildOtpPayload } from '@/lib/auth/strategies/aisensy-provider'

describe('buildOtpPayload', () => {
  beforeEach(() => {
    process.env.AISENSY_API_KEY = 'test-key'
    process.env.AISENSY_AUTH_CAMPAIGN_NAME = 'test-campaign'
    process.env.AISENSY_USERNAME = 'Millionflats'
    process.env.AISENSY_SOURCE = 'millionflats-test'
  })

  it('includes the generated OTP in the template body parameters and preserves the fallback name', () => {
    const payload = buildOtpPayload({
      phone: '+919876543210',
      otp: '482913',
      firstName: 'Karan',
    })

    expect(payload.templateParams).toEqual(['482913', 'Karan'])
    expect(payload.paramsFallbackValue).toMatchObject({
      OTP: '482913',
      FirstName: 'Karan',
    })
    expect(payload.buttons[0]?.parameters?.[0]?.text).toBe('482913')
  })
})
