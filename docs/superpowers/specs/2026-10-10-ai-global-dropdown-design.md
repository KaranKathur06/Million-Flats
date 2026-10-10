# Global Dropdown Standard for AI Product Experiences

## Goal

Make MillionFlats' shared `GlobalDropdown` the default React dropdown in AI
product UI, bring the standalone AI demo selects into visual alignment, and
record the rule so future AI-generated React UI follows the same component
standard.

## Current implementation and findings

- The shared component is `components/ui/GlobalDropdown.tsx`, exported directly
  and through `components/ui/index.ts`. It supports single/multi selection,
  keyboard interaction, searchable/asynchronously loaded options, labels, and
  context-sensitive appearances including `premium-light`.
- `FormSelect`, `SelectDropdown`, and `PremiumDropdown` are wrappers around the
  shared component; two wrappers are explicitly deprecated in favor of direct
  `GlobalDropdown` imports.
- Three native React selects remain in live AI module pages:
  - AITitle's entity type and document type selects.
  - AIView's entity type select.
- The five standalone HTML demos contain eight native selects. Their inline
  scripts read the controls by DOM ID and depend on their existing change
  handlers; standalone static HTML cannot directly render the React component.
- Existing component selection appearance and live pages use light surfaces,
  navy text/branding, and restrained gold accents.
- No repository-root agent instruction currently documents a shared dropdown
  rule.

## Approved design

### Live React AI product pages

- Replace the three native selects in AITitle and AIView with the shared
  `GlobalDropdown` imported from `@/components/ui/GlobalDropdown`.
- Use its `premium-light` appearance to retain the current light form context
  with the shared interaction and restrained gold focus/selection styling.
- Preserve each option's value and visible label, the existing default
  selection, and the state transitions used by submission:
  - Entity type remains limited to `MANUAL_PROPERTY` or `PROJECT`.
  - Document type remains the existing list of supported document kinds.
- Keep the labels visible and correctly associated with each dropdown. Keep
  request payload shapes and API endpoints unchanged.
- Do not change selection behavior on unrelated non-AI pages or redesign the
  global dropdown component itself.

### Standalone HTML demos

- Retain native `<select>` controls in the five published standalone demo
  documents because their inline prototype logic depends on DOM events and
  element IDs and cannot mount `GlobalDropdown`.
- Style the demo selects through the existing shared `public/ai-demos/theme.css`
  so they visually follow the shared light, navy, and gold language, with clear
  focus indication and a visible dropdown affordance.
- Do not change their current option sets, IDs, change handlers, or sample
  behavior.

### Future AI-generated UI rule

- Add a root `AGENTS.md` instruction stating that new React/Next.js dropdowns
  should use `GlobalDropdown` by default, with an appropriate appearance for
  the surrounding surface.
- Require direct imports of `GlobalDropdown`, rather than new bespoke
  dropdowns or deprecated wrappers, for new React UI code.
- Document the bounded exception: native selects remain appropriate where a
  static HTML prototype or an explicit browser/platform-native requirement
  prevents use of the React component.
- Do not imply that repository instructions can override AI products that do
  not load the repository's `AGENTS.md`; compliant repository-aware coding
  agents should follow it.

## Alternatives considered

1. **Use the shared component for all React AI selects; theme static demos
   natively (approved):** consistent accessible interaction in the app without
   breaking standalone prototype scripts.
2. **Replace all native selects across the whole website:** wider component
   migration than requested, with unnecessary regression risk outside AI pages.
3. **Use CSS-only styling for all selects:** preserves native controls but
   leaves new React pages free to introduce inconsistent behavior and does
   not establish the requested reusable-component default.

## Error handling and behavior boundaries

- Validate `GlobalDropdown` values before updating the `EntityType` union state;
  do not silently accept unsupported values.
- Preserve current initial selections and ensure subsequent form submissions
  use the latest selected values.
- Keep existing API errors, loading states, and submission behavior unchanged.
- Native controls in static demos keep their existing IDs and prototype
  handlers. Their appearance enhancement must not intercept or disable their
  `change` events.
- No global DOM monkey-patching, provider, or behavior change to all website
  `<select>` controls is part of this design.

## Out of scope

- Changing API contracts, analysis requests, product data, or authentication.
- Replacing native selects on non-AI pages.
- Converting static HTML demos into React pages or coupling them to application
  runtime code.
- Adding new dropdown capabilities to `GlobalDropdown` or changing its default
  appearance for existing consumers.

## Validation and acceptance criteria

1. AITitle's entity type and document type controls and AIView's entity type
   control render `GlobalDropdown` using `premium-light`.
2. Each dropdown has an accessible visible label and presents exactly the
   existing values and labels; existing initial values are retained.
3. Changing entity type or document type updates the same state and request
   payloads as before, and unsupported entity values cannot enter the typed
   state.
4. All eight static demo selects remain native and operational by their
   existing DOM IDs/handlers, while sharing the visual trigger, focus, and
   chevron treatment.
5. Root `AGENTS.md` records the default GlobalDropdown rule and its narrow
   native-control exception.
6. Non-AI dropdowns, API behavior, demo navigation, and route/auth behavior
   remain unchanged.
7. Run focused component/page tests, a project build/type check, and visual
   checks at desktop and mobile sizes.
