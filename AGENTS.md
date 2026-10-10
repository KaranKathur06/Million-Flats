# Repository AI Development Guidance

## Dropdowns

- For new dropdown controls in React or Next.js UI, use the shared
  `GlobalDropdown` from `@/components/ui/GlobalDropdown` by default. Choose an
  appearance that matches the surrounding surface; use `premium-light` for
  public product forms unless the existing page context calls for another
  supported appearance.
- Do not build a one-off React dropdown or add new usage of deprecated
  `FormSelect`, `SelectDropdown`, or `PremiumDropdown` wrappers. Keep values
  controlled and typed, preserve visible labels and option values, and validate
  values before assigning them to constrained domain types.
- Native `<select>` controls are an exception only when React cannot own the
  control, such as standalone HTML prototypes with DOM-driven behavior or an
  explicit browser/platform-native requirement. Keep those controls accessible
  and visually aligned with the shared product design.
