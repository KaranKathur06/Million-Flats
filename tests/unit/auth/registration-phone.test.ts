import { describe, expect, it } from '@jest/globals'
import { getPhoneCountryOptions, normalizeRegistrationPhone } from '@/lib/auth/registrationPhone'

describe('agent registration phone normalization', () => {
  it('normalizes a local Indian number using the selected country', () => {
    expect(normalizeRegistrationPhone({ phoneRaw: '9768492223', phoneCountryIso2Raw: 'IN' })).toMatchObject({
      ok: true,
      phoneE164: '+919768492223',
      phoneCountryIso2: 'IN',
      phoneNationalNumber: '9768492223',
    })
  })

  it('accepts a valid international number when its country matches the selection', () => {
    expect(normalizeRegistrationPhone({ phoneRaw: '+919768492223', phoneCountryIso2Raw: 'IN' })).toMatchObject({
      ok: true,
      phoneE164: '+919768492223',
    })
  })

  it('rejects invalid numbers and country-code mismatches', () => {
    expect(normalizeRegistrationPhone({ phoneRaw: '123', phoneCountryIso2Raw: 'IN' })).toMatchObject({ ok: false })
    expect(normalizeRegistrationPhone({ phoneRaw: '+919768492223', phoneCountryIso2Raw: 'ZZ' })).toMatchObject({ ok: false })
    expect(normalizeRegistrationPhone({ phoneRaw: '+971501234567', phoneCountryIso2Raw: 'IN' })).toMatchObject({
      ok: false,
      message: 'Phone number does not match the selected country code.',
    })
  })

  it('offers phone calling codes for all supported countries', () => {
    const countries = getPhoneCountryOptions()
    expect(countries.length).toBeGreaterThan(200)
    expect(countries).toContainEqual({ iso2: 'IN', name: 'India', dialCode: '+91' })
  })
})