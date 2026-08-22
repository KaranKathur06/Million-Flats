# MillionFlats Universal Import Platform
## Phase 1 Engineering Implementation Task

**Design baseline:** [Phase 1 design](../specs/2026-08-21-universal-import-phase-1-design.md)
**Scope:** Universal import foundation plus a real CSV/JSON Property vertical slice into `ManualProperty`.
**Execution order:** Backend and automated proof first; Admin UI only after the engine is reliable.

## Mission

Implement a reusable import engine that transforms heterogeneous CSV and JSON source data into canonical `ManualProperty` records through one explicit commit boundary.

Do not create a parallel property table, importer-only property API, importer-specific public page, or browser-side import engine.

The implementation is complete only when an imported property is consumed by the same existing admin, public, search, filter, relationship, lifecycle, moderation, and revalidation paths as a manually created property.

## Hard Constraints

- `ManualProperty` is the only Phase 1 property destination.
- Preserve `ManualProperty.sourceType = 'MANUAL'` because current admin, public, moderation, search, and sitemap queries depend on it. Do not use it as import provenance.
- Preserve import origin through `ImportBatch -> ImportRecord -> ManualProperty` and existing source metadata fields.
- Do not silently create an Agent to satisfy `ManualProperty.agentId`.
- Do not choose the current admin, first admin, or random Agent as owner.
- Only the commit service may call the canonical `ManualProperty` business service.
- No parser, mapper, normalizer, validator, duplicate detector, preview route, or review route may mutate `ManualProperty`.
- Do not start by building the frontend.
- Do not add XLSX, XML, Redis, BullMQ, worker infrastructure, rollback deletion, media downloading, or AI-controlled production mappings in Phase 1.
- Do not commit changes to git unless explicitly requested.

## Existing Anchors to Preserve

Before editing, inspect and document behavior in these files:

- `prisma/schema.prisma` (`ManualProperty`, `Agent`, `User`, `AuditLog`)
- `app/api/admin/properties/route.ts` (admin create path and current `findOrCreateSystemAgent` behavior)
- `app/api/admin/properties/bulk-import/route.ts` (legacy bulk behavior to migrate)
- `lib/propertyCanonical.ts` (existing canonical property normalization)
- `lib/canonicalLocation.server.ts` (location validation)
- `lib/manualPropertyLifecycle.ts` (status rules)
- `lib/manualPropertyAdminLifecycle.ts` (admin lifecycle, audit, and revalidation)
- `lib/publicManualProperties.ts` (public visibility contract)
- `lib/publicationReadiness.ts` (publication readiness)
- `lib/adminAuth.ts` and `lib/rbacServer` (authorization)
- `lib/audit.ts` (audit contract)
- `app/api/admin/properties/route.ts` and `app/api/properties/route.ts` (admin/public API behavior)
- `app/admin/properties/page.tsx` (existing admin destination)
- `app/properties/[id]/page.tsx` and related property routes (public destination)

Record the actual `sourceType` semantics and canonical creation requirements in code comments or the implementation notes, not in a new competing status field.

## Target File Structure

Create the following domain modules, adapting names only when an existing repository convention is stronger:

```text
lib/imports/
├── core/
│   ├── types.ts
│   ├── state-machine.ts
│   ├── batch-service.ts
│   ├── record-service.ts
│   ├── mapping-service.ts
│   ├── issue-service.ts
│   ├── provenance-service.ts
│   ├── idempotency-service.ts
│   ├── commit-lock.ts
│   └── execute-import.ts
├── parser/
│   ├── parser.ts
│   ├── csv-parser.ts
│   ├── json-parser.ts
│   ├── format-detection.ts
│   └── structure-discovery.ts
├── normalization/
│   ├── price.ts
│   ├── area.ts
│   ├── bedrooms.ts
│   ├── dates.ts
│   ├── booleans.ts
│   └── locations.ts
├── duplicate/
│   ├── duplicate-engine.ts
│   └── property-signals.ts
├── relations/
│   └── owner-resolution.ts
├── adapters/
│   └── property/
│       ├── adapter.ts
│       ├── fields.ts
│       ├── mappings.ts
│       ├── validation.ts
│       └── canonical-service.ts
└── registry/
    └── import-registry.ts
```

`lib/imports/core` must not import React components, route handlers, or UI-specific Prisma code.

## Workstream 1: Canonical ManualProperty Service

### Goal
Establish one domain-level service that existing admin creation and universal import can use without coupling import code to Prisma payload details.

### Requirements

