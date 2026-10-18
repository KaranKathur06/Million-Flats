# Agent Archive, Restore, and Permanent Delete

## Goal

Add recoverable and permanent agent deletion choices to the admin Agents
interface while preserving linked business history.

## Existing context

An Agent is related to an authentication User, manual properties, listings,
leads, CRM leads, reviews, documents, verification records, subscriptions,
payments, and AI intelligence. Existing ban behavior changes account status
and archives some published manual properties, but there is no separate
recoverable deletion state or delete action in the Agents table.

## Design

- Add distinct agent archival metadata so deletion is not conflated with
  suspension or ban. Use `archivedAt` and `archivedBy` as the authoritative
  archive markers on Agent, plus the prior account status and account security
  version needed for safe restoration. Do not add a second `deletedAt` /
  `deletedBy` pair.
- Add `POST /api/admin/agents/[id]/archive` and
  `POST /api/admin/agents/[id]/restore`, available to ADMIN/SUPERADMIN.
- Store `archivedAt` and `archivedBy` on the Agent, and store matching nullable
  `archivedByAgentAt` and `archivedByAgentActorId` markers on each manual
  property changed by that archive operation. These operation-specific
  markers distinguish affected published properties from listings archived
  earlier for other reasons.
- Archive disables agent sign-in and public agent visibility. Save the prior
  `User.status` in the archive audit event, set `User.status` to SUSPENDED, and
  increment `User.securityStateVersion` under a row lock. Save that resulting
  version on the Agent archive state and set the same archive operation
  timestamp on the Agent and only currently PUBLISHED manual properties
  changed to ARCHIVED by this operation. Preserve all other listing statuses.
- Restore only properties still carrying both the exact archive timestamp and
  archive actor marker. Restore `User.status` only if it remains the
  archive-created SUSPENDED state and `User.securityStateVersion` still equals
  the version recorded by archive. If the version differs, leave the current
  `User.status` unchanged and return an explicit partial-restore result
  requiring admin review; do not force-disable or otherwise override the
  later security decision. All security operations that change
  `User.status` (including ban, unban, suspension, and reinstatement) must
  lock the same User row and increment `securityStateVersion` in the same
  transaction. This serialized monotonic version, not timestamps, detects a
  later security change even when event timestamps are equal or out of order.
  Restoring an account status also increments the version.
- Add a separately confirmed `DELETE /api/admin/agents/[id]` available only
  to SUPERADMIN. Fail closed with 503 if the destructive-action rate-limit
  check is unavailable.
- Protected dependencies that block purge are manual properties, agent
  listings, agent/CRM leads, inquiries, reviews, subscriptions, payments,
  verification/compliance history, and security/audit rows with a foreign-key
  relationship to the Agent or User. Do not cascade, detach, or anonymize
  these records. Check every incoming foreign-key relationship to both
  records, including any unlisted relation, and block on any non-disposable
  dependency. Report categories/counts without customer PII; archival remains
  available. Standalone audit events use scalar target IDs, survive purging,
  and do not block it.
- If the dependency check passes, write a non-PII audit event, enqueue private
  document object keys in the existing `StorageCleanupJob` mechanism and
  delete only disposable AI cache and document metadata; verification or
  compliance history is protected and blocks purging. Lock the Agent/User
  rows and perform the complete dependency check, audit insert, cleanup-job
  enqueue, and Agent/User deletion in one serializable transaction (or the
  repository's equivalent locking protocol that prevents new references).
  Recheck constraints immediately before deletion. If any concurrent
  dependency appears or cleanup-job enqueue fails, abort the purge. Process
  object deletion after commit through the existing retryable storage cleanup
  worker; the response must expose pending cleanup rather than claim storage
  deletion is complete.
- Preserve existing admin capability, rate-limit, audit, and role protections.
- Archive/restore return 409 for repeated or invalid state transitions;
  missing records return 404. Archive, restore, and purge audit failures
  abort their corresponding database mutation. Purge rate-limit unavailability
  returns 503 without mutation. Purge requires JSON
  `{ "confirmation": "PERMANENTLY_DELETE_AGENT" }`; missing/incorrect
  confirmation returns 400.

## Acceptance and validation

- Archive disables sign-in and hides the agent from public discovery.
- Only listings published at the moment of archive are hidden; unrelated
  archived/rejected listings remain unchanged.
- Restore returns only archive-affected listings to their previous published
  state and does not undo a later suspension/ban.
- Permanent deletion is Superadmin-only, confirmed, and blocked whenever
  any listed protected dependency exists; no protected history is cascaded
  away. Private document storage cleanup is queued and retryable.
- Add focused tests for archive/restore state transitions, listing markers,
  authorization, dependency conflicts including an unexpected foreign key,
  concurrent dependency insertion, security-version ordering (including
  equal/out-of-order event timestamps), confirmation validation, rate-limit
  and audit failures, and non-PII audit events.
