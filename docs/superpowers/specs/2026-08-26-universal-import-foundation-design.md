# Universal Import Foundation Design

## Approved Scope

The first implementation slice supports Properties, Developers, and Projects through the existing canonical MillionFlats models. Agencies, Agents, Ecosystem Partners, Listings, and Leads remain future adapters and must not require a second ingestion architecture.

## Architecture

The existing `lib/imports` domain becomes the single orchestration layer. A registry entry owns entity metadata, field definitions, normalization, canonical validation, duplicate signals, relation resolution, and commit preparation. The engine owns parsing, staging, state transitions, idempotency, progress, audit, and reports.

External data is preserved as raw payloads and source metadata. Canonical writes use existing domain creation/update behavior and existing lifecycle/revalidation services. No imported business tables are introduced.

## Pipeline

Upload -> format and structure discovery -> registry adapter selection -> mapping -> normalization -> canonical validation -> duplicate and relation review -> persisted staging -> preview -> explicit commit -> canonical entity creation/update -> audit and revalidation.

CSV and JSON remain supported. XLSX is added behind the parser abstraction. Parsers yield a common record representation and do not require browser-side transformation.

## Persistence

Import batches and records remain the staging boundary. `ImportEntityType` is generalized beyond Property. Records retain raw, normalized, canonical, source identity, mapping version, status, and target entity provenance. Schema changes must preserve existing property batches and migration compatibility.

## Commit Safety

Commits are idempotent and processed per record in bounded transactions. Strict mode blocks unresolved warnings and errors. Partial mode commits valid records and leaves failed records reviewable. Entity-specific commit behavior is supplied by adapters or delegated canonical services. Publication and verification are independent from import status.

## Migration

The existing property importer remains payload-compatible during migration but delegates to the universal engine. Developer and project import routes are converted to compatibility wrappers after adapter parity is established. The centralized `/admin/bulk-import` route is registry-driven and history is entity-agnostic.

## Initial Acceptance Checks

- CSV quoted fields, delimiter detection, JSON collection discovery, and XLSX sheet selection work.
- Properties, Developers, and Projects stage and commit to canonical models.
- Existing admin APIs/pages and public routes consume committed records.
- Existing publication, moderation, slug, relation, audit, and revalidation behavior remains authoritative.
- Focused unit/integration tests pass and `npm run build` succeeds.