- Extract the business mutation from `app/api/admin/properties/route.ts`, or introduce a shared `ManualPropertyService` if no suitable service exists.
- Accept a domain-level input, not `Prisma.ManualPropertyCreateInput`.
- Set `sourceType = 'MANUAL'` for compatibility with current downstream consumers.
- Default imported records to `DRAFT` unless the existing approved creation path explicitly requires another status.
- Reuse `canonicalizePropertyImport` and `validateCanonicalLocation` where appropriate.
- Resolve an existing valid Agent before mutation.
- Never create an Agent implicitly.
- Keep source metadata and import provenance separate.
- Return affected resource information for batch-level deduplicated revalidation.
- Do not call `revalidatePath` independently for every imported record.
- Preserve existing lifecycle, moderation, publication, and audit behavior.

### Validation gate

Create service tests proving:

- required `agentId` is enforced
- imported creation produces a valid native `ManualProperty`
- status defaults to the existing non-public lifecycle state
- `sourceType = 'MANUAL'` remains compatible with current queries
- missing/ambiguous ownership blocks creation
- the service does not create a fake Agent

## Workstream 2: Prisma Ingestion Schema

Add a migration to `prisma/schema.prisma` with ingestion-only models:

- `ImportBatch`
- `ImportRecord`
- `ImportMapping`
- `ImportIssue`
- `ImportSourceProfile`
- request idempotency storage, if not covered by an existing reusable utility

### Required fields

`ImportBatch` must include entity, operation, mode, source metadata, checksum, adapter version, mapping version, status, cancellation fields, timestamps, and aggregate counters.

`ImportRecord` must include batch ID, `sourceRecordId`, `sourceRow`, `sourcePath`, raw/normalized/canonical payload storage, record status, issue/duplicate metadata, generic target identity, typed `manualPropertyId`, source metadata, ownership policy, and timestamps.

`ImportMapping` must be a batch snapshot, not a live pointer to a source profile.

`ImportIssue` must include stage, severity, code, source path, message, suggested action, resolution state, resolver, resolution timestamp, and resolution note.

`ImportSourceProfile` must be reusable and versioned.

### Constraints and indexes

- Unique `(batchId, sourceRecordId)` only prevents duplicate source rows within one batch.
- Do not impose a global unique constraint on source record IDs across batches.
- Index batch status/time, batch/entity/source, record batch/status, record target, typed property target, and issue batch/severity/resolution.
- Treat generic target identity as application-level polymorphism, not a foreign key.
- Enforce Phase 1 consistency between `targetEntityType`, `targetEntityId`, and `manualPropertyId` in the service layer.
- Use JSON/JSONB for payloads and issue details, with a storage-reference abstraction for future object storage.

### Validation gate

Run Prisma generation and migration verification against the repository's migration strategy. Do not apply a production migration from the agent session.

## Workstream 3: Core Types and State Machine

Implement typed states and legal transitions.

### Batch states

```text
UPLOADED
ANALYZING
READY_FOR_REVIEW
MAPPING_REVIEW
NORMALIZING
VALIDATING
DUPLICATE_REVIEW
READY_TO_COMMIT
COMMITTING
COMMITTED
PARTIALLY_COMMITTED
FAILED
RETRYING
CANCELLED
```

Mapping and duplicate review are conditional. `PARTIALLY_COMMITTED` means eligible records committed but one or more records failed or were skipped.

### Record states

```text
DISCOVERED
NORMALIZED
READY
WARNING
ERROR
DUPLICATE_REVIEW
STAGED
COMMITTED
SKIPPED
```

Implement transition guards so stale normalized/validated results cannot remain commit-ready after a mapping or ownership change.

## Workstream 4: Parsers and Discovery

Implement:

```ts
interface UniversalParser {
  canParse(input: ParserInput): boolean
  inspect(input: ParserInput): Promise<StructureDiscovery>
  parse(input: ParserInput): AsyncIterable<RawSourceRecord>
}

interface RawSourceRecord {
  sourceRecordId: string
  sourceRow: number | null
  sourcePath: string | null
  raw: unknown
}
```

### CSV

Use a real parser library, not `split(',')`. Support quoted fields, escaped quotes, multiline values, BOM, comma/semicolon/tab delimiter detection, empty cells, line endings, and row limits.

### JSON

Support array roots, object roots, and nested collection candidates such as `data.results`, `data.items`, `response.properties`, and `projects`. Preserve nested raw structures and source paths.

### Parser boundary

Parsers must not import `ManualProperty`, Prisma models, or admin modules.

### Validation gate

