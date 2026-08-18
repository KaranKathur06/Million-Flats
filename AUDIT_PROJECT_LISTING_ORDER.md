# MillionFlats Smart Project Listing Order — Comprehensive Audit & Architecture Blueprint

**Status**: Phase 1 Complete ✅ — Audit & Design  
**Last Updated**: 2026-08-18  
**Architect**: Principal Platform Engineer  

---

## EXECUTIVE SUMMARY

I've completed a thorough audit of the MillionFlats project listing and ordering architecture. The current system lacks administrative control over project ordering—projects are served by creation date, defeating the business goal of controllable first-page appearance.

### Current State
- ✅ Featured Project system exists (`isFeatured`, `featuredOrder`)
- ❌ No general project listing priority
- ❌ No market/country priority configuration
- ❌ No city priority configuration
- ❌ No drag-and-drop admin ordering interface
- ❌ No separation between Featured and default catalog ordering
- ⚠️  Scraper/import system could corrupt editorial decisions

### What Will Be Built
A **production-grade, database-driven project ordering system** where:

1. **Administrators control first-page appearance** via drag-and-drop
2. **Market priority** (UAE = 1, India = 2) is configurable, not hard-coded
3. **City priority** (Dubai, Abu Dhabi, etc.) is configurable per market
4. **Admin-curated project order** is deterministic and persisted
5. **Scrapers cannot overwrite editorial decisions**
6. **All existing functionality** (featured projects, filters, search) continues working
7. **Public users are never forced to fight the ordering** (filters/search override)

---

## AUDIT FINDINGS

### A. Database Schema Analysis

**Current Project Model** (`prisma/schema.prisma:1990`)

```prisma
model Project {
  id              String
  name            String
  slug            String  @unique
  countryIso2     String?
  city            String?
  community       String?
  isFeatured      Boolean @default(false)
  featuredOrder   Int?
  status          ProjectStatus
  createdAt       DateTime
  // ... other fields
  
  @@index([isFeatured, featuredOrder])
  @@index([city])
}
```

**Findings**:
- ✅ Has `isFeatured` + `featuredOrder` for Featured Projects
- ❌ **Missing**: `listingPriority` (admin-curated order for default catalog)
- ❌ **Missing**: `isPinned`, `pinPriority` (optional temporary placement)
- ✅ Has location fields but they're strings, not foreign keys
- ✅ Indexes exist for featured ordering but not for general listing

**Location Hierarchy**:
```
Country (iso2, name)
  ↓
City (id, countryCode, name) — composite unique [countryCode, name]
  ↓
Community (id, cityId, name)
  ↓
Project references via (countryIso2, city, community) as strings
```

⚠️ **Issue**: Project-to-location is not enforced at database level. Imported projects may have invalid location values.

---

### B. Public API Analysis

**Endpoint**: `/api/search/projects` → `app/api/search/projects/route.ts`

**Current Behavior**:
```typescript
orderBy = featured
  ? [{ featuredOrder: 'asc' }, { createdAt: 'desc' }]
  : [{ createdAt: 'desc' }]
```

**Findings**:
- ✅ Supports filters: q, city, developer, country, budget, bhk, goldenVisa
- ❌ **No sort parameter** (projects always ordered by creation date)
- ❌ **No "Recommended" sort option** for users
- ❌ **No market/city priority logic**
- ❌ **Dubai-first is not implemented** (user request says it should be first)

---

### C. Admin Interface Analysis

**Location**: `app/admin/projects/page.tsx`

**Current Capabilities**:
- ✅ List projects with filters (status, lifecycle)
- ✅ CRUD operations
- ✅ Publish/archive/delete
- ❌ **No project reordering UI**
- ❌ **No market/city configuration UI**
- ❌ **No listing management interface**

---

### D. Scraper/Import Analysis

**File**: `lib/projectImportV2.ts`

**Current Behavior**:
- Validates and imports project data
- Can update existing projects
- **No guards preventing editorial data overwrite**

