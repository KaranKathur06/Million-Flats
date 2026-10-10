# Public Team Directory Design

## Goal

Allow visitors to open `/team` without signing in while keeping team profile
management and all privileged operations protected.

## Current behavior

- `middleware.ts` explicitly classifies `/team` as protected and redirects
  anonymous visitors to login.
- `lib/auth/routes.ts` also includes `/team` in its shared protected prefixes.
- `app/team/layout.tsx` requires active team membership and redirects visitors
  to login or an unauthorized page.
- `app/team/page.tsx` repeats the membership check before reading profiles.
- The page currently selects ACTIVE team members and only fields needed by the
  directory: name, designation, bio, photo, LinkedIn URL, and location.
- The page is dynamic and uncached, and its metadata prevents indexing.
- The team UI describes itself as internal/private.

## Approved design

- Make only the `/team` directory page public by removing it from page-route
  protection in middleware and the shared protected route list.
- Remove the team-membership gate from the `/team` layout and page.
- Continue fetching only ACTIVE profiles and only the existing directory
  fields.
- Preserve dynamic/no-store behavior and `noindex`.
- Update private/internal-only language so the public directory does not claim
  to be private.
- Keep all team administration routes and any profile-management APIs
  protected; do not make `requireTeamAdmin` or mutation operations public.
- Do not change team membership or administrator authorization helpers.

## Alternatives considered

1. **Publicize the existing `/team` page (recommended):** one canonical page,
   minimal changes, no duplication; must remove every redundant page guard.
2. **Create a separate public directory route:** isolates public behavior but
   duplicates routing and page composition for the same directory.
3. **Make team APIs public:** unnecessary for the server-rendered page and
   increases exposure beyond the request.

## Authorization boundaries

- Anonymous visitors may read the active directory profiles rendered by `/team`.
- Profile management remains subject to the existing team-admin checks.
- Other protected routes remain protected.
- The route remains noindex; public accessibility does not opt it into search
  indexing.

## Validation

1. Confirm route classification no longer treats `/team` as protected while
   representative protected paths such as `/admin` and `/dashboard` remain so.
2. Confirm the layout and page do not require team membership to render.
3. Confirm only ACTIVE records and the existing public display fields are
   queried.
4. Confirm administration/API guards and `/team` noindex metadata remain.
5. Run focused route/auth tests and project diagnostics where available.
