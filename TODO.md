# TODO — MillionFlats User name/fullName architectural consistency (production-safe)

## Step 1 — Add shared resolver service (code-only)
- Create `lib/userDisplayService.ts`
- Provide helpers to compute legal/display full name safely from existing columns:
  - `getLegalFullName(user)` (for CRM/legal flows)
  - `getDisplayName(user)` (for UI/admin flows where needed)

## Step 2 — Dual-write during onboarding transition (code-only)
- Update `app/api/user/onboarding/route.ts`
- When `body.fullName` is provided:
  - write `dataToUpdate.fullName = body.fullName` (legacy)
  - write `dataToUpdate.name = body.fullName` (compat for admin/auth/profile reads)

## Step 3 — Make onboarding completion resilient
- Update `lib/onboarding.ts`
- Change profile completion calculation to use:
  - `user.name || user.fullName` (instead of only `user.fullName`)

## Step 4 — Centralize CRM mapping
- Update `lib/crmSync.ts`
- Use `getLegalFullName(user)` instead of `user.fullName || user.name`

## Step 5 — Run verification (post-edit)
- Build/typecheck/lint
- Smoke test critical endpoints:
  - PATCH `/api/user/onboarding` (both columns populated)
  - PATCH `/api/user/profile`
  - CRM sync trigger after onboarding completion
  - Admin users list/detail render name
  - Confirm no Prisma P2022 regressions during tested flows

## Step 6 — Fix WhatsApp OTP flow P2022 (users.city missing)
- Add Prisma migration to create nullable `users.city` column
- Deploy migration
- Smoke test critical endpoints:
  - POST `/api/auth/whatsapp/confirm-otp`
  - If it triggers onboarding writes, ensure onboarding PATCH no longer throws `users.city` P2022
