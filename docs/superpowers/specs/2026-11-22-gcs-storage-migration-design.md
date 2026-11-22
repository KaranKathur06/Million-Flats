# MillionFlats AWS S3 to Google Cloud Storage Migration Design

## Status

Approved for implementation by the repository workflow defaults where the user was unavailable.

## Goal

Migrate MillionFlats backend storage operations from Amazon S3 to Google Cloud Storage while preserving existing object keys, database relationships, API contracts, public asset delivery, private document access, and the ability to roll back.

This is an infrastructure migration. It does not redesign storage data models or change unrelated application behavior.

## Verified Context

- Source bucket: `millionflats-prod-assets`
- Source region: `eu-north-1`
- GCS destination bucket: `millionflats-media`
- GCS project: `project-edc515f9-5e87-4784-9cf`
- Service account: `millionflats-backend-storage@project-edc515f9-5e87-4784-9cf.iam.gserviceaccount.com`
- Transfer completed with 394 source objects and no transfer errors.
- The repository uses `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`, a central `lib/s3.ts` module, CloudFront signed delivery, and direct SDK use in multiple routes.
- Existing database fields use relative keys, full AWS URLs, CloudFront URLs, and provider-neutral file metadata.
- No GCS SDK or GCS configuration is currently present.

## Decisions

1. **Provider abstraction:** A centralized storage provider will own GCS client initialization and storage operations.
2. **Compatibility:** Existing AWS-facing helper names will be retained only as deprecated adapters during a bounded transition period.
3. **Keys:** Existing object keys remain canonical and unchanged.
4. **Public delivery:** CloudFront remains temporarily configured. GCS becomes the origin only after CDN origin access is verified.
5. **Private delivery:** GCS signed read URLs are used for private and protected documents.
6. **Authentication:** Production uses a protected service-account JSON secret or mounted key file. `GOOGLE_APPLICATION_CREDENTIALS` or inline secure secret injection will be supported.
7. **Schema:** Prisma fields and relationships are not changed unless a live database issue demonstrates a technical requirement.
8. **Fallback:** AWS credentials remain available temporarily, but new application uploads are routed to GCS.
9. **Database URLs:** Legacy URLs are resolved centrally. No blind global database replacement is performed.
10. **Deployment:** Code deploy, controlled cutover, validation, then AWS retirement.

## Architecture

### Central provider

Create `lib/storage/` with:

- `storage.types.ts`: typed provider operations and provider-neutral metadata
- `storage.errors.ts`: predictable domain and provider errors
- `storage.config.ts`: validated GCP configuration
- `gcs.provider.ts`: official `@google-cloud/storage` implementation
- `index.ts`: singleton export and compatibility entry point

Required operations:

- `uploadFile`
- `uploadBuffer`
- `downloadFile`
- `getFileMetadata`
- `deleteFile`
- `deleteFiles`
- `fileExists`
- `getPublicUrl`
- `getSignedReadUrl`
- `getSignedUploadUrl`
- `copyFile`

Provider initialization must be lazy and cached. Credentials must never be logged or returned through API responses.

### Authentication contract

Environment variables:

- `GCP_PROJECT_ID=project-edc515f9-5e87-4784-9cf`
- `GCP_STORAGE_BUCKET=millionflats-media`
- `GCP_SERVICE_ACCOUNT_KEY_PATH` for a mounted key file
- `GOOGLE_APPLICATION_CREDENTIALS` for standard application credentials
- `GCP_SERVICE_ACCOUNT_JSON` only if the hosting environment supports securely injected inline JSON

No variable may use a `NEXT_PUBLIC_` prefix.

Local development and tests may use emulator, ADC, or explicitly injected credentials. Missing production credentials should fail storage operations with explicit configuration errors.

Credential precedence is:

1. `GOOGLE_APPLICATION_CREDENTIALS`
2. `GCP_SERVICE_ACCOUNT_KEY_PATH`
3. `GCP_SERVICE_ACCOUNT_JSON`
4. Application Default Credentials

The resolved project ID must match `GCP_PROJECT_ID`. Malformed JSON, missing required fields, unreadable key files, mismatched project IDs, and unavailable ADC identities are configuration errors and must not be converted into public-asset fallback behavior.

Service-account-based signed read and upload URLs must be tested through the actual runtime identity. Runtime credentials must have the permissions required by the signing implementation, including the signing operation used by the hosting environment. ADC attached identity is preferred for supported hosts.

### Key conventions

Preserve:

- `public/...`
- `private/...`
- `protected/...`
- Existing project, developer, agency, agent, ecosystem, blog, banner, and video folder structures