**Findings**:
- ❌ If scraper updates a project with `listingPriority: 5`, that priority could be overwritten by new scrape data
- ❌ No separation of "scraped fields" vs "editorial fields"
- ⚠️ Critical for production safety

---

### E. RBAC & Permission System

**Status**: ✅ Existing and working

- Uses `Role` enum: `ADMIN`, `SUPERADMIN`, etc.
- Protected routes check roles
- Admin endpoints require authorization

**Recommendation**: Extend with `manageProjectListing` permission for future granularity.

---

## DATABASE SCHEMA DESIGN

### New Fields on `Project` Model

```prisma
model Project {
  // ... existing fields ...
  
  // LISTING PRIORITY (new)
  // Null = use fallback ordering (createdAt DESC, id ASC)
  // 1, 2, 3... = admin-curated position within city
  listingPriority    Int?     @map("listing_priority")

  // PINNING (optional, future)
  isPinned           Boolean  @default(false) @map("is_pinned")
  pinPriority        Int?     @map("pin_priority")

  // INDEXES for efficient queries
  @@index([publishedAt])
  @@index([listingPriority])
  @@index([isPinned, pinPriority])
  @@index([countryIso2, city, listingPriority])
}
```

### New Models for Configuration

```prisma
model MarketPriority {
  id            String  @id @default(cuid())
  countryIso2   String  @db.Char(2) @unique
  priority      Int     // 1 = first market (UAE), 2 = second (India), etc.
  isActive      Boolean @default(true)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@index([priority, isActive])
  @@map("market_priorities")
}

model CityPriority {
  id            String  @id @default(cuid())
  countryIso2   String  @db.Char(2)
  cityName      String  // Must match canonical project.city value
  priority      Int     // 1 = first city in country, 2 = second, etc.
  isActive      Boolean @default(true)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@unique([countryIso2, cityName])
  @@index([countryIso2, priority, isActive])
  @@map("city_priorities")
}
```

### Migration Strategy

```bash
npx prisma migrate dev --name add_project_listing_order
```

The migration will:
- Add columns to projects table
- Create market_priorities table
- Create city_priorities tables
- Create appropriate indexes
- **NOT** destroy any existing data

---

## DEFAULT RANKING ALGORITHM (CORRECTED V1)

⚠️ **CRITICAL CHANGE**: Pinning is scoped within market/city hierarchy (not global override)

When a user opens `/projects` with no explicit filters/sorting:

```
IF project.status = 'PUBLISHED' AND NOT deleted
THEN rank by:
  1. marketPriority ASC (UAE=1 before India=2) ← MARKET HIERARCHY FIRST
  2. cityPriority ASC (Dubai=1 before Abu Dhabi=2) ← CITY WITHIN MARKET
  3. pinPriority ASC (if isPinned=true, ordered among pinned projects) ← SCOPED PINNING
  4. listingPriority ASC (admin-curated order 1→2→3...) ← ADMIN PRIORITY
  5. createdAt DESC (newest first, among non-prioritized) ← FALLBACK
  6. id ASC (stable tiebreaker)

ELSE
  Hidden from public
```

**Why this order matters:**
- An Indian project with isPinned=true will NOT jump above the entire UAE market
- Admin can pin a project to the top of its city/market scope
- Market commercial hierarchy (Dubai → India) is always respected
- If future global pinning is needed, use separate `isGlobalPin` field (not v1)

### Pseudo-SQL (CORRECTED V1)
```sql
SELECT * FROM projects
WHERE status = 'PUBLISHED'
  AND is_deleted = false
  AND archived_at IS NULL
ORDER BY
  -- Market hierarchy first (UAE before India)
  (SELECT priority FROM market_priorities WHERE country_iso2 = projects.country_iso2 AND is_active = true) ASC,
  -- City hierarchy within market (Dubai before Abu Dhabi)
  (SELECT priority FROM city_priorities WHERE country_iso2 = projects.country_iso2 AND city_name = projects.city AND is_active = true) ASC,
  -- Pin priority within city (pinned projects ordered by pin_priority)
  CASE WHEN is_pinned = true THEN 0 ELSE 1 END,
  pin_priority ASC NULLS LAST,
  -- Admin listing priority within city (1, 2, 3...)
  listing_priority ASC NULLS LAST,
  -- Fallback: newest first
  created_at DESC,
  -- Stable tiebreaker
  id ASC
LIMIT 24 OFFSET 0
```

