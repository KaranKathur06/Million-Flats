# Lead Archive, Restore, and Permanent Delete

## Goal

Add recoverable archival and permanent deletion actions for leads in the admin
panel.

## Existing context

Lead records have related `LeadActivity`, `LeadNote`, and `LeadFollowUp`
records. Their property, project, developer, agent, user, and ecosystem
references are not lead-owned records and must not be deleted with a lead.
The admin list and stats are composed through lead query helpers.

## Design

- Add nullable `deletedAt` and `deletedBy` metadata to `Lead` as soft-archive
  markers only; permanent deletion removes the Lead row and these markers.
- Add admin archive and restore actions. Archived leads remain intact and can
  be restored; ordinary lead lists, counts, exports, and dashboards exclude
  archived leads by default. Admins may explicitly request archived records;
  archived rows are read-only except for restore and permanent delete.
- Add `POST /api/admin/leads/[id]/archive` and
  `POST /api/admin/leads/[id]/restore`; both require ADMIN or SUPERADMIN.
- Add a separately confirmed `DELETE /api/admin/leads/[id]` permanent-delete
  action, requiring ADMIN or SUPERADMIN, admin rate limiting, and JSON body
  `{ "confirmation": "PERMANENTLY_DELETE_LEAD" }`. Missing or incorrect
  confirmation returns 400 without mutation.
- Archive and restore are non-idempotent state transitions: archiving an
  already archived lead or restoring an active lead returns 409. Permanent
  deletion may target active or archived leads; a missing lead returns 404,
  and repeating a successful deletion therefore also returns 404.
- In one transaction, permanently delete only the lead and its owned
  `LeadActivity`, `LeadNote`, and `LeadFollowUp` records. Do not delete or
  mutate referenced property/project/developer/agent/user/ecosystem entities.
- Write the audit event in the same transaction as the purge, recording actor,
  action, and lead identifier but not lead name, email, phone, message, or
  other personally identifying data. If the audit insert fails, roll back the
  purge.
- If the rate-limit check cannot be completed, fail closed with 503 and do not
  mutate the lead. If the transaction fails, show an explicit error and do not
  report the deletion as successful.
- Archive/restore database or audit failures return explicit errors without
  partial state changes. Audit records for permanent deletion store the lead
  identifier as a scalar, non-foreign-key value so the event survives the
  purge; the audit insert and purge remain in the same transaction.

## Acceptance and validation

- Archive hides a lead from default results/stats/export and restore returns it
  to ordinary results without changing its lead history.
- Archived leads cannot be edited, assigned, or status-transitioned until
  restored; authorized admins may inspect them through the explicit archived
  filter.
- Permanent delete requires confirmation and elevated authorization; it
  removes the lead and only the three lead-owned child record types.
- Referenced business entities remain untouched; audit metadata is
  non-personal.
- Add focused tests for list/stat filtering, archive/restore, access control,
  child cleanup, confirmation validation, repeated/conflicting requests,
  rate-limit failure, and failure atomicity.
