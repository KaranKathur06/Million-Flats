# Phase 7: Testing & Deployment Guide

**Status**: Ready for Testing ✅  
**Date**: 2026-08-18  
**Purpose**: Complete validation of Project Listing Order system before production deployment  

---

## TEST ENVIRONMENT SETUP

### Prerequisites

1. **Database**: PostgreSQL with all Phase 1-6 migrations applied
   ```bash
   npx prisma migrate deploy
   npx prisma db seed
   ```

2. **Test Data**: Projects in multiple markets/cities
   - UAE: Dubai (15 projects), Abu Dhabi (8 projects)
   - India: Mumbai (12 projects), Bangalore (10 projects)
   - At least 2 featured projects

3. **Admin User**: Created with ADMIN role
   - Email: `admin@test.millionflats.local`
   - Password: (use your preferred test password)

4. **Development Server**: Running locally
   ```bash
   npm run dev
   # Server at http://localhost:3000
   ```

### Verification Checklist

Before running tests:
- [ ] Prisma migrations applied: `npx prisma migrate status`
- [ ] Seed complete: Check database has market_priorities, city_priorities
- [ ] Admin user exists: Check auth table
- [ ] At least 40 projects exist across markets
- [ ] Development server running and responding
- [ ] No console errors in browser dev tools

---

## TEST MATRIX (17 Tests)

### TEST 1: Default Page Shows Market Hierarchy

**Objective**: Verify default `/projects` page respects market priority (UAE before India)

**Setup**:
- Clear all filters
- No sort parameter applied
- Fresh page load

**Steps**:
1. Navigate to `http://localhost:3000/projects`
2. Observe first 3 projects displayed
3. Check country of projects: `countryIso2` field

**Expected Result**: ✅
- All UAE projects appear in page 1
- No India projects visible until pagination
- Order within UAE: Dubai (1) before Abu Dhabi (2)
- First project title visible in results

**Verification Points**:
```javascript
// In browser console:
const projects = document.querySelectorAll('[data-project-id]')
projects.forEach(p => {
  const name = p.getAttribute('data-project-name')
  const country = p.getAttribute('data-project-country')
  console.log(`${name} (${country})`)
})
// Expected: All "AE" in first 24, all "IN" in second page
```

**Pass/Fail**: _____ (Circle one: PASS / FAIL)

---

### TEST 2: Admin Reorder Persists Across Sessions

**Objective**: Verify admin can drag-reorder projects and changes persist

**Setup**:
- Login as admin
- Navigate to `/admin/projects/listing-management`
- Market: UAE, City: Dubai selected

**Steps**:
1. Identify project #1 and project #3 in list
2. Record their current names
3. Drag project #3 to position #1
4. Click [Save Order]
5. Observe success notification
6. Close browser completely
7. Reopen and navigate back to same page
8. Verify project #3 is still at position #1

**Expected Result**: ✅
- Drag-and-drop works smoothly
- Save button activates when order changes
- Success toast appears: "Order updated successfully"
- After reload: Project maintains new position
- Database shows updated `listingPriority` values

**Verification Points**:
```sql
-- Check database directly:
SELECT id, name, city, listing_priority 
FROM projects 
WHERE country_iso2 = 'AE' AND city = 'Dubai' 
ORDER BY listing_priority ASC NULLS LAST, created_at DESC;
-- Should show new priority order
```

**Pass/Fail**: _____ (Circle one: PASS / FAIL)

---

### TEST 3: Featured Projects Are Independent from Listing Priority

**Objective**: Verify featured projects use separate ordering and don't interfere with listing priority

**Setup**:
- Two featured projects in Dubai (different priority positions)
- Three non-featured projects in Dubai

**Steps**:
1. Navigate to `/projects?featured=true`
2. Observe featured projects order (should be by featuredOrder)
3. Navigate to `/projects` (no featured filter)
4. Observe all projects, including featured ones
5. Verify featured projects appear in their listing-priority position, NOT at top