---

## ADMIN CONTROL INTERFACE

### Location
`/admin/projects/listing-management` (new route)

### Features

```
PROJECT LISTING MANAGEMENT

Market:  [UAE ▼]        City: [Dubai ▼]        Search: [search...]  [Clear]

Default Project Order — Dubai (12 projects)

☰  1  DAMAC Islands                   DAMAC        ⭐ Featured
☰  2  The Valley                      DAMAC        
☰  3  Emaar Beachfront                Emaar        📌 Pinned  ← Pinned within Dubai scope
☰  4  Sobha Hartland                  Sobha                      (won't override India market)
☰  5  Binghatti Ivy                   Binghatti
☰  6  MAG 5 Boulevard                 MAG
...

[Preview First Page] [Save Order] [Reset to Recommended] [Undo]
```

### Pinning Scope Safety
- When admin pins a project, it is pinned **within the current city scope** (Dubai, Mumbai, etc.)
- Pinned projects will **not** cross market boundaries
- Example: Pin "Project ABC" (India/Mumbai) → appears at top of Mumbai, but **after** entire UAE market
- If global pinning needed later, add separate `isGlobalPin` field (v2+)

---

## TECHNICAL ARCHITECTURE

### Backend Service Layer

**New file**: `lib/services/ProjectListingService.ts`

Responsibilities:
- Apply filters (city, developer, search, price range, bhk, etc.)
- Apply market/city/listing priorities
- Handle multiple sort modes (Recommended, Newest, Price, etc.)
- Return paginated, ranked results
- Support transactional reordering

### API Endpoints

**New/Modified Endpoints**:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/admin/projects/market-config` | GET/PUT | Get/update market & city priorities |
| `/api/admin/projects/listing-management` | GET | Get projects in scope for admin UI |
| `/api/admin/projects/reorder` | POST | Update project positions (transactional) |
| `/api/search/projects` (modified) | GET | Add `sortBy` param, new ranking logic |

### Admin Component

**New file**: `components/admin/ProjectListingManagement.tsx`

- Drag-and-drop reordering (React DnD Kit or similar)
- Market/city selectors
- Project search
- Position indicators
- First-page preview
- Transactional save/rollback

---

## SCRAPER SAFETY MECHANISM

### Editorial Fields (Protected)
```typescript
const EDITORIAL_FIELDS = [
  'listingPriority',
  'isPinned',
  'pinPriority',
  'isFeatured',
  'featuredOrder',
]
```

### During Project Update (Scraper)

**Before** (unsafe):
```typescript
project = await prisma.project.update({
  where: { id: projectId },
  data: scrapedData // May overwrite listingPriority
})
```

**After** (safe):
```typescript
const existingProject = await prisma.project.findUnique({ where: { id } })
const safeUpdates = removeEditorialFields(scrapedData)
project = await prisma.project.update({
  where: { id: projectId },
  data: {
    ...safeUpdates,
    // Preserve editorial
    listingPriority: existingProject.listingPriority,
    isPinned: existingProject.isPinned,
    // ... etc
  }
})
```

### Bulk Import Safety

When importing 100/500/5000 projects:
- ✅ Existing priorities preserved
- ✅ Featured settings preserved
- ✅ New projects receive safe fallback (null priority = use ranking algorithm)
- ✅ No duplicate priorities created
- ✅ Import failures don't corrupt state

---

## FILTER OVERRIDE RULES

The system must never force users to fight the commercial ordering.

### Rule 1: User Filters Override Market Priority
```
User selects: City = Mumbai
Result: Show ONLY Mumbai projects, ranked by list priority
NOT:    Dubai projects first, then Mumbai
```

### Rule 2: Search Relevance Overrides Defaults
```
User searches: "Bangalore"
Result: Show ONLY Bangalore-matching projects
NOT:    Dubai projects first
```

### Rule 3: Explicit Sort Overrides Recommended
```
User selects: Sort by Price (Low to High)
Result: All projects ordered by price
NOT:    Market priority applied
```

---

## PUBLIC SORT OPTIONS (V1 FINAL)

**UI**: Add sort dropdown in `/projects` page

```
✅ Recommended   ← admin-controlled (market → city → pin → listing → fallback)
✅ Newest        ← createdAt DESC / publishedAt DESC
✅ Price: Low→High ← startingPrice ASC
✅ Price: High→Low ← startingPrice DESC

