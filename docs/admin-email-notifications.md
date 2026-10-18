# Admin Email Notifications

Set `ADMIN_NOTIFY_EMAIL` to the shared inbox for new leads and Agent,
Developer, Ecosystem, and Agency registrations. Email delivery also requires
the existing `RESEND_API_KEY` and `EMAIL_FROM` configuration.

For backward compatibility, the recipient falls back to
`LEADS_NOTIFY_EMAIL`, then `THREE_D_TOUR_LEADS_NOTIFY_EMAIL`, then
`ECOSYSTEM_LEADS_NOTIFY_EMAIL`. Configure only `ADMIN_NOTIFY_EMAIL` for new
deployments.

Notifications are sent after the associated database write commits. Delivery
is best-effort: a missing inbox configuration or email-provider failure is
logged and does not fail lead or registration creation. Notification messages
exclude passwords, verification codes, authentication tokens, and private
uploaded documents.
