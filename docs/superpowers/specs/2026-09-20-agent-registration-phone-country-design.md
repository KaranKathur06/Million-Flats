# Agent Registration International Phone Input

## Context and objective

The agent registration interface currently presents one free-form phone input, while `POST /api/auth/register` already supports a normalized E.164 phone, a two-letter phone country, and a national number. This mismatch prevents the user from making an explicit country choice and leaves the server to infer intent from an unstructured value.

The change will make the country code an explicit, reliable part of agent registration. India is the default selection; India and UAE appear first; every active country available in the existing `Country` data is selectable thereafter.

## Data contract

The client keeps three distinct values:

- `phoneCountryIso2`: selected ISO-3166 alpha-2 country
- `phoneNationalNumber`: digits entered without a calling code
- `phone`: canonical E.164 string assembled from the selected dial code and national number

It submits all three fields to the existing registration endpoint. The endpoint remains authoritative: `libphonenumber-js` validates the E.164 value, validates the country/dial-code match, and persists the country and national number alongside the canonical phone. No default or fallback country is supplied if the user has not made a valid selection.

## UI behavior

The phone row has a compact country-code selector and a separate local-number field. It defaults to India (`IN`, `+91`) and visually prioritizes India and UAE before alphabetically sorted active countries. Selecting a country updates the dial code; changing the country never silently rewrites the entered national number.

The number input uses `tel`, numeric input mode, and local-number autocomplete. It strips non-digits as the user types, has an explicit country-aware placeholder, and provides an accessible label for both controls. The existing responsive form layout remains intact.

## Failure and security behavior

Client validation requires a selected country and local digits before submission, but never replaces server validation. Invalid input, an invalid country, and a dial-code mismatch show the existing error banner from the API. Network failures retain the user input. The country list is local static UI metadata for reliable first render; server-side active-country validation is unchanged.

## Validation

- Default country is India and the submitted E.164 number begins with `+91` when India remains selected.
- UAE and an additional international code can be selected and produce their correct calling prefixes.
- Local input cannot inject a second `+` or alter the selected country code.
- Empty, malformed, or country-mismatched values are rejected server-side.
- Existing agent signup, email verification, and user persistence continue to work.
- Run focused registration tests, lint/type checks, and a production build.
