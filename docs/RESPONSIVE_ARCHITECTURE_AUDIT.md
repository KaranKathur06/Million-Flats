# MillionFlats Responsive Architecture Audit & Recovery

**Date:** May 21, 2026  
**Scope:** Public website + Admin CMS + shared layout systems  
**Status:** Foundation implemented; phased rollout required for remaining admin tables

---

## Executive summary

MillionFlats exhibited **system-wide responsive failure** driven by desktop-first assumptions: fixed table layouts, non-scrollable mobile drawers, sticky CTAs without safe-area/footer compensation, and inconsistent overflow policy. This pass establishes a **unified responsive design system** and fixes the three highest-impact failure modes confirmed in production screenshots.

---

## Root causes (confirmed in codebase)

| Issue | Root cause | Severity |
|-------|------------|----------|
| Footer social icons hidden | `ThreeDTourIntelligence` mobile CTA: `fixed bottom-0 z-[100]` without `safe-area-inset-bottom`; footer had no bottom clearance | Critical |
| Admin sidebar not scrollable | Mobile drawer used `h-full` with nav not in `overflow-y-auto` flex child; no `100dvh` | Critical |
| CMS tables unusable | `table-fixed`, sticky 220px action columns, `overflow-x-hidden` on table wrapper | Critical |
| Horizontal overflow | `100vw` on `html/body`, fixed px widths scattered | High |
| Touch targets | Many admin actions & footer icons below 44px | Medium |

---

## Implemented architecture

### 1. Global design tokens (`app/globals.css`)

- Fluid spacing & typography CSS variables (`--mf-space-*`, `--mf-text-*`)
- Mobile sticky/footer clearance: `--mf-mobile-sticky-inset`
- Global rules: `box-sizing`, `overflow-x`, responsive media, 16px minimum form font size
- Utilities: `.mf-touch-target`, `.mf-table-scroll`, `.mf-sticky-mobile-cta`, `.mf-footer-mobile-clearance`, `.mf-drawer-scroll`

### 2. Tailwind breakpoint alignment (`tailwind.config.js`)

| Token | Width |
|-------|-------|
| xs | 320px |
| sm | 480px |
| md | 768px |
| lg | 1024px |
| xl | 1280px |
| 2xl | 1536px |

Safe-area spacing utilities: `safe-top`, `safe-bottom`, etc.

### 3. Shared responsive component library (`components/responsive/`)

| Component | Purpose |
|-----------|---------|
| `ResponsiveDataTable` | Desktop scrollable table (md+) + mobile card stack |
| `AdminDataCard` | Touch-friendly CMS row card |
| `MobileOffCanvasPanel` | Off-canvas drawer: `100dvh`, independent scroll, body lock, safe-area |
| `useBodyScrollLock` | Prevents background scroll when drawers open |

### 4. Critical fixes applied

| Area | Change |
|------|--------|
| `AdminShellLayoutClient` | Mobile drawer → `MobileOffCanvasPanel`; desktop sidebar `sticky` + `100dvh` scroll |
| `Header` | Public mobile menu → same drawer primitive with scroll + safe-area |
| `Footer` | `mf-footer-mobile-clearance` + 44px social touch targets |
| `ThreeDTourIntelligence` | `mf-sticky-mobile-cta` + safe-area padding |
| `admin/projects` | Full mobile card list via `ResponsiveDataTable` |
| `AdminBlogsTableClient` | Full mobile card list via `ResponsiveDataTable` |

---

## Remaining admin tables (migrate to `ResponsiveDataTable`)

Apply the same pattern as Projects/Blogs:

- `app/admin/agents/AdminAgentsTableClient.tsx`
- `app/admin/listings/AdminListingsTableClient.tsx`
- `app/admin/users/AdminUsersTableClient.tsx`
- `app/admin/developers/page.tsx`
- `app/admin/drafts/AdminDraftsTableClient.tsx`
- `app/admin/ecosystem-partners/AdminEcosystemPartnersTableClient.tsx`
- `app/admin/ecosystem-directory/AdminEcosystemDirectoryTableClient.tsx`
- `app/admin/financial/*` (Payments, Subscriptions, Webhooks, Overview)
- `app/admin/reports/page.tsx`
- `app/admin/audit-logs/page.tsx`
- `app/admin/governance/page.tsx`
- `app/admin/moderation/properties/page.tsx`
- `app/admin/seo/sitemap-dashboard/SitemapDashboardClient.tsx`
- `components/admin/blogs/table.tsx`

**Migration template:**

```tsx
<ResponsiveDataTable
  mobileCards={rows.map((row) => (
    <AdminDataCard key={row.id} title={...} meta={...} actions={...} />
  ))}
  table={<div className="rounded-2xl border ..."><table className="min-w-[720px] w-full">...</table></div>}
/>
```

---

## Public site follow-ups

| Component | Notes |
|-----------|-------|
| `components/ecosystem/StickyLeadCaptureClient.tsx` | Align with `mf-sticky-mobile-cta` |
| `app/agents/[id]/page.tsx` | Bottom bar already uses safe-area; verify footer clearance |
| `app/properties/PropertiesClient.tsx` | Fixed bottom filter bar — add safe-area |
| Ecosystem partner pages | Many `overflow-hidden` on page roots — audit for clip on small viewports |
| Property/project detail | Sticky sidebars — collapse to stacked layout below `lg` |

---

## QA checklist (required before release)

### Devices

- [ ] iPhone SE (320px)
- [ ] iPhone 14/15 Pro Max
- [ ] Samsung A-series (Chrome + Samsung Internet)
- [ ] Pixel (Chrome)
- [ ] iPad portrait/landscape
- [ ] Foldable inner/outer display

### Critical paths

- [ ] Homepage: footer social icons fully tappable above sticky 3D CTA
- [ ] Admin: open mobile menu → scroll to Settings → all items reachable
- [ ] Admin Projects: create/edit/publish/delete from mobile cards
- [ ] Admin Blogs: same
- [ ] Login/register: no horizontal scroll; inputs not zoomed on iOS

### Performance

- [ ] Lighthouse mobile — no CLS regression from drawer/footer padding
- [ ] No hydration mismatch on `MobileOffCanvasPanel`

---

## Developer conventions (going forward)

1. **Mobile-first:** Base styles for `< md`; enhance upward.
2. **No `table-fixed`** on CMS lists; use `min-w-[Npx]` inside `.mf-table-scroll`.
3. **No `overflow-x-hidden`** on table parents — use `.mf-table-scroll`.
4. **Sticky bottom UI:** Always `env(safe-area-inset-bottom)` + document footer clearance token.
5. **Drawers:** Only `MobileOffCanvasPanel` (or equivalent) with `100dvh` + scroll region.
6. **Touch:** Use `.mf-touch-target` on icon-only controls.

---

## Files added/changed in this recovery pass

**New:** `lib/utils.ts`, `lib/responsive/useBodyScrollLock.ts`, `components/responsive/*`, `docs/RESPONSIVE_ARCHITECTURE_AUDIT.md`  

**Updated:** `app/globals.css`, `tailwind.config.js`, `app/admin/AdminShellLayoutClient.tsx`, `components/Header.tsx`, `components/Footer.tsx`, `components/ThreeDTourIntelligence.tsx`, `app/admin/projects/page.tsx`, `app/admin/AdminBlogsTableClient.tsx`
