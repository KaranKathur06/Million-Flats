# Property Listing Form V2 Design

## Goal

Upgrade the existing agent-owned manual listing wizard into a structured, conditional, draft-safe listing creation system without replacing the existing route, `ManualProperty` lifecycle, ownership checks, moderation flow, or public listing compatibility.

## Architecture

The wizard keeps one canonical form state and seven steps: Basics, Location, Media, Amenities, Pricing, Verification, and Review. A shared configuration module defines supported categories, property types, visible fields, conditional requirements, amenity groups, and weighted listing-quality criteria. Client validation uses these rules for immediate feedback; the server remains authoritative.

Existing `ManualProperty`, `ManualPropertyMedia`, S3 presigned upload, draft/autosave, duplicate detection, moderation, and authenticated-agent ownership paths are extended additively. Existing nullable fields and old records remain readable. New persisted fields are nullable unless required by an explicit submission rule.

## Data Flow

The client builds a normalized payload from the canonical state. Draft creation derives `agentId` from the authenticated server session. Draft updates accept incomplete data, while review/submission validates only fields visible for the selected category, property type, country, and sale/rent intent. Submission continues to use the existing `DRAFT` or `REJECTED` to `PENDING_REVIEW` transition.

Media remains separate from private verification documents. Gallery media supports category, ordering, and one hero image. Upload completion is distinct from AIView media analysis. AIShield and AITitle are integration boundaries; no frontend-generated valuation or verification result is shown.

## Failure Handling

Autosave reports saving/saved/failure states and never clears local state. Uploads preserve completed items and expose retry/delete paths. Map lookup failure preserves structured address fields and allows later pin placement. Server errors are mapped to user-facing messages without exposing implementation details.

## Validation and Quality

Drafts may be incomplete. Review and submit require title, purpose, type, price, location, area, description, hero media, and declarations, with conditional residential/commercial/land and sale/rent rules. A reusable weighted quality configuration reports critical, important, and premium completion and provides actionable missing-field navigation.

## Testing

Add focused unit coverage for conditional field visibility, validation, quality scoring, country-aware currency defaults, sale/rent switching, and media hero ordering. Run relevant existing lifecycle/media tests, TypeScript/build, lint where supported, and API tests available in the repository.