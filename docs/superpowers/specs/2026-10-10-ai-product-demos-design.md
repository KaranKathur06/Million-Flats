# Temporary AI Product Demo Integration Design

## Goal

Make the five supplied AI product demos accessible from their matching
MillionFlats product pages while preserving the existing API-backed pages and
their behavior.

## Current implementation and findings

- The demo files are standalone HTML documents under `ai/`, with inline CSS and
  JavaScript:
  - `aiindex_demo.html` is the AIIndex investment-scoring demo.
  - `aipro_demo.html` is the AIPro agent-intelligence demo.
  - `aishield_demo.html` is the AIShield property-benchmarking demo.
  - `aititle_demo.html` is the AITitle legal-verification demo.
  - `aiview_demo.html` is the AIView media-integrity demo.
- The matching app pages are `/ai/index`, `/ai/pro`, `/ai/shield`, `/ai/title`,
  and `/ai/view`. They contain existing product interfaces and, in several
  cases, API-backed behavior that must not be displaced.
- The standalone demos include their own suite navigation. Several of those
  links refer to filenames that do not exist in the supplied folder.
- The demos have inconsistent visual themes: some are dark navy and gold while
  AIShield is light with blue accents. Their controls demonstrate prototype
  interactions and are not production AI integrations.
- Lowercase `/ai/...` is distinct from the existing uppercase `/AI/...`
  protected-route classification. This work will not change route
  authorization.

## Approved design

### Routes and integration

- Keep all existing product routes and API behavior intact.
- Publish a copy of each supplied standalone HTML file as a static asset, and
  map these readable preview paths to the corresponding static file:
  - `/ai/index/demo` → `ai/aiindex_demo.html`.
  - `/ai/pro/demo` → `ai/aipro_demo.html`.
  - `/ai/shield/demo` → `ai/aishield_demo.html`.
  - `/ai/title/demo` → `ai/aititle_demo.html`.
  - `/ai/view/demo` → `ai/aiview_demo.html`.
- Use route rewrites for the previews so each is rendered as a full standalone
  page rather than nesting the demo inside the app shell or an iframe.
- Add a clearly labeled preview link to each existing product page. Update the
  in-demo suite navigation to point to the matching lowercase preview paths,
  and provide a route back to the corresponding lowercase live product page.
- Keep prototype controls local to their demo. Do not wire them to production
  APIs or alter their sample behavior.
- Keep `/ai/...` lowercase routes public as they are today. Do not change the
  existing uppercase `/AI/...` protected-route behavior or add auth changes.

### Theme and demo labeling

- Align all five demos with the live AI pages' visual language: a light neutral
  canvas, deep-navy headers and primary actions, restrained gold highlights,
  and the site's sans-serif typography.
- Keep success, warning, and error colors semantically distinct and accessible.
- Preserve each demo's content and intended interactions while adjusting its
  visual tokens and any fixed-width styles needed for mobile responsiveness.
- Add clear copy identifying the experience and results as a demo using sample
  data and not connected to live AI analysis.
- Set the standalone HTML pages to `noindex`; retain no authentication or API
  access changes.

## Alternatives considered

1. **Separate full-page preview routes (approved):** retains the functioning
   product routes, keeps standalone demo behavior isolated, and provides
   readable URLs. Static assets plus rewrites avoid iframe sizing and duplicate
   application chrome.
2. **Replace each product route temporarily:** simpler entry points, but hides
   existing API-backed functionality and makes the temporary/demo distinction
   easy to miss.
3. **Embed the HTML in each app page:** keeps one URL per product, but combines
   two page shells, complicates sizing and navigation, and couples prototype
   HTML to the app runtime.

## Error handling and boundaries

- Preview routes must resolve to the intended product's demo and must not
  silently fall through to another product's file.
- Missing static assets should remain an explicit not-found response.
- Demos must not submit data to production AI APIs. The live product pages keep
  their existing request/error behavior.
- This change does not alter authentication, authorization, API routes, or
  production AI data handling. In particular, uppercase `/AI/...` routes
  remain protected and lowercase `/ai/...` routes retain their current access
  behavior.

## Out of scope

- Replacing the live AI product experiences or changing their data models,
  API requests, authentication, or analysis behavior.
- Building production versions of prototype interactions.
- Rewriting demo copy or changing product capabilities beyond clear sample/demo
  labeling.
- Removing these temporary previews; cleanup is a later task when production
  MVPs replace them.

## Validation and acceptance criteria

1. Each of the five `/ai/<product>/demo` paths serves its matching standalone
   demo, with no duplicate app navigation surrounding the page.
2. Rewrite targets match the five supplied `ai/*_demo.html` files exactly;
   each demo's suite navigation reaches the correct sibling preview paths and
   its matching live product page.
3. The demos are visibly identified as previews with sample/non-production
   behavior.
4. All five demos use the approved shared MillionFlats theme and remain usable
   without horizontal overflow on mobile.
5. Preview pages are marked `noindex`.
6. A missing preview asset returns an explicit 404 and never serves a
   different product's demo.
7. Existing AI product pages, API calls, and route authorization remain
   unchanged; lowercase `/ai/...` and protected uppercase `/AI/...` behavior
   are both verified.
8. Run focused route/theme checks and the available project type/build checks.