**Expected Result**: ✅
- Featured filter shows only featured projects, ordered by `featuredOrder`
- Without filter: Featured projects appear according to `listingPriority`, not separately
- Example: Featured project may be position #5 in default listing (by priority)
- No special visual emphasis affecting ordering logic

**Verification Points**:
```javascript
// Without featured filter:
const projects = document.querySelectorAll('[data-project-id]')
const featured = Array.from(projects).filter(p => 
  p.getAttribute('data-is-featured') === 'true'
)
// Featured should be interspersed, not grouped at top
console.log('Featured projects at positions:', featured.map(p => 
  Array.from(projects).indexOf(p)
))
```

**Pass/Fail**: _____ (Circle one: PASS / FAIL)

---

### TEST 4: New Projects Default to Fallback Ranking (Don't Jump to Top)

**Objective**: Verify new projects don't unexpectedly appear at top of listing

**Setup**:
- New project created via admin panel (status: PUBLISHED)
- Location: Dubai, listingPriority: NULL (not set)
- Created 5 minutes after this test started

**Steps**:
1. Create new project via `/admin/projects/new`
2. Set: Name, Developer, Country=AE, City=Dubai, Status=PUBLISHED
3. Save project
4. Navigate to `/projects` with no filter
5. Search for newly created project using browser find (Ctrl+F)

**Expected Result**: ✅
- New project appears in results (searchable by name)
- Position is determined by: createdAt DESC, id ASC (fallback)
- NOT at top of Dubai list (unless manually set via reorder)
- Appears after all projects with explicit `listingPriority` values

**Verification Points**:
```sql
SELECT id, name, listing_priority, created_at 
FROM projects 
WHERE city = 'Dubai' 
ORDER BY listing_priority ASC NULLS LAST, created_at DESC 
LIMIT 5;
-- New project should have listing_priority = NULL, be at end of list
```

**Pass/Fail**: _____ (Circle one: PASS / FAIL)

---

### TEST 5: Bulk Import Preserves Existing Priorities

**Objective**: Verify scraper/bulk import doesn't corrupt admin-set priorities

**Setup**:
- 3 existing Dubai projects with manual `listingPriority` (1, 2, 3)
- Bulk import with 5 new projects for Dubai
- Import data intentionally includes `listingPriority` fields

**Steps**:
1. Record existing priorities: Project A=1, Project B=2, Project C=3
2. Run bulk import: `POST /api/projects/import` with test data
3. Query database for original 3 projects
4. Verify priorities unchanged

**Expected Result**: ✅
- Import succeeds for new projects
- Existing Project A still has priority=1
- Existing Project B still has priority=2
- Existing Project C still has priority=3
- New projects have priority=NULL
- Database shows NO warnings about editorial field stripping in logs

**Verification Points**:
```sql
-- Check before and after:
SELECT id, name, listing_priority FROM projects 
WHERE id IN ('project-A', 'project-B', 'project-C');
-- listing_priority should NOT change
```

**Pass/Fail**: _____ (Circle one: PASS / FAIL)

---

### TEST 6: Scraper/Automated Updates Don't Override Editorial Fields

**Objective**: Verify scrapers cannot overwrite `listingPriority`, `isPinned`, etc.

**Setup**:
- Project with manual `listingPriority=2` and `isPinned=true`
- Scraper/automated update hits project (e.g., price change)
- Update payload intentionally includes `listingPriority=999`

**Steps**:
1. Identify project with priority=2, isPinned=true
2. Simulate scraper update: `PATCH /api/projects/[id]` with payload including `listingPriority: 999`
3. Check database after update
4. Verify priority unchanged (still 2, not 999)
5. Check application logs for audit trail

**Expected Result**: ✅
- Update succeeds for non-editorial fields (name, price, description, etc.)
- `listingPriority` remains 2 (NOT updated to 999)
- `isPinned` remains true (NOT overwritten)
- Application logs contain: `[projectImportV2] Stripped editorial fields: listingPriority`
- No database corruption or constraint errors

