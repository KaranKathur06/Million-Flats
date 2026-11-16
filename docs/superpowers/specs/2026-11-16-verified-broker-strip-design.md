# Verified Broker Strip Design

## Goal

Match the homepage's NexTech verified-broker presentation to the supplied reference: a compact standalone NexTech seal at the left of the original horizontal broker banner, immediately after the hero/search section.

## Design

- Replace the custom-drawn oversized badge and text card with the existing original artwork in `public/nextech.jpeg` and `public/broker1.jpeg`.
- Arrange the seal and banner as one horizontally aligned row. Size the seal to 84 by 84 px on desktop and 48 by 48 px on narrow screens; let the banner fill the remaining width, preserving both images' source aspect ratios without cropping.
- Place the row directly after `HeroSearch`, before trust statistics. Use restrained vertical spacing and a dark-blue surrounding surface consistent with the homepage search area.
- Keep both images side by side at all screen sizes. On narrow screens, reduce the seal to 48 px and let the banner shrink fluidly; the row must not overflow horizontally.
- Use the alt text “NexTech Verified Broker seal” and “Millionflats Pvt. Ltd., Gujarat — NexTech Verified Broker” for the respective images. Do not add a new route, interaction, or asset.

## Validation

Run the existing Next.js lint command against `app/page.tsx` and verify the JSX/type syntax for the changed component.
