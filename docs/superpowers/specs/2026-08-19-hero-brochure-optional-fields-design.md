# MillionFlats Hero, Brochure, and Progressive Editing Architecture

## Context

MillionFlats needs three coordinated changes:

- Ecosystem category heroes must present as a controlled wide banner with a desktop target of 2560 x 695 (approximately 3.68:1), without resizing or distorting source assets.
- Property brochures must have no MillionFlats-specific application maximum file-size rejection while preserving secure direct storage, file-type validation, and infrastructure protections.
- Admin project and property records must be progressively editable. Ordinary business fields may be absent during create/edit, but supplied values remain type- and format-validated, and incomplete records remain drafts until explicitly published.

## Goals

- Make the public ecosystem hero responsive, cinematic, non-distorting, and compatible with overlay content.
- Align ecosystem banner-management guidance and validation with the new presentation target.
- Remove brochure-specific product size caps from every relevant project/property upload path and UI.
- Preserve direct-to-S3 uploads, progress reporting, authentication, authorization, PDF validation, object verification, and storage security.
- Make project and property create/edit tolerant of incomplete business data while preserving system integrity and partial-update semantics.
- Ensure incomplete records cannot become publicly visible merely because save validation is relaxed.
- Preserve safe brochure replacement: an existing brochure remains active until a new upload is verified and committed.

## Non-goals

- No destructive image editor or source-image rewrite.
- No second storage provider or upload mechanism.
- No blanket removal of type, numeric, enum, URL, authorization, or integrity validation.
- No blanket Prisma nullability migration.
- No unrelated lifecycle rewrite or new publication policy beyond the minimum needed to keep drafts private.
- No removal of infrastructure-level request, timeout, proxy, or storage protections.

## Existing architecture and constraints

- Ecosystem banners use a dedicated database-backed admin page, S3 presigned PUT, finalize verification, transactional active-banner replacement, audit logging, and targeted revalidation.
- Public ecosystem resolution already prefers an active `EcosystemBanner`, then legacy category image, then configured fallback.
- `InternalPageBanner` currently owns the public hero dimensions and uses Next Image with `object-cover`.
- Project brochures have a direct-to-S3 presign/finalize flow and a legacy multipart endpoint. Both currently contain a 300 MB application cap.
- Manual-property media has a direct-to-S3 presign/complete flow and currently applies the same brochure cap to `BROCHURE` uploads.
- Project and manual-property Prisma models already allow most business fields to be null or have safe defaults. Projects default to `DRAFT`; manual properties default to `DRAFT`, but the admin property POST route currently derives a public status when one is omitted.
- Project create/edit has both schema validation and a legacy editor-level completeness validator. Manual-property admin create uses canonicalization that supplies fallback location values and validates through location policy.

## Design

### Ecosystem hero presentation

`InternalPageBanner` will use an aspect-ratio-driven hero container rather than a fixed desktop height. The desktop composition uses `2560 / 695`, with a controlled tablet reduction and a mobile treatment that avoids forcing the desktop crop onto narrow screens. The image remains `object-fit: cover`; focal positioning is explicit or configurable where the existing data model supports it. The overlay and content remain layered within the same container, with readable contrast and a bounded text column.

The source file is retained as uploaded. The presentation container controls the rendered composition. No source image is rejected solely for not being exactly 2560 x 695, and no source image is stretched to reach that size.

The banner-management UI will show `Recommended desktop banner: 2560 x 695` and `Aspect ratio: 3.68:1`. Existing source images may be accepted when they meet supported MIME, readable-image, and minimum usable-dimension checks, even when their source ratio differs from 3.68:1. The accepted source policy is deterministic: images from 1.35:1 through 4.5:1 and at least 1280 x 695 are accepted for controlled cover cropping; other sources are rejected with a clear composition error. The public presentation ratio is not treated as an exact source-upload ratio. Existing S3 verification remains authoritative for actual stored metadata.

Admin thumbnails and desktop preview use the new wide ratio. Mobile preview uses a deliberate narrow crop so administrators can inspect the responsive result before activation.

### Brochure upload architecture

The direct-to-S3 presigned upload remains the preferred large-file path:

```text
Browser -> authenticated presign -> S3 PUT with progress -> finalize/verify -> database reference
```

The application will remove only MillionFlats brochure-size rejection. It will continue to require a positive declared size, PDF content type, authorized project/property context, and an upload contract issued by the presign endpoint. The contract binds the target record, content type, declared size, and a server-generated storage key; finalize rejects missing, expired, reused, or mismatched contracts. Finalize also verifies object existence and stored metadata/content. Project brochure activation updates the `ProjectBrochure` row and backward-compatible `Project.brochureUrl` field in one database transaction. The prior row and object remain active until that transaction commits.

The legacy multipart project brochure route will no longer impose the product cap. Because multipart uploads load the file through the application process, the direct presigned path remains the UI default and the legacy route is retained only for compatibility. It must upload and verify the replacement before changing or deleting the existing row/object. No new server-memory upload path will be introduced.

Brochure replacement will be ordered so that the new object is uploaded and verified before the database reference changes. The old database reference and object remain active when upload, verification, or database persistence fails. Cleanup of the old object occurs only after successful activation and must not be allowed to invalidate the current reference.

All obsolete size text and constants will be removed from project/property brochure UI and schemas. The UI will say PDF/document guidance without claiming an unlimited technical guarantee, and existing progress, success, and error states remain visible. In the manual-property media endpoint, the brochure branch will validate PDF type and positive size without applying the image cap; image and video branches retain their existing independent limits.

### Progressive project editing

