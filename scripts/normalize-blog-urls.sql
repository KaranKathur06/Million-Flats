-- ═══════════════════════════════════════════════════════════════════════════
-- BLOG URL NORMALIZATION — S3 → Relative Paths (CDN Migration)
-- ═══════════════════════════════════════════════════════════════════════════
--
-- PURPOSE: Remove legacy S3 URLs from blog data permanently.
--
-- This handles BOTH:
--   1. Structured fields: "featuredImageUrl"
--   2. HTML content: "content" and "content_html" (inline <img> and <a> tags)
--
-- BEFORE (featuredImageUrl):
--   https://millionflats-prod-assets.s3.eu-north-1.amazonaws.com/public/blogs/my-image.jpg
--
-- AFTER:
--   public/blogs/my-image.jpg
--
-- BEFORE (HTML content):
--   <img src="https://millionflats-prod-assets.s3.eu-north-1.amazonaws.com/public/blogs/inline.jpg">
--
-- AFTER:
--   <img src="https://cdn.millionflats.com/public/blogs/inline.jpg">
--
-- NOTE: For structured fields we strip to relative keys (backend rebuilds CDN URL).
--       For HTML content we replace with full CDN URL (HTML is rendered directly).
-- ═══════════════════════════════════════════════════════════════════════════

-- ── DRY RUN: Check affected rows FIRST ──────────────────────────────────────

SELECT 'blogs (featuredImageUrl S3)' AS target,
       COUNT(*) AS affected_rows
FROM blogs
WHERE "featuredImageUrl" LIKE 'https://millionflats-prod-assets.s3.eu-north-1.amazonaws.com/%'

UNION ALL

SELECT 'blogs (featuredImageUrl CDN)',
       COUNT(*)
FROM blogs
WHERE "featuredImageUrl" LIKE 'https://cdn.millionflats.com/%'

UNION ALL

SELECT 'blogs (content S3)',
       COUNT(*)
FROM blogs
WHERE content LIKE '%amazonaws.com%'

UNION ALL

SELECT 'blogs (content_html S3)',
       COUNT(*)
FROM blogs
WHERE content_html LIKE '%amazonaws.com%';


-- ═══════════════════════════════════════════════════════════════════════════
-- MIGRATION — Run inside a transaction
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

-- ── 1. Normalize featuredImageUrl: S3 → relative key ────────────────────────
UPDATE blogs
SET "featuredImageUrl" = REPLACE(
  "featuredImageUrl",
  'https://millionflats-prod-assets.s3.eu-north-1.amazonaws.com/',
  ''
)
WHERE "featuredImageUrl" LIKE 'https://millionflats-prod-assets.s3.eu-north-1.amazonaws.com/%';

-- ── 2. Normalize featuredImageUrl: CDN → relative key ───────────────────────
UPDATE blogs
SET "featuredImageUrl" = REPLACE(
  "featuredImageUrl",
  'https://cdn.millionflats.com/',
  ''
)
WHERE "featuredImageUrl" LIKE 'https://cdn.millionflats.com/%';

-- ── 3. Rewrite S3 URLs in content HTML → CDN URLs ──────────────────────────
-- NOTE: We use CDN URLs in HTML (not relative) because HTML is rendered directly
UPDATE blogs
SET content = REPLACE(
  content,
  'https://millionflats-prod-assets.s3.eu-north-1.amazonaws.com',
  'https://cdn.millionflats.com'
)
WHERE content LIKE '%millionflats-prod-assets.s3.eu-north-1.amazonaws.com%';

-- ── 4. Rewrite S3 URLs in content_html → CDN URLs ──────────────────────────
UPDATE blogs
SET content_html = REPLACE(
  content_html,
  'https://millionflats-prod-assets.s3.eu-north-1.amazonaws.com',
  'https://cdn.millionflats.com'
)
WHERE content_html LIKE '%millionflats-prod-assets.s3.eu-north-1.amazonaws.com%';

COMMIT;


-- ═══════════════════════════════════════════════════════════════════════════
-- VERIFICATION — All counts should be 0
-- ═══════════════════════════════════════════════════════════════════════════

SELECT 'blogs (featuredImageUrl)' AS target,
       COUNT(*) AS remaining_s3_urls
FROM blogs
WHERE "featuredImageUrl" LIKE '%amazonaws.com%'

UNION ALL

SELECT 'blogs (content)',
       COUNT(*)
FROM blogs
WHERE content LIKE '%amazonaws.com%'

UNION ALL

SELECT 'blogs (content_html)',
       COUNT(*)
FROM blogs
WHERE content_html LIKE '%amazonaws.com%';
