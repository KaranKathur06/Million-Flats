# Project Media Gallery & Brochure Upload Remediation

**Date:** 2026-08-12  
**Status:** ✅ Complete (Core Architecture)  
**Scope:** Fix and redesign project media gallery + brochure upload across new project creation, edit, admin UI, public project page, database, APIs, S3 storage, and future VerixView compatibility.

---

## Overview

This remediation addresses critical gaps in the project media architecture:

1. **Fragmented Upload Limits**: Mixed hard-coded limits (10MB, 15MB, 20MB, 50MB) across endpoints
2. **Brochure Size Cap**: Client-side 20MB limit prevented users from uploading larger PDFs
3. **No Hero Uniqueness**: Multiple HERO media could exist per project, causing rendering ambiguity
4. **Missing Presign Flow**: Large brochures required server buffering (expensive, timeout-prone)
5. **UI Component Fragmentation**: Native `<select>` elements instead of unified `GlobalDropdown`

---

## Changes Summary

### 1. Client-Side Brochure Size Configuration

**Files Changed:**
- `components/admin/projects/ProjectForm/ProjectFormSchema.ts`
- `components/admin/projects/ProjectForm/ProjectForm.tsx`

**Before:**
```typescript
export const PROJECT_BROCHURE_MAX_SIZE = 20 * 1024 * 1024 // Hard-coded 20MB
// Form error: "Brochure must be 20MB or less"
```

**After:**
```typescript
// projectFormSchema.ts
export const PROJECT_BROCHURE_MAX_SIZE = Number(process.env.NEXT_PUBLIC_PROJECT_BROCHURE_MAX_SIZE) || 300 * 1024 * 1024

// ProjectForm.tsx
const mb = Math.floor(PROJECT_BROCHURE_MAX_SIZE / 1024 / 1024)
// Dynamic error: "Brochure must be 300MB or less"
```

**Benefit:** Users can now upload brochures up to 300MB; configurable via `NEXT_PUBLIC_PROJECT_BROCHURE_MAX_SIZE` env variable without code changes.

---

### 2. Global Dropdown Component Standardization

**Files Changed:**
- `components/admin/projects/ProjectForm/ProjectForm.tsx` (4 selects → GlobalDropdown)
- `components/admin/projects/ProjectEditorForm.tsx` (4 selects → GlobalDropdown)

**Elements Replaced:**
- Developer selector
- Country selector
- Unit variant availability status (AVAILABLE/SOLD_OUT)
- Payment plan item type (BASE_PRICE/FEE)

**Benefit:** Consistent, accessible dropdown UI across forms; improved keyboard navigation and styling.

---

### 3. Server-Side Brochure Upload Size Enforcement

**File:** `app/api/admin/projects/[id]/brochure/route.ts`

**Changes:**
- Added server-side constant: `BROCHURE_MAX_SIZE = Number(process.env.PROJECT_BROCHURE_MAX_SIZE_BYTES) || 300 * 1024 * 1024`
- Removed comment: "No file size limit enforced for brochure uploads"
- Added validation before S3 upload:
  ```typescript
  if (file.size > BROCHURE_MAX_SIZE) {
    return NextResponse.json(
      { success: false, message: `Brochure exceeds maximum size of ${maxMB}MB` },
      { status: 413 }
    )
  }
  ```

**Benefit:** Prevents server memory exhaustion from huge file buffering; enforces limit server-side even if client validation is bypassed.

---

### 4. Presigned Direct-to-S3 Brochure Upload Endpoint

**File:** `app/api/admin/projects/[id]/brochure/presign/route.ts` **(NEW)**

**Purpose:** Enable direct-to-S3 uploads for large PDFs, bypassing server buffering.

**Endpoint:** `POST /api/admin/projects/[id]/brochure/presign`

**Request Body:**
```typescript
{
  fileName: string          // "Company_Brochure_2024.pdf"
  fileSizeBytes: number     // 157286400 (150MB)
  contentType: string       // "application/pdf"
}
```

**Response:**
```typescript
{
  success: true,
  uploadUrl: string,        // Pre-signed S3 PUT URL (10 min expiry)
  s3Key: string,            // S3 object key for finalize call
  expiresIn: number         // 600 seconds
}
```

**Validation:**
- Admin auth required (role-based)
- File size validated against `PROJECT_BROCHURE_MAX_SIZE_BYTES` (300MB default)
- Content-Type must be `application/pdf`
- Project must exist
- Returns 413 if file exceeds limit

**Client Usage:**
1. Request presigned URL
2. Upload PDF directly to S3 using PUT request to `uploadUrl`
3. Call finalize endpoint with `s3Key`

---

### 5. Brochure Finalize Endpoint (Record Metadata)

**File:** `app/api/admin/projects/[id]/brochure/finalize/route.ts` **(NEW)**

