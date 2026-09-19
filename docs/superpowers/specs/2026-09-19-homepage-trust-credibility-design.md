# Homepage Trust and Credibility Upgrade

## Assumed system context

MillionFlats is a server-rendered Next.js 14 real-estate marketplace. The homepage route is `app/page.tsx`; it dynamically loads a client-side `TrustStats` section, then renders the server-side `AssociatedCompanies` section. Live trust metrics are exposed through `GET /api/analytics/summary`, which combines GA and database counts through the analytics aggregation service.

## Objective and boundary

Strengthen the homepage trust narrative with a premium, data-led metrics section followed by an associated-company logo showcase. The work must not change analytics collection, database queries, caching, homepage SEO, or the JSON-LD structure. It must not claim metrics or relationships that are not supported by existing data.

## Content and data model

`TrustStats` will own a typed, central metric-definition list. Each definition maps a stable key to an existing analytics-summary field, label, icon, and restrained accent. A metric only renders when its value is a finite positive number. Presentation code must not substitute editorial values for missing data.

The existing six associated-company entries remain a local static configuration, using the supplied source assets in `public/partners`: Azizi, DAMAC, ETH, MetaDology, Nextech, and Yugen. The cards are visual showcases, not links or assertions of a formal partner status.

## Component and visual design

The existing TrustStats component is upgraded rather than duplicated. It retains the established heading and deep-navy surface, and uses reusable metric-card rendering with translucent cards, moderate radii, outlined accent-icon frames, strong tabular values, compact uppercase labels, and a restrained elevation/border/glow hover treatment.

Grid behavior is data-adaptive: up to five columns on large desktop, three at `lg`, two at `sm`, and one below `sm` where legibility requires it. The section keeps the existing fade-up utility, which already honours `prefers-reduced-motion`.

AssociatedCompanies remains directly after TrustStats. Its six fixed-height logo frames use Next Image, `object-contain`, meaningful alt text, stable dimensions, and responsive image sizes. The grid is six columns at large desktop, three at tablet, and two at mobile. It uses the same restrained reduced-motion-safe entrance pattern.

## Analytics integrity and failure handling

The client summary hook will begin with an empty summary rather than fabricated counts. On a failed summary request it shows no unsupported metric values. The homepage remains usable: the trust heading and explanatory copy render, and cards appear once a verified positive value is available. Existing consumers outside this homepage are not changed unless required to preserve their type contract.

The analytics API and aggregation service remain read-only and retain their caching behavior. This design does not add requests or affect database consistency, authorization, audit logging, or notifications.

## Accessibility, performance, and SEO

Metric icons are decorative (`aria-hidden`); cards are not interactive. Logos have descriptive alternatives. Motion respects the global reduced-motion rule. Logo cards reserve their dimensions to prevent layout shift and use responsive Next Image sizing. The sections remain `<section>` elements with an eyebrow paragraph and a single `<h2>` each, preserving the homepage H1 and existing metadata.

## Validation

- Verify every rendered metric originates from `/api/analytics/summary` and no UI fallback value is injected.
- Confirm all six supplied logos are visible, uncropped, undistorted, and lazy-loaded below the fold.
- Inspect 1920, 1440, 1024, 768, 430, 390, 375, and 360 pixel widths for overflow, clipping, and card balance.
- Run lint, focused unit tests for the analytics-summary shape where applicable, and a production build.
- Check browser console for image and hydration errors.

## Deployment and rollback

The change is a presentation-only deployment with no migration. Rollback is a direct code revert; cached analytics and database state require no recovery action.
