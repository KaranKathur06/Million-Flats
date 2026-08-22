# MillionFlats Universal Import Platform
## Phase 1 Design: Universal Foundation + Property Vertical Slice

**Date:** 2026-08-21
**Status:** Approved design baseline
**Scope:** Universal ingestion foundation proven through CSV/JSON Property imports into the canonical `ManualProperty` workflow.

## 1. Objective and Boundary

Phase 1 proves that heterogeneous external data can enter MillionFlats through a reusable ingestion platform and become native canonical property data.

```text
CSV / JSON
  -> Universal parser
  -> Import batch and staged records
  -> Normalization
  -> Canonical mapping
  -> Deterministic validation
  -> Identity and duplicate analysis
  -> Review and preview
  -> Commit boundary
  -> ManualProperty
  -> Existing admin, public, search, filters, relationships, and revalidation
```

No `Property`, `ImportedProperty`, `ImportedProperties`, or other parallel business table is introduced. `ManualProperty` remains the canonical property destination.

Phase 1 includes:

- reusable import registry and adapter contracts
- CSV and JSON ingestion
- source structure discovery
- raw, normalized, and canonical representations
- staged batch and record provenance
- deterministic mappings and normalization
- field-level confidence and review
- ownership resolution
- advisory duplicate analysis
- strict and partial validation modes
- synchronous, chunked execution behind a future worker boundary
- explicit preview and commit
- existing admin authorization, audit, lifecycle, and revalidation integration
- admin Import Center, wizard, history, and batch details
- migration of the legacy property importer through the universal engine
- end-to-end connectivity and native-behavior equivalence tests

Phase 1 does not include XLSX, XML, asynchronous workers, unsafe rollback, media downloading, AI-controlled production mapping, or adapters for other entities. The parser and registry contracts must allow those later additions without changing the engine, batch model, API state machine, or wizard architecture.

## 2. Existing Architecture Constraints

The implementation must verify these facts before coding against them:

- `ManualProperty` is the canonical property model.
- `ManualProperty.agentId` is required.
- Existing `sourceProvider`, `sourceUrl`, and `sourceListingId` fields are business-level source metadata, not a replacement for ingestion provenance.
- Existing `ManualProperty` status/lifecycle remains authoritative. No competing `IMPORTED` status is added.
- `requireAdminSession` and the existing RBAC gate remain the authorization boundary.
- Existing audit logging remains authoritative for business mutations.
- Existing admin/public/search/revalidation paths continue to consume canonical records.
- The actual semantics of `ManualProperty.sourceType` must be verified. Imported records must not masquerade as human-entered data if that enum means human entry; if the existing workflow requires `MANUAL`, preserve it without overloading it as provenance.

The canonical business service must be established before adapter implementation. Prefer the existing `ManualPropertyService.create(...)` boundary, or extract one from the current property importer if no shared service exists. The service must not become an import-specific rules container.

## 3. Domain Model

### ImportBatch

Stores the immutable import definition and mutable execution state:

- identity and entity type
- operation: `CREATE`, `UPDATE`, or `UPSERT`
- mode: `STRICT` or `PARTIAL`
- source filename, format, MIME type, byte size, checksum
- source profile key and mapping version
- adapter version
- uploaded-by user and timestamps
- status and cancellation metadata
- total, ready, warning, error, duplicate, created, updated, skipped, and failed counters
- request idempotency result metadata

The import definition is immutable after analysis begins. Status and counters are mutable execution state.

### ImportRecord

Stores one source record independently:

- batch ID
- `sourceRecordId`
- source row and source path
- raw source payload or a raw-payload storage reference
- normalized payload
- canonical payload
- field mapping snapshot reference/version
- field-level mapping confidence and derived overall confidence
- record status
- issue and duplicate metadata
- generic `targetEntityType` and `targetEntityId`
- typed Phase 1 `manualPropertyId` relation
- source provider, source URL, and source listing ID
- ownership-resolution policy used
- created/updated timestamps

The generic target identity is application-level polymorphic metadata, not a database foreign key. Phase 1 enforces:

```text
targetEntityType = PROPERTY
<-> manualPropertyId is present
<-> targetEntityId = manualPropertyId
```

### ImportMapping

Stores the mapping snapshot actually used by a batch, separate from reusable source profiles:

- source path
- canonical field
- status: accepted, review, or ignored
- confidence
- deterministic transformation rule/version
- reviewer and review timestamp
- mapping version

Changing a mapping increments the batch mapping version and invalidates normalized data, canonical data, validation, duplicate results, and commit readiness.

### ImportSourceProfile

Stores reusable source-specific defaults:

- source/provider key
- entity type
- mapping defaults
- normalization defaults
- relation rules
- profile version
- active/drift metadata
- author and timestamps

A profile supplies initial mappings. A batch owns an immutable snapshot of the reviewed mapping actually used.

### ImportIssue

Stores actionable, auditable issues:

- batch and record IDs
- stage
- severity
- machine-readable code
- source path
- message
- suggested action
- resolution state
- resolved-by user, resolution timestamp, and resolution note

Reports derive from persisted issue state and do not rerun validation during download.

### Raw payload retention

Raw data is retained through an abstraction that supports JSON/JSONB for modest Phase 1 imports and object-storage references at larger scale:

```text
ImportRecord.rawPayload
or
ImportRecord.rawPayloadReference
```

Source files are private and access-controlled. Artifacts are generated on demand where practical.

## 4. Internal Contracts

### Raw source record

```ts
interface RawSourceRecord {
  sourceRecordId: string
  sourceRow: number | null
  sourcePath: string | null
  raw: unknown
}
```

CSV errors identify rows. JSON errors identify paths such as `data.results[486].price`.

### Parser

```ts
interface UniversalParser {
  canParse(input: ParserInput): boolean
  inspect(input: ParserInput): Promise<StructureDiscovery>
  parse(input: ParserInput): AsyncIterable<RawSourceRecord>
}
```

The parser understands file structure only. It does not import Prisma models or MillionFlats business concepts.

### Adapter

```ts
interface ImportAdapter<TCanonical> {
  key: string
  displayName: string
  adapterVersion: number
  supportedFormats: Array<'csv' | 'json'>
  supportedOperations: Array<'CREATE' | 'UPDATE' | 'UPSERT'>

  getFieldDefinitions(): ImportFieldDefinition[]
  discover(input: DiscoveryInput): DiscoveryResult
  suggestMappings(input: MappingInput): MappingSuggestion[]
  normalize(input: NormalizationInput): NormalizationResult
  mapCanonical(input: CanonicalMappingInput): CanonicalPayloadResult<TCanonical>
  validate(input: ValidationInput<TCanonical>): ValidationResult
  getDuplicateSignals(): DuplicateSignalDefinition[]
  resolveRelations(input: RelationInput<TCanonical>): RelationResolution
  prepareCommit(input: CommitPreparationInput<TCanonical>): CommitPreparation
}
```

The engine owns orchestration, staging, counters, state transitions, idempotency, locking, audit coordination, provenance, and commit safety. The adapter owns entity semantics and supplies the entity-specific commit preparation. An adapter cannot bypass the engine to mutate business data.

The registry exposes field definitions so the mapping UI is generated from adapters rather than hardcoded per entity.

### Mapping precedence

```text
Exact canonical name
  -> known alias
  -> source profile
  -> deterministic semantic mapping
  -> AI suggestion, if configured
  -> explicit human review
```

AI can suggest mappings but cannot silently determine production fields. Mapping confidence is authoritative at field level; record-level confidence is derived.

## 5. Property Adapter

The Property adapter produces a domain-level canonical input, not a Prisma create input:

```ts
interface CanonicalManualPropertyInput {
  title: string
  agentId: string
  developerId?: string | null
  sourceProvider?: string | null
  sourceUrl?: string | null
  sourceListingId?: string | null
  propertyType?: string | null
  intent?: string | null
  price?: number | null
  currency?: string
  constructionStatus?: string | null
  shortDescription?: string | null
  bedrooms?: number
  bathrooms?: number
  squareFeet?: number
  countryCode?: string
  countryIso2?: string | null
  city?: string | null
  community?: string | null
  address?: string | null
  latitude?: number | null
  longitude?: number | null
  developerName?: string | null
  amenities?: unknown
  paymentPlanText?: string | null
  emiNote?: string | null
  tour3dUrl?: string | null
}
```

The adapter defines Property-specific requiredness, aliases, normalizers, enum handling, and duplicate signals. A minimum viable imported property requires an identifiable title and a resolved required owner; other requirements must match the actual canonical creation service and business rules.

### Ownership resolution

