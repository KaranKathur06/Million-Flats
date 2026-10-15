# Onboarding Country Foreign-Key and Production Error Design

## Context

Production PM2 output contains a Prisma `P2003` error for
`users_country_iso2_fkey`. The user-onboarding PATCH handler copies the
submitted country directly into `User.countryIso2`. The corresponding UI
offers `UK`, but the ISO-2 code for the United Kingdom is `GB`. The country
value is a foreign key to `Country.iso2`, so an alias or a country row missing
from the database becomes a Prisma error and an HTTP 500.

The same logs contain `Sharp: Input Buffer is empty` in Next.js image
optimization. This is a separate `/_next/image` failure and does not establish
the cause of a server-rendered `/admin` 500. The `/admin` page obtains a server
session and loads dashboard data; its specific production exception has not
been provided. Production warnings about deprecated `images.domains` and
missing Sharp also differ from the checked-in Next.js config and package
manifest, suggesting the deployed build or runtime dependencies need
verification.

## Goals

- Prevent unsupported or legacy country values from producing a database
  foreign-key exception in user onboarding.
- Return explicit, actionable errors when a submitted country is invalid or
  the corresponding country record is unavailable.
- Keep the country selector and API contract aligned with ISO-2 country codes.
- Keep the country fix separate from the image optimizer and `/admin`
  investigation so unrelated errors are not hidden by broad fallbacks.

## Out of scope

- Disabling Next.js image optimization globally.
- Changing image delivery or CDN behavior without identifying the failing
  source URL.
- Adding success-shaped fallbacks around admin authentication or dashboard
  failures.
- Claiming a root cause or changing `/admin` behavior without its own error
  stack.
- Operating PM2 or changing production server state from this repository.

## Design

### Country input contract

The onboarding country selector will submit ISO-2 values. Change the United
Kingdom option from `UK` to `GB`; retain existing values for UAE (`AE`), India
(`IN`), and United States (`US`).

The onboarding PATCH handler will normalize submitted country values by
trimming and uppercasing them and will translate legacy `UK` submissions to
`GB`. Other non-empty inputs must be exactly two ASCII letters. An empty
string means “no country selected” and is stored as `null`; it must not be
sent to the database as an empty foreign-key value. If a country field is
provided with a non-empty value, the handler must verify that a matching
`Country.iso2` row exists before updating the user. The database's Country
table is authoritative; do not add a separate country allow-list.

A malformed non-empty value receives a 400 response and must not mutate the
user. A well-formed code with no corresponding `Country` row is treated as a
server data-integrity problem: log the code and return a stable 503 response.
If the row is removed between the lookup and update, map the resulting country
foreign-key `P2003` to the same 503 response. The Prisma user update is one
atomic statement, so other submitted onboarding fields must not be partially
saved when it fails.

Do not change `interestedCountry`; it is a separate property-market preference,
not a foreign key to `Country`.

### Image optimizer and admin errors

Do not change optimizer configuration or image components until the failing
source URL is identified from production request/access logs for
`/_next/image`. Once known, investigate that origin's response and choose a
source-specific remediation.

Capture the first server exception and request path for an `/admin` 500
separately. The Sharp trace alone is insufficient evidence to modify admin
authentication or dashboard code.

Verify the deployed revision, generated `.next` build, installed `sharp`
dependency, and active PM2 process configuration against the checked-in
`next.config.js` and `package.json`. The observed warnings are inconsistent
with these files.

## Error handling

- Empty country input is stored as `null`.
- Country input that is non-empty and not exactly two ASCII letters (after
  the legacy `UK` mapping) returns HTTP 400 with
  `{ success: false, error: "INVALID_COUNTRY", message: "Country must be a two-letter ISO-2 code." }`.
- A well-formed country code whose row is absent, or whose row is deleted
  between lookup and update, is logged and returns HTTP 503 with
  `{ success: false, error: "COUNTRY_NOT_AVAILABLE", message: "Country is temporarily unavailable. Please try again later." }`.
- Do not silently discard a non-empty country or swallow the database error.
- The onboarding UI treats non-success HTTP responses as failed saves, displays
  the returned message, and does not navigate away after a failed completion
  request.
- Unexpected database failures continue through the route's existing error
  logging and 500 response.
- The image and admin error paths remain separate and retain their error
  visibility; no broad catch or fallback is introduced.

## Testing

Add focused tests using the repository's existing Jest conventions for:

- `AE`, `IN`, `GB`, and `US` values.
- Legacy `UK` normalization to `GB`.
- Trimming and case normalization.
- Empty input, which must store `null`.
- Malformed non-empty values, which must be rejected before a write.
- A valid-looking code with no matching country row, which must return the
  stable 503 response without mutating the user.
- A country-row deletion between validation and update, which must produce the
  stable 503 response and no partial user update.
- Failed autosave and completion responses, which must be shown to the user;
  a failed completion must not navigate to the dashboard.
- Requests without a country field, which must preserve existing onboarding
  behavior.
- `interestedCountry` updates remaining independent of `Country.iso2`.

Run the targeted tests and TypeScript diagnostics for touched files. The
remaining production diagnosis is complete only when the `/admin` stack and
the image optimizer source URL have been captured and independently assessed.
