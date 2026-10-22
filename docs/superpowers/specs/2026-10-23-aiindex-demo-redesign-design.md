# AIIndex Demo Redesign and Stabilization Design

## Goal

Redesign and stabilize the public `/ai/index/demo` experience without changing the product's actual demonstrated behavior. Preserve the current five-factor weighted scoring model, default values, and summary workflow while aligning the page with MillionFlats' premium light-brand aesthetic, improving responsiveness, eliminating overflow, and making the interface feel credible as a native MillionFlats product.

## Scope

- Keep the active rewrite from `/ai/index/demo` to `/ai-demos/aiindex_demo.html` in place.
- Preserve the existing five scoring pillars, their weights, slider defaults, and formula:
  - Location & connectivity (25%)
  - Growth potential (25%)
  - Rental potential (20%)
  - Developer credibility (15%)
  - Risk & value (15%)
- Keep the demo's illustrative/sample-data framing and summary modal behavior intact.
- Update the standalone HTML/CSS to match MillionFlats' premium product styling, spacing system, and responsive behavior.
- Retain the canonical public route and existing demo assets unless a bug requires a minimal correction.
- Avoid introducing unsupported analytics, new data sources, or charts that the sample model does not actually provide.

## Non-goals

- Replacing the demo with a live market app or connected data feed.
- Rewriting the demo into a full Next.js React page without a demonstrated need.
- Altering unrelated AI module demos or global auth behavior.
- Changing the underlying scoring output logic or removing the lightweight functional summary.
- Introducing third-party analytics, trackers, CSS frameworks, or remote script dependencies.
- Modifying the canonical route or rewrite behavior beyond the styling and layout adjustments needed for the demo.

## Current implementation findings

The live demo is a standalone static HTML asset served via the existing rewrite. It includes:

- a product header and demo navigation
- a hero card with the primary proposition
- an editable five-factor score calculator
- a weighted 0–100 gauge and supporting rating label
- a generated summary modal
- explanatory formula content in the lower section

The underlying model already matches the requested product brief. The real defects are mainly in visual treatment and layout robustness:

- dark theme variables and light-theme overrides conflict
- page-level layout is visually heavy without a consistent premium rhythm
- desktop-only fixed widths and card sizing create overflow risk on medium and small screens
- the hero, panel cards, and controls do not use one consistent spacing and surface system
- the page is readable but not fully aligned with MillionFlats' lighter premium brand language
- the main content is heavier than necessary and does not have clear hierarchy at mobile widths

## Design

### 1. Preserve the product model and capability set

The demo must remain a weighted score calculator with five adjustable inputs and a weighted total. The page should keep the real default values and summary modal behavior. No new market metrics, no fabricated AI forecast panels, no charting library work that would imply live intelligence beyond the sample data.

### 2. Light premium MillionFlats theme, not generic dark dashboard

Use the current MillionFlats visual language already present in the public website and theme.css as the source of truth:

- background: soft off-white or light slate neutral
- cards: clean white surfaces with subtle borders and low-contrast shadows
- accent: warm gold / bronze for key actions and emphasis
- typography: strong modern sans-serif, precise weight hierarchy, no noisy decorative styling
- border radii: restrained and consistent
- no glassmorphism, no dramatic neon effects, and no decorative gradients introduced just for flair

Keep the gold accent as a functional highlight for the score, summary CTA, and product confidence states, but avoid heavy dark-mode contrast that undermines the premium light-brand style already used elsewhere in the site.

### 3. Clear information hierarchy and content pacing

The page should feel like an analytical product surface instead of a generic dashboard mockup. Structure the content in this order:

1. Brand/navigation strip
2. Demo notice/preview banner
3. Premium executive hero card
4. Main score calculator and property profile section
5. Right-side score panel with gauge and CTA
6. Lower explanatory architecture section

Do not add unrelated metrics. Keep the intro and explanation concise. The score and factors remain the primary value; everything else supports comprehension rather than competing with it.

### 4. Responsive layout stabilization

Target the following behavior:

- `max-width` container with comfortable horizontal padding
- grid that collapses cleanly at tablet and mobile breakpoints
- `min-width: 0` on all grid columns and cards
- no fixed widths that exceed their containers
- hero text that scales with clamp-based typography instead of hard-coded large sizes
- score panel stacking naturally on narrower widths
- slider and form controls remaining touch-friendly and fully visible
- summary modal using responsive sizing with safe padding and no overflow

