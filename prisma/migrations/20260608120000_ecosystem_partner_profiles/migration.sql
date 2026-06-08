-- Ecosystem Partner Profile System

ALTER TABLE "EcosystemPartner" ADD COLUMN IF NOT EXISTS "slug" TEXT;
ALTER TABLE "EcosystemPartner" ADD COLUMN IF NOT EXISTS "tagline" TEXT;
ALTER TABLE "EcosystemPartner" ADD COLUMN IF NOT EXISTS "projectsCompleted" INTEGER;
ALTER TABLE "EcosystemPartner" ADD COLUMN IF NOT EXISTS "teamSize" INTEGER;
ALTER TABLE "EcosystemPartner" ADD COLUMN IF NOT EXISTS "partnerSince" INTEGER;
ALTER TABLE "EcosystemPartner" ADD COLUMN IF NOT EXISTS "whyChoose" JSONB;
ALTER TABLE "EcosystemPartner" ADD COLUMN IF NOT EXISTS "workProcess" JSONB;
ALTER TABLE "EcosystemPartner" ADD COLUMN IF NOT EXISTS "metaTitle" TEXT;
ALTER TABLE "EcosystemPartner" ADD COLUMN IF NOT EXISTS "metaDescription" TEXT;
ALTER TABLE "EcosystemPartner" ADD COLUMN IF NOT EXISTS "metaKeywords" TEXT;
ALTER TABLE "EcosystemPartner" ADD COLUMN IF NOT EXISTS "ogImage" TEXT;
ALTER TABLE "EcosystemPartner" ADD COLUMN IF NOT EXISTS "canonicalUrl" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "EcosystemPartner_categoryId_slug_key" ON "EcosystemPartner"("categoryId", "slug");
CREATE INDEX IF NOT EXISTS "EcosystemPartner_slug_idx" ON "EcosystemPartner"("slug");

ALTER TABLE "EcosystemLead" ADD COLUMN IF NOT EXISTS "city" TEXT;
ALTER TABLE "EcosystemLead" ADD COLUMN IF NOT EXISTS "propertyType" TEXT;
ALTER TABLE "EcosystemLead" ADD COLUMN IF NOT EXISTS "budgetRange" TEXT;
ALTER TABLE "EcosystemLead" ADD COLUMN IF NOT EXISTS "requirement" TEXT;
ALTER TABLE "EcosystemLead" ADD COLUMN IF NOT EXISTS "sourcePage" TEXT;
ALTER TABLE "EcosystemLead" ADD COLUMN IF NOT EXISTS "leadSource" TEXT DEFAULT 'Ecosystem Partner Lead';

CREATE TABLE IF NOT EXISTS "EcosystemPartnerService" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "EcosystemPartnerService_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "EcosystemPartnerLocation" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "region" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "EcosystemPartnerLocation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "EcosystemPartnerGallery" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "caption" TEXT,
    "category" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "EcosystemPartnerGallery_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "EcosystemPartnerPortfolio" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "projectName" TEXT NOT NULL,
    "location" TEXT,
    "projectSize" TEXT,
    "completionDate" TEXT,
    "style" TEXT,
    "budgetRange" TEXT,
    "projectType" TEXT,
    "description" TEXT,
    "coverImage" TEXT,
    "images" JSONB,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "EcosystemPartnerPortfolio_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "EcosystemPartnerReview" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "reviewerName" TEXT NOT NULL,
    "location" TEXT,
    "projectType" TEXT,
    "review" TEXT NOT NULL,
    "rating" DOUBLE PRECISION,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "isApproved" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "EcosystemPartnerReview_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "EcosystemPartnerFaq" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "EcosystemPartnerFaq_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "EcosystemPartnerService_partnerId_idx" ON "EcosystemPartnerService"("partnerId");
CREATE INDEX IF NOT EXISTS "EcosystemPartnerLocation_partnerId_idx" ON "EcosystemPartnerLocation"("partnerId");
CREATE INDEX IF NOT EXISTS "EcosystemPartnerLocation_city_idx" ON "EcosystemPartnerLocation"("city");
CREATE INDEX IF NOT EXISTS "EcosystemPartnerGallery_partnerId_idx" ON "EcosystemPartnerGallery"("partnerId");
CREATE INDEX IF NOT EXISTS "EcosystemPartnerPortfolio_partnerId_idx" ON "EcosystemPartnerPortfolio"("partnerId");
CREATE INDEX IF NOT EXISTS "EcosystemPartnerPortfolio_projectType_idx" ON "EcosystemPartnerPortfolio"("projectType");
CREATE INDEX IF NOT EXISTS "EcosystemPartnerReview_partnerId_idx" ON "EcosystemPartnerReview"("partnerId");
CREATE INDEX IF NOT EXISTS "EcosystemPartnerReview_isApproved_idx" ON "EcosystemPartnerReview"("isApproved");
CREATE INDEX IF NOT EXISTS "EcosystemPartnerFaq_partnerId_idx" ON "EcosystemPartnerFaq"("partnerId");

ALTER TABLE "EcosystemPartnerService" DROP CONSTRAINT IF EXISTS "EcosystemPartnerService_partnerId_fkey";
ALTER TABLE "EcosystemPartnerService" ADD CONSTRAINT "EcosystemPartnerService_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "EcosystemPartner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "EcosystemPartnerLocation" DROP CONSTRAINT IF EXISTS "EcosystemPartnerLocation_partnerId_fkey";
ALTER TABLE "EcosystemPartnerLocation" ADD CONSTRAINT "EcosystemPartnerLocation_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "EcosystemPartner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "EcosystemPartnerGallery" DROP CONSTRAINT IF EXISTS "EcosystemPartnerGallery_partnerId_fkey";
ALTER TABLE "EcosystemPartnerGallery" ADD CONSTRAINT "EcosystemPartnerGallery_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "EcosystemPartner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "EcosystemPartnerPortfolio" DROP CONSTRAINT IF EXISTS "EcosystemPartnerPortfolio_partnerId_fkey";
ALTER TABLE "EcosystemPartnerPortfolio" ADD CONSTRAINT "EcosystemPartnerPortfolio_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "EcosystemPartner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "EcosystemPartnerReview" DROP CONSTRAINT IF EXISTS "EcosystemPartnerReview_partnerId_fkey";
ALTER TABLE "EcosystemPartnerReview" ADD CONSTRAINT "EcosystemPartnerReview_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "EcosystemPartner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "EcosystemPartnerFaq" DROP CONSTRAINT IF EXISTS "EcosystemPartnerFaq_partnerId_fkey";
ALTER TABLE "EcosystemPartnerFaq" ADD CONSTRAINT "EcosystemPartnerFaq_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "EcosystemPartner"("id") ON DELETE CASCADE ON UPDATE CASCADE;