**Purpose:** Record brochure metadata in database after successful S3 upload.

**Endpoint:** `POST /api/admin/projects/[id]/brochure/finalize`

**Request Body:**
```typescript
{
  s3Key: string,            // From presign response
  fileName: string,         // "Company_Brochure_2024.pdf"
  fileSizeBytes: number     // 157286400
}
```

**Response:**
```typescript
{
  success: true,
  brochure: {
    id: string,
    fileUrl: string,
    fileName: string,
    fileSize: number
  }
}
```

**Behavior:**
- Verifies project exists
- Deletes existing brochure (orphans old S3 object for cleanup jobs)
- Creates new `ProjectBrochure` record
- Updates `Project.brochureUrl` for backward compatibility

**Error Cases:**
- 401: Unauthorized (not admin)
- 404: Project not found
- 400: Invalid input
- 500: Database or S3 error

---

### 6. Unified Size Limits Across Upload Endpoints

#### 6a. Manual Properties Upload Presign

**File:** `app/api/manual-properties/upload/presign/route.ts`

**Added Constants:**
```typescript
const BROCHURE_MAX_SIZE = Number(process.env.PROJECT_BROCHURE_MAX_SIZE_BYTES) || 300 * 1024 * 1024
const VIDEO_MAX_SIZE = Number(process.env.PROJECT_VIDEO_MAX_SIZE_BYTES) || 500 * 1024 * 1024
const IMAGE_MAX_SIZE = Number(process.env.PROJECT_IMAGE_MAX_SIZE_BYTES) || 60 * 1024 * 1024
```

**Updated Validation:**
- Brochure: 15MB → `BROCHURE_MAX_SIZE` (300MB)
- Video: 50MB → `VIDEO_MAX_SIZE` (500MB)
- Image: 10MB → `IMAGE_MAX_SIZE` (60MB)

**Benefit:** Centralized, configurable limits; dynamic error messages reflect actual max size.

#### 6b. Project Image Upload Endpoint

**File:** `app/api/upload/project-image/route.ts`

**Added Constants:**
```typescript
const IMAGE_MAX_SIZE = Number(process.env.PROJECT_IMAGE_MAX_SIZE_BYTES) || 50 * 1024 * 1024
const FLOOR_PLAN_MAX_SIZE = PROJECT_FLOOR_PLAN_MAX_SIZE // 5MB from schema
```

**Updated Validation:**
- Images: Hard-coded 50MB → `IMAGE_MAX_SIZE` (env-driven)
- Floor Plans: Unchanged (5MB from schema)
- Error messages now show actual configured limit

**Benefit:** Consistent image upload limits across admin UI.

---

### 7. Server-Side Hero Media Uniqueness Constraint

**File:** `app/api/admin/projects/[id]/media/route.ts`

**Added Logic:** When setting category='hero':
1. Find any existing HERO media for the project
2. Demote existing HERO to GALLERY (update category and mediaType)
3. Create new HERO media
4. Update Project.coverImage

**Implementation (JSON Path):**
```typescript
if (data.category === 'hero') {
  const existingHero = await prisma.projectMedia.findFirst({
    where: { projectId: params.id, category: 'HERO' }
  })
  if (existingHero) {
    await prisma.projectMedia.update({
      where: { id: existingHero.id },
      data: { category: 'GALLERY', mediaType: 'gallery' }
    })
  }
}
```

**Implementation (Multipart Path):**
- Same logic applied to multipart server uploads

**Benefit:**
- Ensures only one HERO per project
- Automatic demotion prevents stale hero references
- Prevents hero orphaning when replacing

---

## Environment Configuration

### Required Environment Variables

Add to `.env` (backend/server-side only):
```bash
# Server-side upload size limits (in bytes)
PROJECT_BROCHURE_MAX_SIZE_BYTES=314572800  # 300MB
PROJECT_IMAGE_MAX_SIZE_BYTES=52428800      # 50MB
PROJECT_VIDEO_MAX_SIZE_BYTES=524288000     # 500MB
```

Add to `.env.local` (client-side, public):
```bash
# Client-side brochure limit for form validation (in bytes)
NEXT_PUBLIC_PROJECT_BROCHURE_MAX_SIZE=314572800  # 300MB
```

### Recommended .env.example Entry

```bash
# Project Media Upload Configuration
# ===================================
# Server enforces these limits on all upload endpoints
# Set in bytes; default examples shown below

# Brochure (PDF) maximum file size
PROJECT_BROCHURE_MAX_SIZE_BYTES=314572800        # 300MB default

# Project image (JPG/PNG/WebP) maximum file size
PROJECT_IMAGE_MAX_SIZE_BYTES=52428800            # 50MB default

# Project video (MP4/WebM) maximum file size
PROJECT_VIDEO_MAX_SIZE_BYTES=524288000           # 500MB default

# Client-side brochure validation (must match server limit)
NEXT_PUBLIC_PROJECT_BROCHURE_MAX_SIZE=314572800  # 300MB default
```