Unit-test parser behavior with fixtures for quoted commas, escaped quotes, multiline CSV, BOM, delimiters, nested JSON, empty rows, and source-location reporting.

## Workstream 5: Normalization and Property Adapter

Implement reusable deterministic normalizers for:

- price and currency, including INR lakh/crore forms
- area and area units
- bedrooms/BHK
- bathrooms
- dates
- booleans
- phone/email/URL where fields exist
- property type and intent
- amenities
- country/city/community/location

Never invent uncertain values. Preserve original values in raw data. Use warnings or unresolved values for inputs such as `Large` area or `Contact for Price`.

### Adapter contract

The Property adapter must provide:

- field definitions with required/recommended/optional status
- source aliases and deterministic mapping
- field-level confidence
- normalization
- canonical mapping
- canonical validation
- owner resolution input
- duplicate signal definitions
- CREATE/UPDATE/UPSERT semantics
- adapter version
- commit preparation

### Mapping precedence

```text
exact field name
→ known alias
→ source profile
→ deterministic semantic mapping
→ optional AI suggestion
→ explicit admin acceptance
```

AI suggestions, if supported, are never production authority.

## Workstream 6: Duplicate and Ownership Services

### Ownership

Implement explicit `resolveOwner` semantics:

- exact source Agent identifier -> resolved
- one deterministic match -> resolved
- multiple matches -> review
- missing source owner -> configured existing import/system Agent
- no valid configured owner -> blocked/review

Persist the policy used, such as `source-agent`, `existing-agent-match`, or `configured-system-agent`.

### Duplicate engine

Implement a generic duplicate engine with Property-specific signals:

- source provider plus source listing ID: deterministic identity
- source URL: strong identity
- normalized source record identity: deterministic identity
- title plus city/community: potential candidate
- cross-source fuzzy similarity: potential candidate only

Never auto-merge uncertain title/location matches.

Keep request/business idempotency separate from cross-source duplicate detection.

## Workstream 7: Batch APIs and Execution

Create thin routes under:

```text
app/api/admin/bulk-import/
```

Required endpoints:

```text
POST  /api/admin/bulk-import
POST  /api/admin/bulk-import/[batchId]/analyze
GET   /api/admin/bulk-import/[batchId]
PATCH /api/admin/bulk-import/[batchId]/mapping
POST  /api/admin/bulk-import/[batchId]/normalize
POST  /api/admin/bulk-import/[batchId]/validate
POST  /api/admin/bulk-import/[batchId]/duplicates
POST  /api/admin/bulk-import/[batchId]/owner-resolution
POST  /api/admin/bulk-import/[batchId]/records/[recordId]/resolve
POST  /api/admin/bulk-import/[batchId]/commit
POST  /api/admin/bulk-import/[batchId]/cancel
GET   /api/admin/bulk-import/[batchId]/progress
GET   /api/admin/bulk-import/[batchId]/reports/[reportType]
GET   /api/admin/bulk-import/history
```

### Rules

- Every route uses `requireAdminSession` and centralized authorization.
- Upload creates/stores a batch only.
- Analysis and review APIs mutate staging state only.
- Mapping changes invalidate all downstream derived state.
- Ownership changes invalidate canonical readiness and require remapping/revalidation.
- Reports derive from persisted records/issues.
- Commit requires explicit confirmation and an `Idempotency-Key`.
- Commit atomically transitions `READY_TO_COMMIT -> COMMITTING` in the database.
- A repeated request with the same idempotency key returns the original result.
- Record identity checks prevent duplicates after retries or new batches.
- Final canonical validation and deterministic identity checks run immediately before mutation.
- Execute records in controlled chunks with a transaction per record.
- Update counters atomically or derive them from record states.
- Deduplicate affected paths and revalidate after batch execution.
- Cancellation is accepted only before `COMMITTING`.

Expose the execution boundary as:

```ts
queueImport(batchId) -> executeImport(batchId)
```

Phase 1 may call `executeImport` directly. Do not introduce a queue dependency.

## Workstream 8: Admin UI After Backend Proof

Create:

```text
app/admin/bulk-import/page.tsx
app/admin/bulk-import/history/page.tsx
app/admin/bulk-import/templates/page.tsx
app/admin/bulk-import/[batchId]/page.tsx
```

Use the existing `AdminShell` and visual conventions.

Wizard steps:

```text
Import Center
→ Entity
→ Operation
→ Upload
→ Discovery
→ Mapping
→ Normalization
→ Validation
→ Ownership / Duplicate Review
→ Source / Normalized / Canonical Preview
→ Commit Confirmation
→ Processing
→ Result
```

