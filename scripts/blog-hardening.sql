-- ============================================================
-- MillionFlats Blog System: Database Index Hardening
-- Run via your PostgreSQL CLI (psql) connected to your AWS RDS
-- Example: psql -h your-host.rds.amazonaws.com -U your_user -d your_db -f scripts/blog-hardening.sql
-- ============================================================

-- 1. VERIFY / CREATE INDEXES
-- Prisma schema defines these, but this ensures they exist.
-- IF NOT EXISTS makes these safe to re-run.
-- ============================================================

-- Core lookup indexes
CREATE INDEX IF NOT EXISTS idx_blogs_slug ON blogs(slug);
CREATE INDEX IF NOT EXISTS idx_blogs_status ON blogs(status);
CREATE INDEX IF NOT EXISTS idx_blogs_created_at ON blogs("createdAt");
CREATE INDEX IF NOT EXISTS idx_blogs_category_id ON blogs("categoryId");
CREATE INDEX IF NOT EXISTS idx_blogs_author_id ON blogs("authorId");
CREATE INDEX IF NOT EXISTS idx_blogs_views ON blogs(views);
CREATE INDEX IF NOT EXISTS idx_blogs_seo_score ON blogs("seoScore");

-- Composite index for the public blog listing query
-- Covers: WHERE status='PUBLISHED' AND publishAt <= now() ORDER BY publishAt DESC, createdAt DESC
CREATE INDEX IF NOT EXISTS idx_blogs_status_publish_created
  ON blogs(status, "publishAt" DESC, "createdAt" DESC);

-- 2. VERIFY
-- ============================================================
-- Run this to confirm all indexes are in place:
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'blogs'
ORDER BY indexname;
