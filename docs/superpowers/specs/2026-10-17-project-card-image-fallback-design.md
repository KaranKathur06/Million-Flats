# Project Card Image Fallback

## Goal

Use the supplied default property image for project cards when project media is
missing or unusable, matching Buy/Rent property cards.

## Existing context

The supplied asset is `public/default Image.jpeg`. Project media selection is
centralized in `lib/media/resolveMedia.ts`, but project API routes also have
local fallback constants that currently point to `/image-placeholder.svg`.

## Design

- Set the shared project fallback to the supplied asset at the URL
  `/default%20Image.jpeg`.
- Route project listing and search image resolution through the shared media
  resolver instead of retaining divergent hard-coded fallback paths.
- Preserve current media precedence for valid project images; use the default
  only after no usable featured, hero, gallery, or cover image resolves.
- Do not change Buy/Rent property image selection or unrelated image assets.

## Acceptance and validation

- A project with missing, blank, or invalid media displays the supplied default
  image in listing cards and search results.
- Projects with valid media continue to display the same selected image as
  before.
- Add focused tests for fallback selection and unchanged image precedence.