Provider key validation accepts all three canonical prefixes and rejects traversal,
protocol-prefixed values, malformed slashes, and keys outside canonical visibility prefixes.
The compatibility adapter will preserve `protected/` as a valid private key classification.

The existing filename builders and timestamp behavior remain unchanged unless a route already has a verified defect.

### Public URL resolver

Create or evolve the central asset resolver to:

- Accept relative keys
- Accept GCS URLs
- Accept legacy S3 URLs
- Accept CloudFront and custom CDN URLs
- Extract keys only from recognized URL formats
- Use `CDN_BASE_URL` when configured
- Fall back to GCS public URLs only for assets explicitly approved for public access
- Recognize `storage.googleapis.com` and `storage.cloud.google.com` GCS hosts
- Add the final approved GCS delivery hostname to `next.config.js` remote image patterns
- Derive public keys only from normalized `public/` prefixes
- Never synthesize public URLs for `private/` or `protected/` keys

Private keys must never be transformed into unrestricted public CDN URLs.

### Private access

GCS signed read URLs must be generated with short-lived TTLs. CloudFront signed URLs may remain for the validation period if already configured and if the origin is switched or maintained safely.

Private documents include agent documents, developer documents, agency documents, verification documents, lead magnets, and protected floor plans.

## Data Compatibility

No blind string replacement is performed.

A migration report will inventory:

- Full S3 URLs
- CloudFront URLs
- Relative object keys
- GCS URLs
- External URLs
- Duplicate or malformed values

Before updates, the migration inventory will classify representative fields from every Prisma
storage model, including URL fields, `s3Key` fields, `storageKey` fields, `mediaUrl`,
`fileUrl`, `documentUrl`, `imageUrl`, and embedded JSON/TipTap/blog content. Canonical-key
derivation is idempotent: recognized AWS URL, GCS URL, and CDN URL formats produce the
normalized relative key; malformed URLs and external URLs are reported and left unchanged;
ambiguous or conflicting URL/key pairs are never auto-replaced.

Batch updates are limited to bounded batches, use restart checkpoints, and are processed with
row-level version checks where concurrent updates are possible. Each batch writes a report
containing row, field, old value, derived key, new value, status, and error. Partial batches
must be restartable without changing already verified rows.

Database fields will be changed only after:

1. Extracting keys from recognized legacy formats
2. Verifying the equivalent GCS object exists
3. Batch processing with a dry-run
4. Idempotent updates
5. A pre-update database backup
6. Restartable progress and error reporting

Existing object keys remain untouched. Provider and bucket information remain centralized in configuration.

## Route Migration

Every storage operation must be routed through the provider interface, including:

- Property and manual-property media
- Project galleries, videos, floor plans and brochures
- Agent and developer documents and profile images
- Agency, ecosystem and banner media
- Blog images
- Lead magnets
- Video reels
- Bulk import and storage cleanup workers
- Direct AWS SDK calls in API routes

The frontend API contracts remain unchanged where practical. Fields such as `key`, `s3Key`, `uploadUrl`, `objectUrl`, and `fileUrl` remain compatible during transition.

## Error Handling

Storage errors must:

- Be typed and predictable
- Preserve upstream HTTP status behavior where practical
- Prevent credential values from appearing in logs
- Distinguish missing configuration, missing objects, permission failures, network failures, and unsupported types
- Treat deletion of an already nonexistent object as safe only where provider semantics allow

## Testing

Add focused tests for:

- GCS configuration validation
- Public URL resolution
- Legacy S3 and CDN key extraction
- Signed upload/read URLs
- Upload and retrieval
- Metadata and existence checks
- Single and bulk deletion
- Missing objects
- Unsupported file types
- Invalid credentials
- Insufficient permissions
- Network and partial-upload failures

Integration tests must cover properties, projects, brochures, agencies, developers, agents, documents, admin media, cleanup jobs, video reels, and lead magnets.

## Object Verification

Independently verify all 394 GCS objects by:

- Object key
- Size
- Content type
- CRC32C or available provider checksum
- Relevant metadata

Generate a report containing verified, missing, size mismatch, checksum mismatch, metadata mismatch, and unverified objects.

No migration is complete with unresolved discrepancies.

A mandatory source inventory must be generated from AWS before GCS verification. Independently
compare exactly all 394 destination objects against source key, size, content type, CRC32C
or available provider checksum, and relevant metadata. Existing AWS ETag values are not used
as provider-independent checksums. A mismatch, missing object, or unverified object blocks
cutover until classified and approved in an audit report.