This addresses the existing class of issues: horizontal overflow, clipping, tight form stacks, and desktop-only spacing assumptions.

### 5. Interaction and accessibility

Improve the current experience without changing function:

- ensure labels and controls remain readable
- use visible focus state on form fields and interactive buttons
- preserve keyboard interaction with the summary modal and button actions
- respect reduced-motion preferences for subtle transitions
- keep update states and rating messages consistent with the actual score calculation
- keep the color-coded score states meaningful but not color-only; the rating label text remains the primary signal

### 6. Implementation approach

Implement the redesign directly in `public/ai-demos/aiindex_demo.html` and the shared `public/ai-demos/theme.css` file. This is the correct layer because the public route already renders this standalone demo and the user request is limited to the demo visual quality.

The patch should:

- normalize the theme variables to the MillionFlats light premium palette
- fix the global overflow behavior at `html, body` without using global overflow hiding as a workaround
- tighten and standardize card panels, margins, and paddings
- optimize the hero typography and form layout for mobile and tablet
- make the calculator and score panel stack cleanly on smaller widths
- keep the existing formula and summary generation script intact while improving readability and spacing
- scope any shared-style updates to the AIIndex demo where practical and run a quick regression check on one other demo that shares the stylesheet
- make only the minimal JavaScript additions necessary for modal accessibility and focus behavior; do not change the scoring formula or state model

The modal, if updated, must preserve the current summary logic and add only the required behavior for `Escape` to close the modal, focus to move into the modal and return to the trigger on close, and no-op or robust handling when the trigger is unavailable.

## Alternatives considered

1. Rewrite as a full Next.js page in `app/ai/index/page.tsx`: rejected because the route is already intentionally served as a standalone demo and the current implementation is not broken by architecture; it is broken by styling and responsiveness.
2. Add heavy visual gimmicks or new metrics: rejected because it would invent unsupported features and reduce trustworthiness.
3. Minimal CSS-only polish while preserving the HTML structure: selected because it is the least risky, most aligned with the existing architecture, and directly addresses the actual defects.

## Validation

- Confirm `/ai/index/demo` still resolves through the existing rewrite and does not redirect to a login flow or unrelated route.
- Confirm the rendered page contains the same five weighted score controls, the same default values, the same rating logic, and the same summary modal structure.
- Confirm the weighted formula remains exactly: `Index Score = (Location × 0.25) + (Growth × 0.25) + (Rental × 0.20) + (Developer × 0.15) + (Risk × 0.15)`.
- Confirm the score value for the baseline defaults remains 80 / 100 and the rating label remains `Promising with checks` before and after the layout redesign.
- Confirm the displayed score is rounded to the nearest integer for the gauge and summary values, and that rating thresholds are evaluated against that rounded value for consistency across the page.
- Confirm representative slider values still produce the expected weighted totals, including:
  - all sliders at 0 => 0 / 100
  - all sliders at 50 => 50 / 100
  - all sliders at 100 => 100 / 100
  - defaults [85, 78, 74, 88, 72] => 80 / 100
- Confirm the summary modal reflects the current property title, location, property type, price, horizon, and the same five category scores.
- Confirm the summary modal can be dismissed via close button and Escape key, focus is contained while open, and no text or controls are clipped at 360px or 390px widths.
- Confirm the page loads without horizontal overflow or clipped controls at 360px, 390px, 768px, 1024px, 1440px, 1920px, and one landscape/mobile-short viewport.
- Confirm no global overflow-hiding workaround is used as a substitute for fixing layout sizing; the viewport content must fit without clipping.
- Confirm the premium light MillionFlats visual system is applied consistently without introducing style conflicts in the shared demo stylesheet.
- Confirm the final patch adds no new analytics, trackers, remote CSS, or third-party JS libraries; all work remains within the existing static asset architecture.
- Confirm text and controls meet WCAG 2.1 AA contrast for normal text and interactive elements on the chosen light palette, with visible focus states on all buttons, inputs, and links.
- Run the repository build and a focused route smoke check before concluding the redesign is stable.

## Success criteria

The redesign is successful when the page:

- feels native to MillionFlats
- has no layout overflow or clipping at common breakpoints
- keeps the sample scoring model and summary behavior intact
- reads as a premium analytical product demo instead of a generic dashboard or marketing page
- remains straightforward to maintain in the existing static HTML setup
