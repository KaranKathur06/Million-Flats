# VideoServiceDesk integration

VideoServiceDesk is an optional third-party subsystem mounted once from the root
layout. It is intentionally isolated from property browsing, authentication,
dashboards, forms, and other MillionFlats functionality.

## Configuration

Set these variables in the deployment environment when the service should run:

```env
NEXT_PUBLIC_VIDEOSERVICEDESK_ENABLED=true
NEXT_PUBLIC_VIDEOSERVICEDESK_TOKEN=rpm2xd
```

The token is client-side configuration because the vendor requires it as a
`data-token` attribute. It must not be treated as a secret. The component uses
`rpm2xd` as a fallback token when the enable flag is explicitly enabled and no
custom token is supplied.

The script is disabled unless the enable flag is exactly `true` and the build is
running with `NODE_ENV=production`. This keeps local development disabled and
allows staging deployments that use the normal production Next.js runtime to be
controlled independently through environment variables.

## Loading and failure behavior

The script uses Next.js `afterInteractive` loading and is rendered only in the
root layout, with a stable `id`, so client navigation and React Strict Mode do
not intentionally create additional instances. It is not a prerequisite for
server rendering or hydration.

Load and failure lifecycle events are exposed as browser events:

- `videoservicedesk:loaded`
- `videoservicedesk:error`

No token, user data, call data, or session data is logged or sent to analytics.
If the CDN is blocked or unavailable, the script simply does not provide its
optional widget; the core application remains independent of it.

## Security and privacy review notes

No Content Security Policy is currently defined in the application, so this
integration does not add or weaken one. The only documented origin required by
the supplied integration is `https://cdn.videoservicedesk.com`. The vendor's
runtime API, iframe, WebSocket, media, cookie, and tracking origins were not
documented or independently verified; those must be reviewed before adding a
CSP or classifying the integration as consent-gated.

Because the script is third-party JavaScript, its CDN response remains a supply-
chain dependency. Do not self-host it or add an SRI hash unless VideoServiceDesk
provides a stable, versioned asset and supported integrity guarantees.