---

## Architecture & Data Flow

### Brochure Upload Flow (New Presign Path)

```
1. Admin clicks "Upload Brochure"
   ↓
2. Client calls POST /api/admin/projects/[id]/brochure/presign
   - Sends: { fileName, fileSizeBytes, contentType }
   - Receives: { uploadUrl, s3Key, expiresIn }
   ↓
3. Client uploads PDF directly to S3
   - PUT request to uploadUrl
   - No server buffering
   ↓
4. Client calls POST /api/admin/projects/[id]/brochure/finalize
   - Sends: { s3Key, fileName, fileSizeBytes }
   - Server creates ProjectBrochure record
   ↓
5. Project updated with brochure metadata
```

### Brochure Upload Flow (Multipart Path - Backward Compatible)

```
1. Admin clicks "Upload Brochure" (legacy form)
   ↓
2. Client calls POST /api/admin/projects/[id]/brochure
   - Sends: multipart/form-data with file
   - Server reads file into memory
   - Server uploads to S3
   - Server creates ProjectBrochure record
   ↓
3. Project updated with brochure metadata
   
Note: Limited to REQUEST_TIMEOUT (typically 30-60s)
      For files > 100MB, presign path recommended
```

### Media Uniqueness Flow

```
Admin sets unit variant image as HERO:
   ↓
POST /api/admin/projects/[id]/media { category: 'hero', url }
   ↓
Server finds existing HERO for project
   ↓
Server demotes existing: category HERO → GALLERY
   ↓
Server creates new: category HERO
   ↓
Server updates Project.coverImage = new URL
   ↓
Result: Only 1 HERO per project at all times
```

---

## Prisma Schema (Unchanged)

### ProjectMedia
```typescript
model ProjectMedia {
  id         String
  projectId  String
  mediaUrl   String
  mediaType  String          // legacy field
  category   ProjectImageCategory?  // 'HERO' | 'GALLERY' | 'INTERIOR' | etc.
  label      String?
  s3Key      String?
  sortOrder  Int?
  createdAt  DateTime
}

enum ProjectImageCategory {
  HERO
  GALLERY
  INTERIOR
  EXTERIOR
  AMENITIES
  LIFESTYLE
  FLOOR_PLAN
}
```

### ProjectBrochure
```typescript
model ProjectBrochure {
  id         String @unique per project
  projectId  String @unique
  fileUrl    String       // S3 key or URL
  s3Key      String?      // Normalized S3 key
  fileName   String
  fileSize   Int?
  mimeType   String       // "application/pdf"
  uploadedAt DateTime
}
```

---

## Testing Checklist

### Unit Tests (Before Deployment)

- [ ] Brochure presign endpoint validates file size correctly
- [ ] Brochure presign returns 413 when file exceeds limit
- [ ] Brochure finalize creates record with correct metadata
- [ ] Hero uniqueness: demotes existing HERO when setting new one
- [ ] GlobalDropdown components render and handle changes correctly
- [ ] Media upload validation uses correct size limits

### Integration Tests

- [ ] Small brochure (5MB) upload presign → finalize flow
- [ ] Large brochure (200MB+) upload presign → finalize flow
- [ ] Presigned URL expires correctly after 10 minutes
- [ ] Multiple projects can have independent brochures
- [ ] Setting hero image demotes previous hero in database
- [ ] Project.coverImage updates correctly when hero changes

### Manual Testing (Staging)

- [ ] Admin form loads project with existing brochure
- [ ] Admin can upload new brochure (presign path)
- [ ] Admin can upload new brochure (multipart fallback)
- [ ] Brochure > 300MB is rejected with 413 error
- [ ] Public project page renders correct hero image
- [ ] Brochure download tracks in BrochureDownload table

### Performance Tests

- [ ] Presign request completes in < 200ms
- [ ] Finalize request completes in < 500ms
- [ ] S3 upload of 300MB completes within client timeout
- [ ] No memory leaks on server during 50MB+ uploads

---

## Deployment Steps

### 1. Pre-Deployment

- [ ] Backup database
- [ ] Review all code changes
- [ ] Run TypeScript compiler: `tsc --noEmit`
- [ ] Run linter: `npm run lint` (if configured)

### 2. Environment Configuration

Add to deployment environment variables:
```bash
PROJECT_BROCHURE_MAX_SIZE_BYTES=314572800
PROJECT_IMAGE_MAX_SIZE_BYTES=52428800
PROJECT_VIDEO_MAX_SIZE_BYTES=524288000
NEXT_PUBLIC_PROJECT_BROCHURE_MAX_SIZE=314572800
```