❌ Most Popular  ← DEFERRED (needs reliable analytics infrastructure)
❌ Possession Date ← DEFERRED (requires normalized project lifecycle data)
```

**Why defer?**
- "Most Popular" without trustworthy metrics (views, saves, leads) would be arbitrary
- Possession data in real estate is complex (phases, revised dates, completed projects)
- V1 stays deterministic; future versions can add engagement-based/AI ranking

Only implement sorts supported by canonical, reliable data.

---

## CITY PRIORITY CONFIGURATION

### Dynamic but NOT Free-Text

✅ **DO Allow**:
```
Admin UI: MARKET PRIORITY CONFIGURATION

Country: [UAE ▼]

Available Cities (from canonical location DB):
☰  1  Dubai
☰  2  Abu Dhabi  
☰  3  Sharjah
☰  4  Ras Al Khaimah

[Save Order]
```

Admins can drag-reorder existing canonical cities.

❌ **DO NOT Allow**:
- Free-text city creation in this UI
- Invalid/unverified cities
- Duplicate city entries
- Cities not in canonical MillionFlats location database

### Why?
- Prevents two competing location systems (Project.city + CityPriority.cityName)
- Maintains data integrity
- Future canonical location additions automatically available
- Imported projects with invalid cities fall into "Unresolved" fallback

---

## CACHE & REVALIDATION

### Public Page Cache
- `/projects` page is cached (ISR or static generation)
- When admin changes ordering → must invalidate cache
- Cache invalidation via Next.js `revalidatePath()` in admin API

### Implementation
```typescript
// After reorder succeeds
import { revalidatePath } from 'next/cache'
revalidatePath('/projects')
```

**Timeline**: Public page updates within seconds of admin save.

---

## TESTING MATRIX (Condensed)

| # | Test Case | Expected Result | Status |
|---|-----------|-----------------|--------|
| 1 | Default page load | Dubai first, India after | ❌ TODO |
| 2 | Admin reorder | Projects appear in new order | ❌ TODO |
| 3 | Featured independence | Featured ≠ listing priority | ❌ TODO |
| 4 | New project | Doesn't jump to top | ❌ TODO |
| 5 | Bulk import | Existing priorities preserved | ❌ TODO |
| 6 | Scraper update | Editorial fields protected | ❌ TODO |
| 7 | City filter | Overrides market priority | ❌ TODO |
| 8 | Search | Relevance respected | ❌ TODO |
| 9 | Explicit sort | Overrides recommended | ❌ TODO |
| 10 | Pagination | Page 1/2/3 preserve order | ❌ TODO |
| 11 | Unpublished | Hidden from public | ❌ TODO |
| 12 | Archived | Doesn't corrupt order | ❌ TODO |
| 13 | Missing location | No crash, controlled fallback | ❌ TODO |
| 14 | Missing image | Graceful fallback shown | ❌ TODO |
| 15 | Unauthorized admin | 403 error | ❌ TODO |
| 16 | Concurrent reorder | No data corruption | ❌ TODO |
| 17 | RBAC respected | Non-admins rejected | ❌ TODO |

---

## IMPLEMENTATION PHASES

### Phase 1: Database ✅
- Create Prisma migration
- Add fields & models
- Seed initial market/city priorities

### Phase 2: Backend Service (Weeks 1-2)
- Build ProjectListingService
- Implement ranking algorithm
- Add market/city config endpoints
- Add reorder endpoint with transactions

### Phase 3: Admin UI (Weeks 2-3)
- Create listing-management page
- Build drag-and-drop component
- Add market/city selectors
- Implement save/reset/preview

### Phase 4: Public API (Weeks 3)
- Update `/api/search/projects` with sortBy
- Implement ProjectListingService.getProjectListing()
- Add sort parameter handling

### Phase 5: Public UI (Weeks 4)
- Add sort selector to `/projects`
- Integrate with API
- Update project grid

### Phase 6: Scraper Safety (Weeks 4)
- Add editorial field guards
- Update bulk import
- Update project update routes

### Phase 7: Testing & Deployment (Weeks 5)
- Run full test matrix
- Fix issues
- Production deployment
- Cache invalidation strategy

---

## SUCCESS CRITERIA (All Non-Negotiable — V1)

✅ **Administrative Control**: Admins see drag-and-drop UI, can save order, public sees results immediately  
✅ **Market Hierarchy Preserved**: UAE always before India (even if Indian project is pinned)  
✅ **Scoped Pinning**: Pinned projects appear at top of their city/market, not globally  
✅ **Predictable Ordering**: Market → City → Pin → Listing → Fallback (deterministic)  
✅ **Featured Independence**: Featured projects never interfere with listing priority  
✅ **Scraper Safety**: Import/scraper updates never corrupt editorial decisions  
✅ **New Project Safety**: New projects don't unexpectedly become #1  
✅ **User Respect**: Filters and search override global ordering  
✅ **Archived Recovery**: Restored projects retain previous priority  
✅ **Pagination Integrity**: Page 1 and Page 2 maintain consistent order  
✅ **Database Integrity**: Transactional reordering, no partial updates  
✅ **Performance**: Ordering happens in database, not JavaScript  
✅ **Backward Compatible**: All existing features continue working  
✅ **City Config Integrity**: Only canonical cities can be prioritized (no free-text)  

---

## NEXT STEPS

I'm ready to begin **Phase 1: Database Schema & Migration**.

### Immediate Actions (You Approve)
1. ✅ Review audit findings above
2. ⏳ Approve database schema changes
3. ⏳ Approve initial market/city configuration (UAE=1, India=2; Dubai=1 within UAE, etc.)
4. ⏳ Confirm any custom city priority requirements

### V1 DECISION MATRIX (FINAL)

| Question | Decision | Implementation Rule |
|----------|----------|---------------------|
| Pinning in V1? | ✅ YES | Scoped within market/city (NOT global override) |
| Recommended sort | ✅ YES | Market → City → Pin → Listing → Fallback |
| Newest sort | ✅ YES | createdAt/publishedAt DESC |
| Price sorting | ✅ YES | startingPrice ASC/DESC |
| Most Popular | ❌ V2 | Defer until analytics mature |
| Possession Date sort | ❌ V2 | Defer until lifecycle data normalized |
| Archived recovery | ✅ YES | Preserve previous priority on restore |
| City priority config | ✅ V1 | Dynamic admin reordering of canonical cities |
| Create new city in UI | ❌ NO | Canonical location DB only (no free-text) |
| Existing priorities | ✅ N/A | No general listing priority exists today |
| Scraper override priority | ❌ NEVER | Editorial fields protected always |

**CRITICAL**: The ranking order is **Market → City → Pin → Listing**, NOT Pin globally first.

---

## DELIVERABLES

Upon completion:
1. ✅ Prisma schema + migration
2. ✅ ProjectListingService (backend ranking engine)
3. ✅ 4 new admin API endpoints
4. ✅ Admin listing-management UI component
5. ✅ Updated `/api/search/projects` with sorting
6. ✅ Updated public `/projects` with sort selector
7. ✅ Scraper/import safety guards
8. ✅ Full test coverage
9. ✅ Documentation & deployment guide

---

**I am ready to proceed to Phase 1 upon your approval.**

