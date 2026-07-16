-- ============================================================================
-- Create Enums
-- ============================================================================

DO $$
BEGIN
    CREATE TYPE "DataProviderType" AS ENUM (
        'MAPS_POI',
        'RERA',
        'CIRCLE_RATE',
        'INFRASTRUCTURE',
        'NEWS_NLP',
        'MARKET_DATA',
        'RENTAL_DATA',
        'GOVERNMENT',
        'INTERNAL'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    CREATE TYPE "AIJobStatus" AS ENUM (
        'PENDING',
        'RUNNING',
        'COMPLETED',
        'FAILED',
        'RETRYING'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- Create Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS "data_ingestion_jobs" (

    id UUID PRIMARY KEY,

    provider_type "DataProviderType" NOT NULL,

    provider_name TEXT NOT NULL,

    target_city TEXT,

    target_country CHAR(2),

    source_url TEXT,

    parameters JSONB,

    status "AIJobStatus" NOT NULL DEFAULT 'PENDING',

    records_ingested INTEGER NOT NULL DEFAULT 0,

    records_failed INTEGER NOT NULL DEFAULT 0,

    records_skipped INTEGER NOT NULL DEFAULT 0,

    processing_ms INTEGER,

    error_message TEXT,

    error_stack TEXT,

    scheduled_for TIMESTAMP(3),

    started_at TIMESTAMP(3),

    completed_at TIMESTAMP(3),

    next_run_at TIMESTAMP(3),

    cron_expression TEXT,

    retry_count INTEGER NOT NULL DEFAULT 0,

    max_retries INTEGER NOT NULL DEFAULT 3,

    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP(3) NOT NULL
);

-- ============================================================================
-- Indexes
-- ============================================================================

CREATE INDEX IF NOT EXISTS
idx_data_ingestion_jobs_status_schedule
ON data_ingestion_jobs(status, scheduled_for);

CREATE INDEX IF NOT EXISTS
idx_data_ingestion_jobs_provider_type
ON data_ingestion_jobs(provider_type);

CREATE INDEX IF NOT EXISTS
idx_data_ingestion_jobs_next_run
ON data_ingestion_jobs(next_run_at);

CREATE INDEX IF NOT EXISTS
idx_data_ingestion_jobs_created
ON data_ingestion_jobs(created_at);