Ownership is a first-class operation:

```text
source agent identifier
  -> exact existing Agent
  -> ambiguous candidates: REVIEW
  -> no source agent: explicitly configured existing import/system Agent
  -> no configured owner: BLOCKED / REVIEW
```

The importer must never silently create an Agent merely to satisfy the foreign key, choose the first admin, choose the current operator, or choose a random agent. The configured system Agent is selected by an authorized administrator and its resolution policy is stored in provenance.

### Property operation semantics

- `CREATE`: create only; deterministic identity collision becomes duplicate/review.
- `UPDATE`: update an explicitly identified existing property; fuzzy title/location alone is insufficient.
- `UPSERT`: update on deterministic identity, otherwise create.

Idempotency and cross-source duplicate detection remain separate:

```text
same provider + source identity = idempotency
other provider + similar real-world property = duplicate candidate
```

## 6. State Machine

Batch states:

```text
UPLOADED
ANALYZING
READY_FOR_REVIEW
MAPPING_REVIEW        (conditional)
NORMALIZING
VALIDATING
DUPLICATE_REVIEW      (conditional)
READY_TO_COMMIT
COMMITTING
COMMITTED
PARTIALLY_COMMITTED
FAILED
RETRYING
CANCELLED
```

Record states:

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

Mapping and duplicate review states are conditional. A batch with fully deterministic mappings and no duplicate candidates proceeds without those review states.

Terminal semantics:

- `COMMITTED`: all eligible records committed successfully.
- `PARTIALLY_COMMITTED`: valid records committed in partial mode and one or more records failed/skipped.
- `FAILED`: no business records committed or the batch-level operation failed before useful progress.
- `CANCELLED`: cancelled before commit begins.

Mapping or ownership changes invalidate downstream analysis and commit readiness. Ownership changes require canonical remapping and revalidation.

## 7. API and Mutation Boundaries

Routes remain thin: authenticate, authorize, parse request, call a domain service, return a response.

```text
POST /api/admin/bulk-import
POST /api/admin/bulk-import/[batchId]/analyze
GET  /api/admin/bulk-import/[batchId]
PATCH /api/admin/bulk-import/[batchId]/mapping
POST /api/admin/bulk-import/[batchId]/normalize
POST /api/admin/bulk-import/[batchId]/validate
POST /api/admin/bulk-import/[batchId]/duplicates
POST /api/admin/bulk-import/[batchId]/owner-resolution
POST /api/admin/bulk-import/[batchId]/records/[recordId]/resolve
POST /api/admin/bulk-import/[batchId]/commit
POST /api/admin/bulk-import/[batchId]/cancel
GET  /api/admin/bulk-import/[batchId]/progress
GET  /api/admin/bulk-import/[batchId]/reports/[reportType]
GET  /api/admin/bulk-import/history
```

`POST /bulk-import` creates a batch and stores source data only. It never starts commit or mutates `ManualProperty`.

Only the commit service may invoke the canonical `ManualProperty` creation/update service. Parser, mapping, normalization, validation, duplicate, preview, and review paths cannot mutate business records.

### Commit safety

Commit requires:

- authorized commit permission
- `READY_TO_COMMIT`
- explicit operation and exact record-count confirmation
- no unresolved blocking issues in strict mode
- resolved ownership for every committed record
- request idempotency key
- final canonical validation and deterministic identity recheck

The commit-lock service performs a database-enforced atomic transition:

```text
READY_TO_COMMIT -> COMMITTING
```

Only one caller can win. A duplicate request with the same idempotency key returns the stored original result. Record-level identity checks prevent duplicate business creation across retries and batches.

Cancellation is allowed only before `COMMITTING`. Phase 1 does not pretend to cancel an active synchronous commit.

## 8. Service Layout

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

Core modules must not import Admin UI components, route handlers, or UI-specific Prisma logic. The engine depends on domain/application services.

## 9. Persistence and Transaction Strategy

The migration adds only ingestion structures:

- `ImportBatch`
- `ImportRecord`
- `ImportMapping`
- `ImportIssue`
- `ImportSourceProfile`
- request-idempotency storage

Unique constraints are deliberate:

- `(batchId, sourceRecordId)` prevents duplicate rows within one batch.
- Cross-batch identity is handled through provider/source identity and canonical business checks, not an overly broad global unique constraint.

Phase 1 execution is synchronous and chunked:

