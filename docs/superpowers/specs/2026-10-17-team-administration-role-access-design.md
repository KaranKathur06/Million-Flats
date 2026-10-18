# Team Administration Role Access

## Goal

Allow authorized ADMIN and SUPERADMIN users to manage Team Directory members
without a separate TeamAccess grant, fixing the reported
“Team administration access required” error.

## Existing context

The server-rendered admin team page already allows ADMIN/SUPERADMIN roles.
Team API routes call `requireTeamAdmin`, which currently requires an active
`TeamAccess` record with `isTeamAdmin=true` for every user.

## Design

- Resolve the database user and trusted role server-side in the shared team
  authorization helper; do not trust client-supplied roles.
- Treat ADMIN and SUPERADMIN as team administrators for all existing team
  member and TeamAccess management APIs, including create, edit, reorder,
  grant, and revoke operations:
  - `GET/POST /api/admin/team/members`
  - `GET/PATCH/DELETE /api/admin/team/members/[id]`
  - `POST /api/admin/team/members/reorder`
  - `GET/POST /api/admin/team/access`
  - `PATCH/DELETE /api/admin/team/access/[id]`
- For other roles, keep the current active, non-revoked TeamAccess
  `isTeamAdmin` requirement.
- Preserve session/account suspension checks, fail-closed behavior on lookup
  errors, audit logs, and the invariant that prevents removing the last active
  TeamAccess team administrator. Database authorization failures remain
  denied; API mutation failures are returned explicitly.

## Acceptance and validation

- ADMIN/SUPERADMIN users can create a team member without TeamAccess rows.
- A non-admin with no active team-admin grant remains forbidden.
- A non-admin team administrator retains current authorized actions.
- Last-team-admin protection and suspended-account behavior remain unchanged.
- Add tests for the role override on each API method, the TeamAccess path,
  denials, and lockout protection.
