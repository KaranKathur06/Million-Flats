# Ecosystem Banner Management System

## Context

MillionFlats currently stores ecosystem hero banner paths on `EcosystemCategory.heroImage` and edits them inline on the ecosystem partner management page. This couples presentation content to partner operations, relies on manually entered paths, and cannot safely support uploads, replacement, audit metadata, or concurrency.

## Goals

- Make `/admin/ecosystem-partners/banners` the single authoritative banner-management destination.
- Keep `/admin/ecosystem-partners/manage` focused on partner records and actions.
- Preserve all public ecosystem URLs and existing partner behavior.
- Use the existing category registry and S3 presigned-upload architecture.
- Ensure failed uploads or database writes never remove the currently active public banner.
- Resolve public banners dynamically with category and global fallback behavior.

## Non-goals for v1

- A destructive image editor or crop tool.
- Full user-facing banner version history and restore UI unless existing storage abstractions make it low-cost.
- A second storage provider or a second audit-log system.
- Removal of `EcosystemCategory.heroImage` during the initial rollout.

## Data model

Add a dedicated `EcosystemBanner` Prisma model related to `EcosystemCategory`:

- `id`
- `ecosystemCategoryId`
- `imageUrl`
- `storageKey`
- `altText`
- `width`, `height`
- `mimeType`, `fileSize`
- `status` (`ACTIVE`, `PROCESSING`, `FAILED`, `ARCHIVED` as needed)
- `version`
- `createdAt`, `updatedAt`
- `createdBy`, `updatedBy`

Enforce one active banner per category at the database/business-transaction boundary. Use optimistic version checks on replacement/removal so stale admin sessions receive a conflict rather than overwriting newer content.

The migration backfills records from non-empty `EcosystemCategory.heroImage` values. The legacy field remains intact as a temporary fallback until public resolution and migration verification are complete.

## Storage and upload flow

1. Admin requests a presigned upload URL for a selected active category.
2. Server verifies authentication, role/permission, category existence, file size, and declared content type.
3. Browser uploads directly to S3 using the existing media abstraction.
4. Finalize endpoint verifies the stored object and image metadata, including actual MIME type, dimensions, aspect ratio, and size.
5. Server creates or updates banner metadata and activates the new record transactionally, guarded by the expected current version.
6. Server revalidates the affected ecosystem category and landing surfaces.
7. Previous storage is retained until activation succeeds, then eligible for asynchronous cleanup.

Storage namespace: `ecosystem/banners/{category-slug}/{generated-safe-name}`. Original filenames are metadata only and never become storage keys.

Recommended validation: JPG/JPEG, PNG, WebP, and AVIF only when the existing image pipeline supports it; maximum size according to the existing S3 media policy; minimum dimensions and acceptable hero aspect ratio; 2560x1600 as the recommended target.

## API surface

Follow current Next.js route conventions under `/api/admin/ecosystem-banners`:

- `GET /api/admin/ecosystem-banners`: categories, active banner metadata, actual counts, and optional search/filter/sort.
- `POST /api/admin/ecosystem-banners/presign`: authorize and return a presigned upload contract.
- `POST /api/admin/ecosystem-banners/finalize`: verify object, persist metadata, activate safely, and return the active banner.
- `PATCH /api/admin/ecosystem-banners/:id`: update alt text and supported metadata with optimistic version checking.
- `DELETE /api/admin/ecosystem-banners/:id`: confirm server-side, archive/deactivate the active banner, invalidate the affected category, and retain the asset for safe cleanup.

All mutation routes independently authenticate and authorize. Errors use existing response conventions and distinguish unauthorized, forbidden, validation, conflict, storage, and database failures.

## Public resolution

Create a shared category banner resolver. Resolution order:

1. Active `EcosystemBanner` for the category.
2. Non-empty legacy `EcosystemCategory.heroImage` during migration.
3. Existing built-in category fallback asset or safe branded fallback.

`EcosystemCategoryPage` continues to render the current public route and hero behavior, but no longer treats hardcoded category image paths as the primary source once a database banner is available. Cache invalidation targets the changed category and ecosystem landing page only.

## Admin experience

Add Ecosystem navigation children:

- All Partners
- Add Partner
- Partner Leads
- Banners

The Banners page contains:

- Header and back-to-partners action.
- Database-backed category/configured/missing/recently-updated statistics.
- Search by category title or slug.
- All/configured/missing filters and category/recent-update/missing-first sorting.
- Responsive category cards with thumbnail, dimensions, format, size, status, updated time, and route.
- Upload and replacement modal with drag/drop, picker, preview, validation, progress, cancel, retry, and alt text.
- Preview modal showing desktop and mobile crop behavior.
- Removal confirmation explaining fallback and public impact.
- Loading, empty, permission, network, upload, storage, conflict, and database failure states.

Remove all banner state, fetches, handlers, forms, imports, and markup from the current partner-management page.

## Authorization and auditing

Reuse `requireAdminSession` and the existing RBAC normalization. At minimum, SUPERADMIN and permitted ADMIN users can mutate banners; MODERATOR, VERIFIER, AGENT, and USER cannot mutate them unless current granular policy explicitly grants it. Do not rely on client-side visibility.

Every successful banner mutation records the existing audit event shape with actor, action, category, previous asset, new asset, timestamp, and resulting status. If no reusable audit helper exists, add the smallest project-consistent event integration rather than a parallel audit subsystem.

## Failure guarantees

- Invalid or unsupported files never reach activation.
- Upload failure leaves the active banner untouched.
- Finalize/database failure leaves the active banner untouched and queues or safely records orphan cleanup.
- Cache invalidation failure is surfaced as an operation error without destroying the active banner.
- Stale replacement/removal requests return conflict and do not overwrite newer content.
- Missing category banners render the legacy or built-in fallback without broken images or server errors.

## Testing

Add focused tests for:

- valid upload and activation;
- replacement safety and prior asset retention;
- invalid MIME, spoofed content, dimensions, aspect ratio, and size;
- upload, storage, and database failure behavior;
- category fallback and missing-banner rendering;
- dynamically added categories appearing in the admin registry;
- authorization for all relevant roles;
- optimistic concurrency conflicts;
- targeted revalidation calls;
- removal behavior;
- mobile and modal state behavior where existing UI test infrastructure supports it.

Run Prisma validation/generation, focused tests, lint/typecheck, and production build before completion. Do not claim successful S3 or public-page lifecycle tests without configured infrastructure and evidence.

## Rollout

1. Add schema and migration without deleting legacy fields.
2. Backfill banner records from existing category values.
3. Deploy resolver with new-record-first and legacy fallback behavior.
4. Deploy admin page and APIs.
5. Verify category pages and migrated assets.
6. Remove inline management UI and legacy category PATCH usage.
7. Observe audit, storage, cache, and failure metrics.
8. Retire the legacy field only in a later migration after production verification.
