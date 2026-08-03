import { buildOtpPayload } from '@/lib/auth/strategies/aisensy-provider'

describe('buildOtpPayload', () => {
  beforeEach(() => {
    process.env.AISENSY_API_KEY = 'test-key'
    process.env.AISENSY_AUTH_CAMPAIGN_NAME = 'test-campaign'
    process.env.AISENSY_USERNAME = 'Millionflats'
    process.env.AISENSY_SOURCE = 'millionflats-test'
  })

  it('includes the user name in template params and sets the OTP in the button parameter', () => {
    const payload = buildOtpPayload({
      phone: '+919876543210',
      otp: '482913',
      firstName: 'Karan',
    })

    expect(payload.templateParams).toEqual(['Karan'])
    expect(payload.paramsFallbackValue).toMatchObject({
      FirstName: 'Karan',
      OTP: '482913',
    })
    expect(payload.buttons[0]?.parameters?.[0]?.text).toBe('482913')
  })
})
