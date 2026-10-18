# Lead and Registration Email Notifications

## Goal

Send new lead and new Agent, Developer, Ecosystem, and Agency registration
notifications to one configured admin inbox.

## Existing context

Lead creation already calls the shared lead notification helper for many
flows. Registrations separately send user verification messages. Lead creation
can use a transaction client, so sending from inside `createLead` can send a
notification before the enclosing transaction commits.

## Design

- Use `ADMIN_NOTIFY_EMAIL` as the shared recipient, retaining
  `LEADS_NOTIFY_EMAIL`, `THREE_D_TOUR_LEADS_NOTIFY_EMAIL`, and
  `ECOSYSTEM_LEADS_NOTIFY_EMAIL` as backward-compatible fallbacks, in that
  precedence after the primary setting.
- Send lead notification events only after the lead-creation transaction
  commits. Cover all existing lead entry points that create a user-visible
  lead, without sending for imports or other flows that explicitly disable
  notification. For transaction-client callers, return/retain notification
  data for the outer service to dispatch after commit; `createLead` must not
  send while an enclosing transaction is still open.
- Send the admin notification for Agent, Developer, Ecosystem, and Agency
  signups only after the registration transaction commits. Registration
  services using a transaction client must return/retain notification data
  for the outer service to dispatch after commit; never send from inside an
  enclosing transaction. Keep existing user-facing email verification
  behavior separate and unchanged.
- Include a concise event type, registration/lead identifier, contact and
  business details appropriate for review, timestamp, and admin destination.
  Lead notices may include the lead's name, email, phone, message, lead type,
  category, related public listing/project name, and admin link. Registration
  notices may include name, email, phone, registration type, and public
  company/agency name. Never include passwords, OTPs, auth tokens, or private
  uploaded documents.
- Use best-effort single delivery through the existing email gateway. Email
  provider errors or missing configuration are logged with event context, but
  do not fail registration or lead creation. No durable retry queue is added.
- Document the shared inbox environment setting and preserve existing
  configuration compatibility.

## Acceptance and validation

- Each supported lead type notifies the shared inbox after successful database
  commit; rollback sends no email.
- Each of the four requested registration types notifies the shared inbox
  after transaction commit; rollback sends no admin notification.
- Existing account verification emails continue to be sent as before.
- Missing configuration/provider failure is explicit in logs and does not
  change a successful registration/lead response.
- Tests cover routing, post-commit ordering, secret omission, and provider
  failure behavior.
