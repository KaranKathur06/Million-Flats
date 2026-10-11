# Public Social Share Image Metadata Design

## Goal

Make shared MillionFlats public URLs render the most relevant available banner,
cover, or featured image in both Open Graph and Twitter card metadata. Use the
site-wide share image when a public page has no usable image. Keep private and
administrative pages out of public sharing.

## Evidence and current behavior

- The root layout defines a site-wide Open Graph and Twitter image at
  `/meta.jpeg`.
- `/projects` defines a child `openGraph` object without an image. On the live
  server-rendered page, this results in no `og:image`; Twitter still shows the
  generic root image.
- The Projects hero is selected at request time through `resolveHeroBanner`,
  including city/country banner context, but its metadata is currently static
  and does not use that selection.
- Public detail routes use different image sources and metadata patterns.
  Some emit Open Graph images but omit Twitter images; others omit a page image
  when their record has no cover.
- Project media resolution may return time-limited signed URLs. A share crawler
  can request a preview after that URL expires.
- Next.js metadata objects declared by child routes can replace parent nested
  Open Graph/Twitter properties, so a root fallback alone does not guarantee
  an image on routes that define their own social metadata.

## Approved approach

Use a shared server-side social metadata builder for public routes that provide
route-specific metadata, backed by a site-wide root fallback. The builder
accepts route title, description, canonical URL, content type, and an optional
page image; it chooses one safe image and places it in both Open Graph and
Twitter metadata.

For image-backed discovery pages, derive the share image from the same
contextual banner resolver and request context used by the visible page. At
minimum, this covers `/projects`; also cover public buy/rent/property discovery
routes that already resolve a hero banner. Prefer the desktop artwork for
social previews and fall back to the site's share image if the resolver has no
usable image.

For public detail pages, prefer the existing page-level image:

- Project: stable project cover/hero media URL.
- Sale/rent property: cover image, then the first usable public property image.
- Blog: featured image.
- Developer, agency, agent, and partner profiles: the existing public banner,
  cover, or profile image when available.

Use the existing asset URL utilities to create durable public URLs; do not put
expiring signed URLs in share metadata. A candidate must be an HTTPS absolute
URL or a root-relative same-site path resolvable through `metadataBase`. If no
usable candidate exists, emit the root `/meta.jpeg` fallback. Both social
platforms must use the same selected image and descriptive alt text where
supported.

For public pages that do not have a dedicated image source, preserve their
existing title and description while using the root share image. Audit public
route metadata overrides so a nested `openGraph` or `twitter` object cannot
silently remove the image. Do not add a general HTML rewrite, mutate page
content, change route behavior, or include private/admin routes.

## Alternatives considered

1. **Patch `/projects` only.** Smallest diff, but leaves identical missing or
   inconsistent images across other public routes.
2. **Rewrite rendered HTML for social crawlers.** Could cover many routes but
   is brittle, crawler-specific, and can diverge from Next.js metadata.
3. **Shared metadata builder, route-aware images, and root fallback
   (approved).** Requires deliberate wiring of current metadata overrides, but
   uses the framework's server-rendered metadata path and provides consistent
   precedence and fallback behavior.

## Fallback and error behavior

1. Prefer the page's existing public image when present and usable.
2. For banner-backed discovery pages, use the resolved contextual desktop
   banner; use the site-wide image if the banner is absent or invalid.
3. Never use an expiring signed asset URL for crawler metadata.
4. Fall back to `/meta.jpeg` for absent, malformed, unsupported, or non-public
   image references so every intended public page still has a share image.
5. Preserve route-specific title, description, canonical, and content type.
   Missing/unpublished content keeps its existing not-found/no-index behavior.
6. Keep existing resolver logging and explicit error handling; do not add
   silent broad catches or external image probes during metadata generation.

## Validation and acceptance criteria

1. `/projects` emits one server-rendered `og:image` matching the currently
   resolved hero banner, and its `twitter:image` matches it.
2. City/country-contextual Projects links use the same banner selection as the
   visible page; missing/failed banner resolution yields `/meta.jpeg`.
3. Public detail pages with a page image use that image in both social formats;
   without one, both formats use the site fallback.
4. Project metadata contains stable public image URLs, not time-limited signed
   URLs.
5. Public pages with custom nested metadata overrides do not lose their image;
   static pages with no page-specific art inherit the site fallback.
6. Private/admin/authenticated routes are not made public or newly shareable.
7. Focused tests cover candidate precedence, URL safety, fallback behavior,
   and Open Graph/Twitter parity. Inspect rendered server HTML for `/projects`
   and representative detail/static pages, then run the production build.