### 3. Deployment

```bash
# Build
npm run build

# Deploy (Vercel, Docker, etc.)
# Restart Next.js server
```

### 4. Post-Deployment Verification

- [ ] Server logs show no startup errors
- [ ] Admin project form loads without errors
- [ ] Presign endpoint responds to test request
- [ ] New brochure uploads work end-to-end
- [ ] Existing projects load correctly
- [ ] Public project pages render heroes correctly

### 5. Rollback Plan

If issues occur:
```bash
# Revert files to previous commit
git revert [commit-hash]

# Rebuild and redeploy
npm run build
# Redeploy to production
```

---

## Known Limitations & Future Work

### Current Limitations

1. **Admin UI Media Management**
   - No UI to view/manage existing media per category
   - No drag-drop reordering
   - Hero selection not visible in form

2. **Client-Side Presign Implementation**
   - Presign endpoints created; client UI not yet updated
   - Fallback to multipart still works for backward compatibility

3. **Infrastructure Assumptions**
   - Assumes Cloudflare/Nginx/LB configured for 300MB+ requests
   - No validation of infrastructure limits in code

4. **Orphan Cleanup**
   - No automatic cleanup of old S3 objects
   - Manual or scheduled cleanup job recommended

### Future Enhancements

- [ ] **Admin Media Gallery UI**
  - Visual grid of existing media
  - Category filter/sorting
  - Drag-drop reordering
  - Hero badge/selector
  - Delete with S3 cleanup

- [ ] **Client-Side Presign Implementation**
  - Update ProjectForm to use presign for brochures
  - Progress indicator for large uploads
  - Retry logic on timeout

- [ ] **Infrastructure Validation**
  - Health check endpoint to verify upload limits
  - Logging for infrastructure limit rejections

- [ ] **Observability**
  - CloudWatch metrics for media uploads
  - Audit log entries for hero changes
  - S3 access logging for security

- [ ] **Orphan Cleanup Job**
  - Scheduled task to identify orphaned S3 objects
  - Batch deletion with cost tracking
  - Audit trail for deletions

---

## Migration Notes (For Existing Data)

### ProjectMedia Category Normalization

Existing `ProjectMedia` records have:
- `category` enum (HERO, GALLERY, etc.)
- `mediaType` legacy field (may contain 'hero', 'gallery', etc.)

**Status:** No migration required. Both fields coexist.

**Recommendation:** Future cleanup to remove `mediaType` field after ensuring all code uses `category`.

### ProjectBrochure Backward Compatibility

`Project.brochureUrl` continues to store S3 key:
- Existing brochures: URL string
- New brochures: S3 key (stored in both fileUrl and brochureUrl)

**Result:** Public download endpoint and admin UI both work seamlessly.

---

## Support & Questions

For questions about this remediation:

1. Check this document first (common Q&A below)
2. Review code comments in modified files
3. Check git history for inline context: `git log -p --follow -- app/api/admin/projects/`

### Common Q&A

**Q: Why 300MB default?**
A: Balances practical PDF size with infrastructure safety. Adjustable via env variable.

**Q: Can I change the limits per endpoint?**
A: Yes. Each endpoint has its own env variable (`PROJECT_BROCHURE_MAX_SIZE_BYTES`, etc.).

**Q: What happens to old 20MB brochures?**
A: Existing ProjectBrochure records unchanged. New uploads can be larger.

**Q: Does presign endpoint require S3 credentials?**
A: No. Server generates signed URL; client uploads directly to S3 without credentials.

**Q: Can a project have multiple HEROes?**
A: No. Server automatically demotes previous HERO when new one is set.

---

## File Manifest

### Modified Files (7 total)

| File | Changes |
|------|---------|
| `components/admin/projects/ProjectForm/ProjectFormSchema.ts` | Client brochure size config |
| `components/admin/projects/ProjectForm/ProjectForm.tsx` | Dynamic error msg, GlobalDropdown replacements |
| `components/admin/projects/ProjectEditorForm.tsx` | GlobalDropdown replacements |
| `app/api/admin/projects/[id]/brochure/route.ts` | Server size validation |
| `app/api/admin/projects/[id]/media/route.ts` | Hero uniqueness logic |
| `app/api/manual-properties/upload/presign/route.ts` | Unified size limits |
| `app/api/upload/project-image/route.ts` | Env-driven size limits |

### New Files (2 total)

| File | Purpose |
|------|---------|
| `app/api/admin/projects/[id]/brochure/presign/route.ts` | Generate presigned S3 PUT URLs |
| `app/api/admin/projects/[id]/brochure/finalize/route.ts` | Record brochure metadata |

---

**Document Version:** 1.0  
**Last Updated:** 2026-08-12  
**Status:** ✅ Ready for Deployment
