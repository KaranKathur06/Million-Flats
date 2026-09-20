# Agent Registration International Phone Input

## Context and objective

The agent registration interface currently presents one free-form phone input, while `POST /api/auth/register` already supports a normalized E.164 phone, a two-letter phone country, and a national number. This mismatch prevents the user from making an explicit country choice and leaves the server to infer intent from an unstructured value.

The change will make the country code an explicit, reliable part of agent registration. India is the default selection; India and UAE appear first; every supported country is selectable thereafter.

The audit found that the Developer and Agency portals each have an independently implemented, hardcoded dial-code selector. Neither submits the structured phone fields already supported by the registration API. This work replaces those divergent implementations with one shared input component for Agent, Developer, and Agency registration; it does not treat either existing UI as canonical.

## Shared component and data contract

Create a reusable `InternationalPhoneInput` and a shared country metadata module. The module is presentation metadata (ISO-3166 alpha-2 code, calling code, display name, flag, and optional local-number hint); it has no database write authority. India (`IN`, `+91`) is the default; India and UAE are pinned before the remaining supported countries.

The component owns the country selection and national-number editing behavior. Each portal owns its form state and calls the component through a controlled value/change interface. This removes the duplicated Developer and Agency selectors and gives all three portals the same accessibility, normalization, and validation behavior.

Each form keeps three distinct values:

- `phoneCountryIso2`: selected ISO-3166 alpha-2 country
- `phoneNationalNumber`: digits entered without a calling code
- `phone`: canonical E.164 string assembled from the selected dial code and national number

It submits all three fields to the existing registration endpoint. The endpoint remains authoritative: `libphonenumber-js` validates the E.164 value, validates the country/dial-code match, and persists the country and national number alongside the canonical phone. No default or fallback country is supplied if the user has not made a valid selection.

The profile/location country remains independent of `phoneCountryIso2`; changing a profile country never rewrites a deliberately selected phone country.

## UI behavior

The phone row has a compact country-code selector and a separate local-number field. It defaults to India (`IN`, `+91`) and visually prioritizes India and UAE before alphabetically sorted supported countries. Selecting a country updates the dial code; changing the country never silently rewrites the entered national number.

The number input uses `tel`, numeric input mode, and local-number autocomplete. It strips non-digits as the user types; detects and removes an accidentally pasted selected-country prefix; has an explicit country-aware placeholder; and provides an accessible label for both controls. For India it enforces a ten-digit local entry; other countries use library validation rather than India-specific constraints. The existing responsive form layout remains intact.

## Failure and security behavior

Client validation requires a selected country and local digits before submission, but never replaces server validation. Invalid input, an invalid country, and a dial-code mismatch show the existing error banner from the API. Network failures retain the user input. The country list is shared static UI metadata for reliable first render; server-side active-country validation is unchanged.

## Validation

- Agent, Developer, and Agency all use the same shared component and payload contract.
- Default country is India and the submitted E.164 number begins with `+91` when India remains selected.
- UAE and an additional international code can be selected and produce their correct calling prefixes.
- Local input cannot inject a second `+` or alter the selected country code.
- A pasted `+919876543210` with India selected becomes local input `9876543210` and submits a single `+91` prefix.
- Empty, malformed, or country-mismatched values are rejected server-side.
- Existing agent signup, email verification, and user persistence continue to work.
- Run focused registration tests, lint/type checks, and a production build.