```text
executeImport(batchId)
  -> atomic commit lock
  -> process records in chunks
  -> transaction per record
  -> atomically derive/update counters
  -> terminal batch state
  -> deduplicated post-commit revalidation
```

Record transactions include final validation, identity checks, canonical service mutation, target linking, provenance, and audit metadata. A record failure rolls back only its own transaction in partial mode.

Counters must not use unsafe read-modify-write operations. They are either atomically updated or derived from persisted record states.

Revalidation is coordinated after batch commit and deduplicated across affected resources. It is not executed independently inside every record transaction.

The execution boundary remains worker-compatible:

```ts
queueImport(batchId) -> executeImport(batchId)
```

Phase 1 dispatches directly. A later worker replaces dispatch without rewriting the engine.

## 10. Admin UI

Routes:

```text
/admin/bulk-import
/admin/bulk-import/history
/admin/bulk-import/templates
/admin/bulk-import/[batchId]
```

The UI uses the existing `AdminShell`. The backend batch state is authoritative; React does not maintain a competing state machine.

Wizard sequence:

```text
Import Center
  -> Entity
  -> Operation
  -> Upload
  -> Discovery
  -> Mapping
  -> Normalization
  -> Validation
  -> Ownership / Duplicate Review
  -> Source / Normalized / Canonical Preview
  -> Commit Confirmation
  -> Processing
  -> Result
  -> Existing /admin/properties
```

The browser handles upload, review, progress display, and reports. Server services handle parsing, transformation, validation, duplicate analysis, staging, and commit.

The final action states the exact operation, for example:

```text
Commit 98 valid properties
```

The result links to the existing property administration surface, never to an importer-specific property directory.

## 11. Implementation Sequence

1. Verify `sourceType` semantics, `ManualProperty` lifecycle, and existing creation behavior.
2. Extract or define the canonical `ManualProperty` service boundary.
3. Add and validate the Prisma ingestion migration.
4. Add import domain types, state machine, provenance, and commit-lock services.
5. Implement parser abstraction and CSV/JSON parsers.
6. Implement reusable normalization services.
7. Implement generic duplicate engine and Property signals.
8. Implement owner-resolution service.
9. Implement Property adapter and generated field definitions.
10. Implement analyze, mapping, normalize, validate, duplicate, review, and preview services/APIs.
11. Implement commit with request/record idempotency and post-commit revalidation.
12. Build Import Center, wizard, history, and batch detail pages.
13. Delegate the legacy property importer to the universal engine.
14. Run unit, integration, connectivity, native-equivalence, migration, and build validation.

## 12. Acceptance Criteria

### Functional

- `/admin/bulk-import` is authorized and uses the existing AdminShell.
- CSV and JSON files can be uploaded without pre-conversion.
- Raw source location is preserved for every record.
- Mapping, normalization, validation, ownership, duplicate analysis, preview, and commit are distinct stages.
- Partial and strict modes behave as specified.
- Mapping and ownership changes invalidate stale downstream analysis.
- Commit is explicit, idempotent, database-locked, and the only business mutation path.
- Imported records target `ManualProperty`, never a parallel property table.
- Existing source metadata and full ingestion provenance are preserved.
- Legacy property import delegates through the universal engine.
- Unsafe rollback is not exposed.

### Connectivity

A committed property must be indistinguishable from a manually created property to every intended downstream consumer:

```text
ManualProperty
  -> existing Property API
  -> admin properties
  -> eligible public property path
  -> search
  -> filters
  -> detail/slug route
  -> relationships
  -> cache and path revalidation
```

### Tests

- parser behavior and source locations
- normalization for price, area, BHK, date, boolean, and location
- mapping confidence and invalidation
- ownership resolution and governance
- idempotency at request and record/business levels
- duplicate identity versus fuzzy candidate behavior
- state transition and database commit-lock behavior
- strict, partial, cancelled, failed, and partially committed batches
- canonical service integration
- existing admin/public/search connectivity
- native-behavior equivalence between manual creation and import creation
- Prisma migration verification and production build

## 13. Non-Negotiable Principle

> If adding the next adapter requires modifying the parser, batch engine, staging model, commit orchestration, Admin wizard architecture, or API state machine, the Phase 1 implementation has violated the Universal Import contract.

Phase 2 should primarily add an entity-specific adapter and register it. The universal engine remains unchanged.
