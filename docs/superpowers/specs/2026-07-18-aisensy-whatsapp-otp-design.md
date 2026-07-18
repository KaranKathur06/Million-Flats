# AiSensy WhatsApp OTP delivery

## Objective

Add WhatsApp as an opt-in OTP delivery channel for user onboarding and login while preserving the existing email OTP path as a fully independent fallback.

## Chosen approach

The application remains the authority for OTP generation, storage, expiry, attempt limits, resend limits, and verification. AiSensy is used only as a server-side message-delivery adapter.

This avoids exposing the provider key, keeps verification independent of a third party, and permits another delivery provider to be added later without changing the authentication contract.

## Components and data flow

1. The client submits an OTP request with a delivery channel of `email` or `whatsapp`.
2. The auth route validates the channel and contact detail, rate-limits the request, creates an OTP using the existing lifecycle, and persists only its hash, expiry, and attempt state.
3. For `email`, the current mail delivery path is used.
4. For `whatsapp`, `lib/notifications/aisensy.ts` normalizes the phone number to E.164 and invokes AiSensy's campaign API from the server.
5. The client submits the OTP to the existing verification flow. Verification never depends on an AiSensy callback.

## AiSensy contract

`POST https://backend.aisensy.com/campaign/t1/api/v2`

The adapter sends a JSON body containing `apiKey`, `campaignName`, `destination`, `userName`, `source`, and `templateParams`. It includes `buttons` only for a template that has an OTP URL button.

For the configured authentication campaign, the generated OTP is inserted in `templateParams` and, when the template includes the OTP URL button, in `buttons[0].parameters[0].text`. The number and ordering of `templateParams` must match the live, approved campaign template exactly. Empty optional payload fields are omitted.

Environment variables:

```env
AISENSY_API_KEY=
AISENSY_AUTH_OTP_CAMPAIGN=millionflats_auth_otp
AISENSY_AUTH_OTP_URL_BUTTON_INDEX=0
```

No provider key, password, OTP, or raw provider response is logged or returned to the browser.

## API and user experience

OTP request endpoints accept a `deliveryChannel` field with values `email` and `whatsapp`. Missing values retain the existing email behavior for backward compatibility. Invalid channels and invalid phone numbers return a generic validation error. Existing account-enumeration protections remain in place.

The UI adds a channel selector only where an OTP is requested. It keeps email selected by default and explains that WhatsApp delivery requires a mobile number capable of receiving WhatsApp messages.

## Reliability and security

- API credentials are server-only and read from environment variables.
- Destination numbers are normalized before delivery and never trusted directly from client payloads.
- OTPs are six digits, short lived, hashed at rest, single use, and limited to a fixed number of verification attempts.
- OTP requests are rate limited by account/contact and IP; resend reuses the same protections.
- Provider timeouts and non-2xx responses are mapped to a retryable generic delivery failure. No automatic retry risks delivering multiple active OTPs.
- Structured logs record channel, outcome, provider status class, and correlation ID, but redact phone numbers and all secrets.

## Testing

- Unit-test E.164 normalization and AiSensy payload composition, including body-only and body-plus-button templates.
- Unit-test absent configuration, timeout, non-2xx, and malformed provider response handling.
- Integration-test OTP request with both channels, existing email default behavior, invalid phone/channel validation, rate limits, expiry, single use, and attempt lockout.
- Verify that builds and tests run without live AiSensy credentials; the fetch call is mocked.

## Deployment

1. Rotate the exposed AiSensy dashboard credentials and API key.
2. Create/confirm the approved authentication template and live API campaign; document its exact parameter count/order.
3. Configure the new environment variables in the deployment platform.
4. Deploy backend support before exposing the WhatsApp option in the UI.
5. Monitor delivery success/error rates and retain email as a fallback. Roll back by hiding the WhatsApp option; existing email authentication is unaffected.
