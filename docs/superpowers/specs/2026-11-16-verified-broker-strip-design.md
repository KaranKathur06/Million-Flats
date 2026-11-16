# Verified Broker Strip Design

## Goal

Match the homepage's NexTech verified-broker presentation to the supplied reference: a compact standalone NexTech seal at the left of the original horizontal broker banner, immediately after the hero/search section.

## Design

- Replace the custom-drawn oversized badge and text card with the existing original artwork in `public/nextech.jpeg` and `public/broker1.jpeg`.
- Arrange the seal and banner as one aligned row. Keep the seal visibly small and the banner wide, preserving their source aspect ratios and avoiding crops.
- Place the row directly after `HeroSearch`, before trust statistics. Use restrained vertical spacing and a dark-blue surrounding surface consistent with the homepage search area.
- On narrow screens, retain the same order, scale both images to fit, and allow the banner to shrink without horizontal overflow.
- Use meaningful alternative text for the seal and banner. Do not add a new route, interaction, or asset.

## Validation

Run the existing Next.js lint command against `app/page.tsx` and verify the JSX/type syntax for the changed component.
