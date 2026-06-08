-- ═══════════════════════════════════════════════════════════════════════════
-- DATABASE URL NORMALIZATION — CDN Migration (FIXED)
-- ═══════════════════════════════════════════════════════════════════════════
-- Column names verified against Prisma schema @map() directives.
--
-- BEFORE: https://millionflats-prod-assets.s3.eu-north-1.amazonaws.com/public/projects/...
-- AFTER:  public/projects/...
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

-- ── 1. project_media.media_url ──────────────────────────────────────────────
UPDATE project_media
SET media_url = REPLACE(
  media_url,
  'https://millionflats-prod-assets.s3.eu-north-1.amazonaws.com/',
  ''
)
WHERE media_url LIKE 'https://millionflats-prod-assets.s3.eu-north-1.amazonaws.com/%';

-- ── 2. project_floor_plans.image_url ────────────────────────────────────────
UPDATE project_floor_plans
SET image_url = REPLACE(
  image_url,
  'https://millionflats-prod-assets.s3.eu-north-1.amazonaws.com/',
  ''
)
WHERE image_url LIKE 'https://millionflats-prod-assets.s3.eu-north-1.amazonaws.com/%';

-- ── 3. projects.cover_image ─────────────────────────────────────────────────
UPDATE projects
SET cover_image = REPLACE(
  cover_image,
  'https://millionflats-prod-assets.s3.eu-north-1.amazonaws.com/',
  ''
)
WHERE cover_image LIKE 'https://millionflats-prod-assets.s3.eu-north-1.amazonaws.com/%';

-- ── 4. projects.brochure_url ────────────────────────────────────────────────
UPDATE projects
SET brochure_url = REPLACE(
  brochure_url,
  'https://millionflats-prod-assets.s3.eu-north-1.amazonaws.com/',
  ''
)
WHERE brochure_url LIKE 'https://millionflats-prod-assets.s3.eu-north-1.amazonaws.com/%';

-- ── 5. project_brochures.file_url ───────────────────────────────────────────
UPDATE project_brochures
SET file_url = REPLACE(
  file_url,
  'https://millionflats-prod-assets.s3.eu-north-1.amazonaws.com/',
  ''
)
WHERE file_url LIKE 'https://millionflats-prod-assets.s3.eu-north-1.amazonaws.com/%';

-- ── 6. agents.profile_photo ─────────────────────────────────────────────────
UPDATE agents
SET profile_photo = REPLACE(
  profile_photo,
  'https://millionflats-prod-assets.s3.eu-north-1.amazonaws.com/',
  ''
)
WHERE profile_photo LIKE 'https://millionflats-prod-assets.s3.eu-north-1.amazonaws.com/%';

-- ── 7. agents.profile_image_url ─────────────────────────────────────────────
UPDATE agents
SET profile_image_url = REPLACE(
  profile_image_url,
  'https://millionflats-prod-assets.s3.eu-north-1.amazonaws.com/',
  ''
)
WHERE profile_image_url LIKE 'https://millionflats-prod-assets.s3.eu-north-1.amazonaws.com/%';

-- ── 8. blogs."featuredImageUrl" (camelCase — NO @map in Prisma) ─────────────
UPDATE blogs
SET "featuredImageUrl" = REPLACE(
  "featuredImageUrl",
  'https://millionflats-prod-assets.s3.eu-north-1.amazonaws.com/',
  ''
)
WHERE "featuredImageUrl" LIKE 'https://millionflats-prod-assets.s3.eu-north-1.amazonaws.com/%';

-- ── 9. Also strip CDN-prefixed URLs if any were stored ──────────────────────

UPDATE project_media
SET media_url = REPLACE(media_url, 'https://cdn.millionflats.com/', '')
WHERE media_url LIKE 'https://cdn.millionflats.com/%';

UPDATE project_floor_plans
SET image_url = REPLACE(image_url, 'https://cdn.millionflats.com/', '')
WHERE image_url LIKE 'https://cdn.millionflats.com/%';

UPDATE projects
SET cover_image = REPLACE(cover_image, 'https://cdn.millionflats.com/', '')
WHERE cover_image LIKE 'https://cdn.millionflats.com/%';

UPDATE projects
SET brochure_url = REPLACE(brochure_url, 'https://cdn.millionflats.com/', '')
WHERE brochure_url LIKE 'https://cdn.millionflats.com/%';

UPDATE project_brochures
SET file_url = REPLACE(file_url, 'https://cdn.millionflats.com/', '')
WHERE file_url LIKE 'https://cdn.millionflats.com/%';

UPDATE agents
SET profile_photo = REPLACE(profile_photo, 'https://cdn.millionflats.com/', '')
WHERE profile_photo LIKE 'https://cdn.millionflats.com/%';

UPDATE agents
SET profile_image_url = REPLACE(profile_image_url, 'https://cdn.millionflats.com/', '')
WHERE profile_image_url LIKE 'https://cdn.millionflats.com/%';

UPDATE blogs
SET "featuredImageUrl" = REPLACE("featuredImageUrl", 'https://cdn.millionflats.com/', '')
WHERE "featuredImageUrl" LIKE 'https://cdn.millionflats.com/%';

COMMIT;

-- ═══════════════════════════════════════════════════════════════════════════
-- VERIFICATION — All should return 0
-- ═══════════════════════════════════════════════════════════════════════════

SELECT 'project_media' AS tbl, COUNT(*) AS legacy_urls FROM project_media WHERE media_url LIKE 'https://%.amazonaws.com/%'
UNION ALL
SELECT 'project_floor_plans', COUNT(*) FROM project_floor_plans WHERE image_url LIKE 'https://%.amazonaws.com/%'
UNION ALL
SELECT 'projects (cover)', COUNT(*) FROM projects WHERE cover_image LIKE 'https://%.amazonaws.com/%'
UNION ALL
SELECT 'projects (brochure)', COUNT(*) FROM projects WHERE brochure_url LIKE 'https://%.amazonaws.com/%'
UNION ALL
SELECT 'project_brochures', COUNT(*) FROM project_brochures WHERE file_url LIKE 'https://%.amazonaws.com/%'
UNION ALL
SELECT 'agents (photo)', COUNT(*) FROM agents WHERE profile_photo LIKE 'https://%.amazonaws.com/%'
UNION ALL
SELECT 'agents (image_url)', COUNT(*) FROM agents WHERE profile_image_url LIKE 'https://%.amazonaws.com/%'
UNION ALL
SELECT 'blogs', COUNT(*) FROM blogs WHERE "featuredImageUrl" LIKE 'https://%.amazonaws.com/%';
