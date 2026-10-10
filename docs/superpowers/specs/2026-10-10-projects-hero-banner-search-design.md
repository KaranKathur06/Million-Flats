# Projects Hero Banner and Search Design

## Goal

Make `/projects` feel like a deliberate, premium discovery experience by making
the existing Projects banner artwork feel larger, restoring the page's earlier
serif heading style, and keeping search and filters clear and fully functional.

## Current implementation and findings

- The route is `app/projects/page.tsx`; it resolves a contextual banner using
  `resolveHeroBanner` and renders the interactive page in
  `app/projects/ProjectsGridClient.tsx`.
- The hero already spans the available viewport width. At a 1350 CSS-pixel
  viewport, the observed hero is about 1335 by 313 pixels after scrollbar
  width, which is consistent with the 1920:450 composition. Its wrapper is not
  the cause of the inset appearance.
- The selected global Projects artwork has broad dark and peach side panels
  baked into the image. The central residences and EON One branding, tagline,
  and phone number are also baked into the image; they are not HTML overlays
  and cannot be restyled with CSS.
- The image is delivered through the existing Next.js responsive image path.
  A live delivered variant was 849 by 240 pixels at a tablet-sized viewport.
  Cropping can improve framing but cannot recover detail that is absent from
  the source at large desktop sizes.
- The hero has a bottom fade that is not needed for the approved image-only
  treatment. The normal page and Suspense fallback also pass different image
  fallback props, so the banner can change appearance while loading or after
  an image error.
- The search title uses banner data, but the subtitle is hardcoded to UAE
  copy instead of using the resolved banner's `subheadline`.
- The root layout uses Public Sans. Tailwind currently maps both `sans` and
  `serif` to Public Sans, so a `font-serif` class does not restore a serif
  heading face.

## Approved design

### Hero framing

- Keep the existing banner resolver, source selection, `HeroBannerBackdrop`,
  responsive image loading, alt text, and full-bleed layout.
- Keep the desktop 1920:450 aspect ratio and avoid a max-width container,
  fixed desktop height, letterboxing, or a replacement image.
- For the current global Projects artwork only, apply a restrained desktop
  overscan, starting near 1.10x, and tune it at the target viewport sizes. Use
  the least zoom that visibly reduces the built-in side panels while retaining
  the central residences, branding, tagline, and phone line.
- Do not apply that desktop zoom to city/country-specific banner assets.
- On mobile, prefer the existing mobile image when configured and use a
  composition close to its 750:400 target. If no mobile image exists, keep the
  desktop image unzoomed and use a wider 3:1 frame so the source's residences
  and embedded copy are not lost to the current 16:9 crop.
- Remove the bottom fade. Keep the hero image-only as a website component;
  embedded content in the existing artwork remains part of that artwork.
- Use the same banner and fallback props in the page's Suspense fallback and
  loaded page to avoid a temporary image mismatch.

### Search and typography

- Keep the search section immediately after the hero and preserve the existing
  input, debounce, URL synchronization, filters, sorting, active-filter
  clearing, project count, data fetching, and card navigation.
- Render the resolved `initialBanner.subheadline` instead of the hardcoded
  UAE-only subtitle so its description follows the selected banner context.
- Restore a real serif face for Projects-page headings and project names only.
  Keep body text, search input, filters, and other controls in the current
  sans-serif style; do not change typography site-wide.

## Fallbacks and failure behavior

- Keep the current image source and existing fallback image behavior; do not
  add a new asset path or substitute unrelated imagery.
- Keep the hero's aspect ratio reserved while images load or fail so the page
  does not jump vertically.
- Ensure the Suspense version and loaded version use the same fallback
  behavior. If the image and its fallback both fail, the existing dark hero
  background remains visible and the rest of the Projects page still renders.

## Accessibility and performance

- Preserve descriptive desktop and mobile alt text.
- Preserve responsive source selection and high-priority loading for the
  above-the-fold hero.
- Keep the crop decorative and non-interactive; do not add motion or controls.
- Respect the existing reduced-motion behavior; no new animation is planned.

## Out of scope

- Replacing or editing the EON One artwork, changing its embedded text, or
  creating a new mobile image.
- Changing banner resolution, database records, admin upload workflows, or
  image selection precedence.
- Redesigning project filters, results, card data, or search behavior.
- Changing the global font system or unrelated pages.

## Validation and acceptance criteria

1. At 1920px wide, the hero remains approximately 1920 by 450 CSS pixels; at
   narrower desktop widths it scales proportionally without side gutters.
2. The global Projects banner looks visibly less inset after the smallest
   effective desktop crop, with all central artwork and embedded copy intact.
3. City/country banner variants are not inadvertently zoomed.
4. At tablet and mobile widths, no horizontal overflow occurs; the hero uses
   the mobile asset if present and does not use the desktop-only zoom. Without
   a mobile asset, the 3:1 mobile frame preserves substantially more of the
   desktop composition than the existing 16:9 frame.
5. The Projects-page heading and project names use a serif face, while body
   copy and controls remain sans-serif.
6. The subtitle matches the resolved banner context.
7. The loading fallback and loaded page use the same banner behavior.
8. Search, URL filters, sorting, filter reset, result count, and project
   navigation continue to work unchanged.
9. Validate visually at desktop (1920px and 1350px), tablet (850px), and mobile
   (390px); run focused tests and the available project type/build checks.

The delivered image's current resolution may look soft when displayed at
1920px. If visual validation shows unacceptable softness, a high-resolution
replacement asset is a separate content change and requires an approved
source; CSS must not pretend to restore missing image detail.