Project create and edit schemas will treat ordinary business data as optional while preserving validation when present. Blank nested editor rows are filtered before persistence. Empty collections are valid. Partial edit requests update only supplied properties; omitted fields do not overwrite existing values.

The legacy project completeness validator will no longer block create/edit with errors for missing description, overview, price, location, media, unit types, payment plans, or other ordinary business information. Numeric, enum, string length, URL, and nested supplied-value checks remain active.

A project created without optional business information is saved as `DRAFT`. Existing publish behavior remains a separate lifecycle action. The project publish route will call an explicit readiness check and refuse publication when the record is missing the minimum system/publication data established by the existing product rules. The check will be separate from create/edit validation and will not expose drafts through public project queries.

System-integrity requirements remain protected: authenticated admin context, project identity, generated unique slug, developer relation where the current database requires it, timestamps, and valid relational/enum values. No fake business values are inserted.

### Progressive property editing

Admin property create will default omitted status to `DRAFT`. Business fields remain nullable or safely defaulted according to the current Prisma model. The create/edit schemas will permit absence while continuing to reject invalid supplied values.

Canonical location handling will be adjusted only as needed to distinguish missing optional location data from invalid supplied location data. It must not force fake business information solely to satisfy save validation. Technical ownership context continues to use the existing authenticated/system-agent model. Admin property create defaults omitted status to `DRAFT`, and the property publish lifecycle calls an explicit readiness check before allowing public status. The readiness check remains separate from create/edit validation.

Property media and brochures remain independent resources. A property can be saved before any media exists and can receive media or a brochure later. Existing lifecycle actions remain the only path to public status, and public property queries continue to exclude drafts.

### Publication safety

Field presence, field validity, completeness, and publication readiness remain separate concepts:

```text
missing value       -> allowed during create/edit when business-optional
invalid value       -> rejected when supplied
incomplete record   -> saved as draft
publish action      -> independently controlled
public query        -> excludes draft/unpublished records
```

Existing imported, scraped, and manually created records remain compatible. No database migration is expected unless validation proves a production PostgreSQL constraint contradicts the current Prisma schema.

Publication readiness is deliberately small and explicit. A project must have a non-empty name, unique slug, valid developer relation, and non-deleted state before publication. A manual property must have a non-empty title, valid property intent, supported country, and valid city before publication. These are publication gates, not create/edit requirements. The project single-item publish route and project bulk-publish route both call the same project readiness helper. The property lifecycle route, property PATCH status transitions, and property bulk-approve route all call the same manual-property readiness helper. Restore-to-published actions use the same gate.

### PATCH and clearing semantics

For project scalars (`name`, `slug`, `developerId`, `countryIso2`, `city`, `community`, `description`, `overview`, `completionYear`, `startingPrice`, `coverImage`, `featuredOrder`, `listingPriority`, `pinPriority`) and property scalars (`title`, `propertyType`, `intent`, `price`, `currency`, `constructionStatus`, `shortDescription`, `bedrooms`, `bathrooms`, `squareFeet`, `countryCode`, `countryIso2`, `city`, `community`, `address`, `latitude`, `longitude`, `developerName`, `tour3dUrl`), an omitted key means “leave unchanged”; explicit `null` clears a nullable field; and a blank string clears text fields that currently normalize blank input to null. Required system strings reject null/blank where their database or route contract requires them. Nested project collections (`unitTypes`, `floorPlans`, `highlights`, `amenities`, `nearbyPlaces`, `paymentPlans`, `videos`) are untouched when omitted and intentionally replaced when supplied after blank rows are filtered. Property amenities/custom amenities are likewise untouched when omitted and cleared/replaced only when explicitly supplied. Tests cover omitted, explicit null, blank string, and supplied valid/invalid values.

## Error handling and failure guarantees

- Invalid supplied values return the existing validation error shape and do not partially persist.
- Missing optional fields do not produce a required-field error wall.
- Project/property create failures do not create partially committed child data outside existing transaction boundaries.
- Brochure upload failure leaves the existing brochure reference active.
- Brochure finalize failure does not archive or delete the current brochure.
- Brochure finalize rejects storage keys outside the target record namespace and commits the brochure row plus legacy URL update atomically.
- Property brochure replacement preserves the active media row until the newly issued upload contract is verified; replacement media metadata and every property brochure reference are activated in one database transaction, and old storage is cleaned only after commit.
- Banner upload or finalize failure leaves the current active banner untouched.
- Stale banner replacement continues to return a conflict.
- Missing or draft public records are not rendered through public listing/search queries.

## Testing strategy

Focused tests will cover:

- ecosystem desktop, tablet, and mobile hero ratios, crop behavior, overlay readability, and banner-admin copy/validation;
- banner replacement failure preserving the active record;
- brochure PDF acceptance without a MillionFlats size cap and rejection of unsupported types;
- direct-to-S3 progress/finalize behavior and failed replacement preserving the prior brochure;
- minimal project create, partial project edit, invalid supplied project values, and draft status;
- minimal property create, partial property edit, invalid supplied property values, and draft status;
- public project/property queries excluding drafts;
- import/scraper payload compatibility and Prisma generate/type checking.

Where S3, database, or browser infrastructure is unavailable, validation will distinguish static/type/test evidence from unverified live workflows.

## Rollout sequence

1. Apply hero presentation and banner-admin updates.
2. Remove brochure product caps and make direct storage the clearly supported path.
3. Relax project schema/editor validation and verify draft persistence.
4. Relax property create/edit validation and force omitted admin-create status to draft.
5. Run focused tests, Prisma validation/generation, TypeScript, lint, and production build.
6. Review public draft filtering, imports, media, brochure downloads, and lifecycle routes for regressions.