## IAM and Access

The existing service account has Storage Object Admin on `millionflats-media`.

Before cutover verify:

- Project and bucket ownership
- Upload, read, delete and metadata access
- Signed URL signing identity
- CORS only if browser uploads remain direct
- Public access status of public objects
- Absence of public access to private prefixes

Do not grant organization-wide or Owner roles.

Signed access TTLs are:

- Public asset signed fallback: not used for anonymous delivery
- Protected viewable assets: 1 hour maximum
- Protected downloads: 15 minutes maximum
- Private documents: 5 minutes maximum
- Lead magnets and premium downloads: 10 minutes maximum

Any signing request outside these limits is rejected. Authorization is checked before signing.
Private responses use `Cache-Control: private, no-store` and must not be cached by public CDN
behaviors. Private and protected key prefixes must not have unsigned public read access.

## CDN and CORS

Preserve CloudFront for public assets during validation.

CloudFront must be configured to use GCS as origin and must not expose private prefixes.

CloudFront origin configuration must document whether it uses origin access controls or
another GCS-supported private-origin mechanism. Public cache behaviors are limited to public
key prefixes and a minimum verified TLS origin. Private behaviors must remain
authorization-gated and non-cacheable. Cache invalidation and origin rollback instructions are
runbook requirements.

If browser direct upload remains in use, bucket CORS is restricted to actual production origins and required methods/headers. If uploads move behind the backend, browser CORS is unnecessary.

GCS CORS, if enabled, allows only the exact production and approved staging origins, `PUT`,
`POST`, and `HEAD` only where required, and the explicit content headers used by the upload
client. Wildcard origins and wildcard exposed headers are prohibited. Preflight behavior must
be tested from the actual frontend origin.

## Cutover

1. Install and test the GCS provider.
2. Verify the GCS project, bucket and IAM.
3. Verify migrated objects.
4. Deploy with GCS writes enabled and AWS fallback available.
5. Exercise critical public and private workflows.
6. Complete database URL inventory and compatibility resolution.
7. Validate production logs and CDN delivery.
8. Retain AWS credentials for the validation period.

Cutover routing is controlled by one server-side storage feature flag and remains independent
from public URL rendering. The default matrix is:

| Operation | Existing AWS-only object | New GCS-only validation object |
|---|---|---|
| Public read | GCS resolution after compatibility verification | GCS/CDN |
| Upload | GCS | GCS |
| Read private | GCS signed URL | GCS signed URL |
| Delete | GCS preferred, AWS fallback only during migration | GCS |
| Cleanup | GCS preferred, AWS fallback only during migration | GCS |

AWS fallback is enabled only for explicit S3 read/write/delete operations whose provider
fallback is safe. It is not silent or persistent. Failover requires an operational alert,
feature flag change, and confirmation of the impact on newly uploaded GCS objects.

Cutover is blocked while any of these fail:

- Migrated object verification
- IAM and signed-URL validation
- Public asset rendering
- Private authorization and cache isolation
- GCS upload, delete and cleanup tests
- Production build and existing test suite

The validation period should use a small, configurable initial traffic percentage or route
sample. Automatic failover is prohibited.

## Rollback

Rollback requires:

- Previous application release
- Previous environment configuration
- Original AWS object inventory
- GCS objects uploaded during validation
- Database backup and reversible URL update log

GCS objects must not be assumed to be present in AWS during rollback. New GCS objects require copying or dual-provider retention before AWS-only routing is restored.

The rollback procedure records all GCS objects created during validation. Before AWS-only
routing is restored, every such object must be copied to AWS or explicitly approved as not
required for rollback. Database value changes are restored only from the reversible migration
log and backup.

## AWS Retirement

AWS credentials and SDK dependencies are removed only after:

- GCS uploads pass
- Existing public assets render
- Private signed access works
- Delete and replacement operations work
- Storage cleanup and workers pass
- Database compatibility is verified
- Production build and tests pass
- GCS object verification is complete
- Operational approval is obtained

Implementation prerequisites include adding `@google-cloud/storage` and regenerating
`package-lock.json`. AWS SDK packages remain during compatibility and cutover. AWS SDK imports
and migration scripts are removed only after no in-repository active workflow requires them
and every retirement gate above is passed.

AWS-only package scripts for blog image migration and AWS CORS configuration must be replaced
by provider-neutral GCS equivalents or explicitly disabled as AWS-specific workflows before
cutover. They must not remain as active operational paths during GCS production operation.

No automatic deployment or migration deletes AWS objects.