The UI renders backend `ImportBatch.status`; it must not maintain a competing frontend state machine. It polls persisted progress and displays real counters.

The result page must link to `/admin/properties` and existing property routes, never an importer-specific property listing.

## Workstream 9: Legacy Importer Migration

Refactor `app/api/admin/properties/bulk-import/route.ts` to delegate to the universal engine while preserving its currently accepted payloads during migration.

Preserve compatibility for:

- single property payloads
- bulk property arrays
- nested `source` and `property` entries
- existing canonical v1 inputs

Do not leave a second property creation loop in the legacy route. After parity tests pass, the route should become a compatibility adapter or redirect to the Import Center according to existing routing needs.

## Workstream 10: Tests

Add focused tests under existing Jest conventions, likely in `tests/unit/imports/` and `tests/integration/imports/`.

### Unit tests

- state transitions and illegal transitions
- CSV parser behavior
- JSON collection discovery
- source row/path preservation
- delimiter and header discovery
- price conversion
- currency normalization
- area conversion
- BHK/bedroom conversion
- date conversion
- boolean conversion
- location normalization
- field mapping precedence and confidence
- mapping invalidation
- owner resolution
- duplicate identity versus advisory candidates
- issue resolution state
- request idempotency
- record/business idempotency
- counter derivation/update safety

### Integration tests

- migration and Prisma model access
- create batch and stage records
- analyze -> normalize -> validate -> preview
- strict mode blocks invalid commit
- partial mode commits valid records and produces `PARTIALLY_COMMITTED`
- missing/ambiguous Agent owner remains review/blocking
- concurrent commit attempts allow one state transition
- retry after timeout does not duplicate properties
- committed `ImportRecord.manualPropertyId` is correct
- provenance is queryable
- legacy importer delegates correctly

### End-to-end connectivity test

Use a heterogeneous CSV or JSON fixture and verify:

```text
source file
→ ImportBatch
→ ImportRecord raw/normalized/canonical payloads
→ ManualProperty
→ existing admin property API
→ existing admin property listing
→ eligible public property query
→ search/filter query
→ detail route/slug behavior
→ owner and developer relationships
→ deduplicated revalidation
```

### Native behavior equivalence

Create equivalent records through:

1. Existing ManualProperty admin workflow.
2. Universal Import commit.

Compare canonical business fields, lifecycle defaults, required relations, publication readiness behavior, admin visibility, public eligibility, and downstream queries. Provenance metadata is expected to differ.

## Workstream 11: Validation Commands

At minimum, run:

```text
npm test -- --runInBand
npx tsc --noEmit
npx prisma generate
npm run build
```

Run the narrowest relevant test after each implementation slice, then run the full suite and production build before completion. Validate migrations against the repository's configured environment; do not modify production schema from this task.

## Definition of Done

- [ ] Canonical ManualProperty service boundary exists and is covered by tests.
- [ ] `sourceType = 'MANUAL'` compatibility is preserved and provenance is separate.
- [ ] Prisma ingestion models and migration exist with deliberate indexes/constraints.
- [ ] CSV and JSON parsers work without browser-side full-import logic.
- [ ] Raw source location is preserved.
- [ ] Raw, normalized, and canonical payloads are persisted distinctly.
- [ ] Registry and Property adapter contracts are implemented.
- [ ] Field definitions and deterministic mapping work.
- [ ] Normalization does not invent uncertain data.
- [ ] Ownership resolution never silently creates or randomly selects an Agent.
- [ ] Duplicate analysis is advisory except for deterministic identity/idempotency checks.
- [ ] Strict and partial modes work.
- [ ] Mapping/ownership edits invalidate stale analysis.
- [ ] Commit is the only ManualProperty mutation path.
- [ ] Commit locking is database-enforced.
- [ ] Request and record/business idempotency work.
- [ ] `COMMITTED`, `PARTIALLY_COMMITTED`, `FAILED`, and `CANCELLED` semantics are observable.
- [ ] Revalidation is deduplicated after batch commit.
- [ ] Admin API endpoints are thin and authorized.
- [ ] Backend workflow is proven before UI implementation.
- [ ] Import Center, wizard, history, and batch detail use existing AdminShell patterns.
- [ ] Legacy property importer delegates to the universal engine.
- [ ] Imported records appear through existing admin/public/search/filter contracts.
- [ ] Native-behavior equivalence test passes.
- [ ] Full tests, TypeScript validation, Prisma generation, migration verification, and production build pass.
- [ ] No parallel business tables, mock success responses, unsafe rollback, or TODO-only implementation remains.
