# Associated Company Logos

## Objective

Add the three supplied company logos to the homepage's existing Associated Companies showcase without changing its behavior or making new claims about company relationships.

## Design

Keep `AssociatedCompanies` as the static source of the showcase data. Append GoRan Building Intelligence, GRID, and Video Service Desk after the existing six companies, using `/partners/goran.jpeg`, `/partners/grid.jpeg`, and `/partners/video.jpeg`. Provide descriptive company names and image alternative text.

Preserve the existing non-clickable cards, image treatment, animation, and responsive grid breakpoints: two columns on mobile, three at tablet, and six on large desktop. With nine entries, the large-screen grid will show six logos followed by three on the next row. Do not add external links or imply formal partner status.

## Validation

- Confirm the three logo files exist at the referenced public paths.
- Run the focused validation available for the homepage section and check the TypeScript/JSX diagnostics for touched files.