**Verification Points**:
```sql
SELECT id, name, listing_priority, is_pinned, updated_at 
FROM projects 
WHERE id = 'project-with-priority';
-- listing_priority must still be 2
-- is_pinned must still be true
```

**Pass/Fail**: _____ (Circle one: PASS / FAIL)

---

### TEST 7: City Filter Overrides Market Priority

**Objective**: Verify user filter for city shows ONLY that city, overrides market hierarchy

**Setup**:
- UAE projects (Dubai + Abu Dhabi) in database
- India projects (Mumbai) in database

**Steps**:
1. Navigate to `/projects?city=Mumbai`
2. Observe all results
3. Check: Do any UAE projects appear?

**Expected Result**: ✅
- ONLY Mumbai projects visible
- Zero UAE projects in results
- Results ordered by listing priority within Mumbai (or fallback)
- Filter label shows: "City: Mumbai"
- URL contains: `?city=Mumbai`

**Verification Points**:
```javascript
// In browser console:
const cities = Array.from(document.querySelectorAll('[data-project-city]'))
  .map(p => p.getAttribute('data-project-city'))
const allMumbai = cities.every(city => city === 'Mumbai' || city === 'Bombay')
console.log('All Mumbai only?', allMumbai) // Should be true
```

**Pass/Fail**: _____ (Circle one: PASS / FAIL)

---

### TEST 8: Search Relevance Overrides Listing Priority

**Objective**: Verify search results show relevant matches, not just high-priority projects

**Setup**:
- Search term: "Sobha" (specific developer name)
- Some "Sobha" projects have priority, others don't

**Steps**:
1. Navigate to `/projects?q=Sobha`
2. Observe results: Should show only Sobha projects
3. Note: Some may be Dubai, some Mumbai
4. Check order: Results ranked by relevance to query, not market hierarchy

**Expected Result**: ✅
- ONLY projects matching "Sobha" visible
- Results include Sobha projects from multiple cities (if they exist)
- Search relevance scoring applied (not market priority)
- If 1 Sobha project in Dubai (high priority) + 2 Sobha projects in Mumbai (low priority)
  → All 3 shown, ranked by text relevance

**Verification Points**:
```javascript
// In browser console:
const names = Array.from(document.querySelectorAll('[data-project-name]'))
  .map(p => p.getAttribute('data-project-name'))
const allSobha = names.every(name => name.toLowerCase().includes('sobha'))
console.log('All Sobha?', allSobha) // Should be true
```

**Pass/Fail**: _____ (Circle one: PASS / FAIL)

---

### TEST 9: Explicit Sort Parameter Overrides Recommended Sort

**Objective**: Verify user-selected sort (price, date) overrides admin-controlled default ordering

**Setup**:
- Projects with varying prices
- Projects with varying creation dates

**Steps**:
1. Navigate to `/projects?sortBy=price-asc`
2. Observe first 3 projects' starting prices
3. Verify they are in ascending order (lowest first)
4. Navigate to `/projects?sortBy=price-desc`
5. Observe first 3 projects' starting prices
6. Verify they are in descending order (highest first)
7. Navigate to `/projects?sortBy=newest`
8. Verify first project is most recently created

**Expected Result**: ✅
- `sortBy=price-asc`: Projects ordered by `startingPrice ASC` (nulls last)
- `sortBy=price-desc`: Projects ordered by `startingPrice DESC` (nulls last)
- `sortBy=newest`: Projects ordered by `createdAt DESC` (most recent first)
- `sortBy=recommended` (or default): Market → City → Listing priority
- **All sort modes ignore market/city priority when explicitly set**

**Verification Points**:
```javascript
// For price-asc:
const prices = Array.from(document.querySelectorAll('[data-project-price]'))
  .map(p => parseInt(p.getAttribute('data-project-price')))
const ascending = prices.every((p, i) => i === 0 || prices[i-1] <= p)
console.log('Ascending prices?', ascending) // Should be true
```

