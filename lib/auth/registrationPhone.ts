import {
  getCountries,
  getCountryCallingCode,
  parsePhoneNumberFromString,
  type CountryCode,
} from 'libphonenumber-js'

export type RegistrationPhoneResult =
  | { ok: false; message: string }
  | {
      ok: true
      phoneE164: string
      phoneCountryIso2: string
      phoneNationalNumber: string
      phoneCallingCode: string
    }

export type PhoneCountryOption = {
  iso2: CountryCode
  name: string
  dialCode: string
}

export function getPhoneCountryOptions(locale = 'en'): PhoneCountryOption[] {
  const countryNames = new Intl.DisplayNames([locale], { type: 'region' })

  return getCountries()
    .map((iso2) => ({
      iso2,
      name: countryNames.of(iso2) || iso2,
      dialCode: `+${getCountryCallingCode(iso2)}`,
    }))
    .sort((left, right) => left.name.localeCompare(right.name, locale))
}

function normalizeIso2(value: unknown): CountryCode | '' {
  const country = String(value || '').trim().toUpperCase()
  return /^[A-Z]{2}$/.test(country) && getCountries().includes(country as CountryCode)
    ? country as CountryCode
    : ''
}

export function normalizeRegistrationPhone(params: {
  phoneRaw: string
  phoneCountryIso2Raw?: unknown
  phoneNationalNumberRaw?: unknown
}): RegistrationPhoneResult {
  const input = String(params.phoneRaw || '').trim()
  const suppliedCountry = String(params.phoneCountryIso2Raw || '').trim()
  const selectedCountry = normalizeIso2(suppliedCountry)
  const suppliedNationalNumber = String(params.phoneNationalNumberRaw || '').replace(/\D/g, '')

  if (suppliedCountry && !selectedCountry) {
    return { ok: false, message: 'Select a valid country code.' }
  }

  if (!input || !/^\+?[\d\s().-]+$/.test(input)) {
    return { ok: false, message: 'Enter a valid phone number.' }
  }

  const parsed = input.startsWith('+')
    ? parsePhoneNumberFromString(input)
    : selectedCountry
      ? parsePhoneNumberFromString(input, selectedCountry)
      : undefined

  if (!parsed?.isValid()) {
    return { ok: false, message: 'Enter a valid phone number for the selected country.' }
  }

  if (selectedCountry) {
    const selectedCallingCode = getCountryCallingCode(selectedCountry)
    if (parsed.countryCallingCode !== selectedCallingCode || (parsed.country && parsed.country !== selectedCountry)) {
      return { ok: false, message: 'Phone number does not match the selected country code.' }
    }
  }

  if (input.startsWith('+') && suppliedNationalNumber && suppliedNationalNumber !== parsed.nationalNumber) {
    return { ok: false, message: 'Phone number does not match the selected country.' }
  }

  const phoneCountryIso2 = selectedCountry || parsed.country || ''
  if (!phoneCountryIso2) {
    return { ok: false, message: 'Select a country code for this phone number.' }
  }

  return {
    ok: true,
    phoneE164: parsed.number,
    phoneCountryIso2,
    phoneNationalNumber: parsed.nationalNumber,
    phoneCallingCode: `+${parsed.countryCallingCode}`,
  }
}