**Pass/Fail**: _____ (Circle one: PASS / FAIL)

---

### TEST 10: Pagination Preserves Order Across Pages

**Objective**: Verify order consistency between page 1, 2, 3 of same query

**Setup**:
- Default `/projects` (no filters, recommended sort)
- 24 results per page

**Steps**:
1. Navigate to `/projects?page=1`
2. Record first project's name and priority: Project1, priority=1
3. Record last project on page 1: Project24, priority=24 (or lower)
4. Click Next Page or navigate to `/projects?page=2`
5. Observe first project on page 2
6. First project on page 2 should have priority ~25 (continuing sequence)

**Expected Result**: ✅
- Page 1: Projects with highest priorities (1, 2, 3... up to 24)
- Page 2: Projects continuing from priority 25 onwards
- **No duplicate projects across pages**
- **No gaps in sequence**
- Same projects appear in same order if you re-visit same page

**Verification Points**:
```sql
-- Verify page 1 order in database:
SELECT id, name, listing_priority, created_at 
FROM projects 
WHERE country_iso2 = 'AE' AND city = 'Dubai'
ORDER BY listing_priority ASC NULLS LAST, created_at DESC, id ASC
LIMIT 24;

-- Verify page 2 continues from project 25:
SELECT id, name, listing_priority, created_at 
FROM projects 
WHERE country_iso2 = 'AE' AND city = 'Dubai'
ORDER BY listing_priority ASC NULLS LAST, created_at DESC, id ASC
LIMIT 24 OFFSET 24;
```

**Pass/Fail**: _____ (Circle one: PASS / FAIL)

---

### TEST 11: Unpublished Projects Hidden from Public

**Objective**: Verify non-published projects never appear in public listing

**Setup**:
- Project with status: DRAFT (not published)
- Same project should be visible to admin

**Steps**:
1. Create/identify project with status=DRAFT
2. Navigate to `/projects` as regular user
3. Search for project by name (Ctrl+F)
4. Verify NOT found
5. Login as admin
6. Navigate to `/admin/projects`
7. Search for same project
8. Verify IS found and shows status=DRAFT

**Expected Result**: ✅
- DRAFT projects invisible to public (not in `/projects`)
- DRAFT projects visible to admin only (in `/admin/projects`)
- No leakage of unpublished data
- URL params cannot bypass this (e.g., no `?status=DRAFT`)

**Pass/Fail**: _____ (Circle one: PASS / FAIL)

---

### TEST 12: Archived Projects Don't Corrupt Ordering

**Objective**: Verify archiving/restoring projects doesn't break priority sequences

**Setup**:
- 3 projects with priorities: 1, 2, 3
- Project #2 is archived

**Steps**:
1. Observe order: Project#1 (p=1), Project#2 (p=2), Project#3 (p=3)
2. Archive Project#2 (status = ARCHIVED)
3. Check public listing: Should show Project#1, Project#3 only
4. Verify order is: Project#1 first, Project#3 second
5. Restore Project#2 (status = PUBLISHED)
6. Verify order returns to: Project#1, Project#2, Project#3

**Expected Result**: ✅
- Archiving removes from public, preserves priority in database
- Restoration immediately shows project in previous position
- No gaps or reordering needed
- Priority sequence intact after archive/restore cycle
- Zero data corruption

**Pass/Fail**: _____ (Circle one: PASS / FAIL)

---

### TEST 13: Missing/Invalid Location Data Handled Gracefully

**Objective**: Verify system doesn't crash if project has invalid city/country

**Setup**:
- Manually insert test project with city=NULL or city='INVALID'
- countryIso2='XX' (unsupported)

**Steps**:
1. Query database: Create project with incomplete location data
2. Navigate to `/projects`
3. Observe page loads without errors
4. Check browser console: No JavaScript errors
5. Check server logs: No crashes or exceptions
6. Project should be shown or gracefully hidden (not cause 500 error)

**Expected Result**: ✅
- Page loads successfully (no 500 error)
- No JavaScript console errors
- Invalid projects either:
  - Shown at bottom of results (fallback to createdAt DESC)
  - OR gracefully excluded with warning in logs
- No cascade failures

**Pass/Fail**: _____ (Circle one: PASS / FAIL)

---

### TEST 14: Missing Project Images Show Graceful Fallback

**Objective**: Verify listing doesn't break if project has no images

**Setup**:
- Project with no media/cover images
- coverImage = NULL

**Steps**:
1. Navigate to `/projects`
2. Find project without image
3. Verify it displays (doesn't cause layout break)
4. Check if placeholder image is shown

**Expected Result**: ✅
- Project card renders with placeholder/default image
- No broken image icons (red X)
- Layout not disrupted
- Project remains in correct position in order

**Pass/Fail**: _____ (Circle one: PASS / FAIL)

---

### TEST 15: Unauthorized Admin Access Returns 403

**Objective**: Verify non-admins cannot access admin reordering endpoints

**Setup**:
- Regular user (role: USER)
- Developer user (role: DEVELOPER)

**Steps**:
1. Login as regular user
2. Try to navigate to `/admin/projects/listing-management`
3. Observe response (should be 403 or redirect to login)
4. Login as developer
5. Try same endpoint
6. Observe response (should be 403)
7. Try API endpoint: `POST /api/admin/projects/reorder` as regular user
8. Observe response: 403 Forbidden

**Expected Result**: ✅
- Regular users: Redirected or 403 error
- Developers: Redirected or 403 error
- Only ADMIN/SUPERADMIN roles can access
- No accidental data exposure
- API endpoints also protected with same RBAC

**Pass/Fail**: _____ (Circle one: PASS / FAIL)

---

### TEST 16: Concurrent Reorder Requests Don't Corrupt Data

**Objective**: Verify concurrent admin updates don't result in inconsistent state

**Setup**:
- Two admin sessions (or API calls)
- Both attempting to reorder same city simultaneously

**Steps**:
1. Open two browser windows, both logged in as admin
2. Both navigate to `/admin/projects/listing-management?country=AE&city=Dubai`
3. In Window 1: Drag Project A from position 1 to position 5
4. In Window 2: Drag Project B from position 2 to position 1
5. Window 1: Click Save
6. Window 2: Click Save (immediately after)
7. Query database: Check final state

**Expected Result**: ✅
- One request succeeds, other fails gracefully OR
- Transaction-level locks prevent corruption
- Final database state is consistent (not mixed)
- User sees error message: "Order changed by another admin. Please refresh."
- No duplicate priorities or orphaned records

**Pass/Fail**: _____ (Circle one: PASS / FAIL)

---

### TEST 17: RBAC Respected (Different Roles)

**Objective**: Verify role-based access control works as designed

**Setup**:
- ADMIN user (can manage project ordering)
- SUPERADMIN user (can manage project ordering)
- MODERATOR user (cannot manage project ordering)
- USER/Developer (cannot manage project ordering)

**Steps**:
1. Login as MODERATOR
2. Try to access `/admin/projects/listing-management`
3. Verify: Access denied (403 or redirect)
4. Try API: `GET /api/admin/projects/market-config`
5. Verify: 403 Forbidden
6. Login as ADMIN
7. Try same endpoints
8. Verify: Access granted (200 OK)
9. Login as SUPERADMIN
10. Try same endpoints
11. Verify: Access granted (200 OK)

**Expected Result**: ✅
- MODERATOR: Cannot access any admin ordering features
- ADMIN: Full access to all ordering endpoints
- SUPERADMIN: Full access to all ordering endpoints
- All non-ADMIN roles: Consistently rejected
- No permission leakage between roles

**Pass/Fail**: _____ (Circle one: PASS / FAIL)

---

## TEST RESULT SUMMARY

**Total Tests**: 17  
**Passed**: _____ / 17  
**Failed**: _____ / 17  

### Failed Test Details (If Any)

For each failed test, document:

**Test #___:**
- Expected: 
- Actual: 
- Root Cause: 
- Fix Applied: 
- Re-test Result: PASS / FAIL

---

## COMMON ISSUES & TROUBLESHOOTING

### Issue: Market priorities not loading
**Solution**: 
- Verify `npx prisma db seed` ran successfully
- Check database: `SELECT * FROM market_priorities;`
- Ensure `lib/services/ProjectListingService.ts` cache is cleared

### Issue: Admin page shows "Access Denied"
**Solution**:
- Verify user role is ADMIN or SUPERADMIN
- Check auth token is valid
- Verify admin endpoints have auth middleware

### Issue: Projects not reordering on public page
**Solution**:
- Check browser cache: Hard refresh (Ctrl+Shift+R)
- Verify `revalidatePath()` called in API response
- Check Next.js build cache

### Issue: Pagination shows duplicate projects
**Solution**:
- Verify sorting is stable (includes id ASC tiebreaker)
- Check SQL order: `ORDER BY listing_priority ASC NULLS LAST, created_at DESC, id ASC`
- Verify OFFSET calculation: `OFFSET (page-1) * 24`

---

## DEPLOYMENT CHECKLIST

- [ ] All 17 tests passing
- [ ] No console errors (browser or server)
- [ ] Database backup taken
- [ ] Feature flag ready (if using staged rollout)
- [ ] Cache invalidation strategy verified
- [ ] Admin documentation updated
- [ ] Monitoring/alerts configured for order-related queries
- [ ] Analytics tracking for sort option usage
- [ ] Rollback plan documented
- [ ] Stakeholders notified of go-live time

### Staging to Production

```bash
# 1. Verify all migrations applied
npx prisma migrate deploy

# 2. Build production bundle
npm run build

# 3. Clear cache (if using Redis/CDN)
# Custom command based on your infrastructure

# 4. Start application
npm run start

# 5. Verify health check
curl http://localhost:3000/api/health

# 6. Monitor logs for 30 minutes
tail -f logs/application.log
```

---

## POST-DEPLOYMENT MONITORING

### Critical Metrics to Watch

1. **API Response Times**
   - `/api/search/projects`: Should be <200ms
   - `/api/admin/projects/listing-management`: Should be <300ms

2. **Error Rates**
   - 5xx errors for ordering endpoints: Should be 0%
   - 403 Forbidden (expected for non-admins): Expected

3. **User Behavior**
   - Projects page users: Monitor for drop-off
   - Sort option usage: Track which sorts used most
   - Admin reorder frequency: Expected multiple times per day

4. **Database Performance**
   - Query time for `/projects`: Monitor slow query log
   - Index usage: Verify indexes on listing_priority, isPinned, etc.

### Alerts to Configure

- [ ] API endpoint 5xx error rate > 1%
- [ ] `/projects` page load time > 500ms
- [ ] Database connection pool exhaustion
- [ ] Admin reorder API response time > 1s
- [ ] Cache invalidation failure

---

## ROLLBACK PLAN (If Critical Issue)

If deployment causes significant issues:

1. **Immediate**: Revert deployment to previous version
   ```bash
   # Use your deployment system (e.g., docker rollback, git revert)
   git revert <commit-hash>
   npm run build && npm run start
   ```

2. **Keep database**: DO NOT revert database schema
   - Existing migration is backward compatible
   - New fields are optional (NULL-able)
   - Old code still works with NULL values

3. **Notify stakeholders**: Document issue in postmortem

4. **Fix and redeploy**: Address issue in new PR, test, then deploy again

---

## SUCCESS CRITERIA

✅ All 17 tests pass  
✅ No critical errors in logs  
✅ Admin can reorder projects and see changes immediately  
✅ Market/city priorities respected in public listing  
✅ Scrapers cannot corrupt editorial fields  
✅ Performance within acceptable limits (< 200ms for API)  
✅ Monitoring alerts configured and working  

**When all criteria met → Project ready for production.**
