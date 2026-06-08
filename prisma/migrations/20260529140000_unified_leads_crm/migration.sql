-- CreateEnum
CREATE TYPE "LeadType" AS ENUM ('PROJECT_INQUIRY', 'CONTACT_FORM', 'ECOSYSTEM_REGISTRATION');

-- CreateEnum
CREATE TYPE "LeadCountry" AS ENUM ('INDIA', 'UAE');

-- CreateTable
CREATE TABLE "leads" (
    "id" TEXT NOT NULL,
    "lead_type" "LeadType" NOT NULL,
    "category" TEXT,
    "source_id" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "whatsapp" TEXT,
    "message" TEXT,
    "project_or_company" TEXT,
    "country" "LeadCountry" NOT NULL DEFAULT 'INDIA',
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "assigned_to" TEXT,
    "utm_source" TEXT,
    "utm_medium" TEXT,
    "utm_campaign" TEXT,
    "utm_term" TEXT,
    "utm_content" TEXT,
    "referrer" TEXT,
    "landing_url" TEXT,
    "metadata" JSONB,
    "project_id" TEXT,
    "ecosystem_partner_id" TEXT,
    "legacy_table" TEXT,
    "legacy_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "leads_legacy_table_legacy_id_key" ON "leads"("legacy_table", "legacy_id");

-- CreateIndex
CREATE INDEX "leads_lead_type_idx" ON "leads"("lead_type");

-- CreateIndex
CREATE INDEX "leads_status_idx" ON "leads"("status");

-- CreateIndex
CREATE INDEX "leads_country_idx" ON "leads"("country");

-- CreateIndex
CREATE INDEX "leads_category_idx" ON "leads"("category");

-- CreateIndex
CREATE INDEX "leads_project_id_idx" ON "leads"("project_id");

-- CreateIndex
CREATE INDEX "leads_assigned_to_idx" ON "leads"("assigned_to");

-- CreateIndex
CREATE INDEX "leads_created_at_idx" ON "leads"("created_at");

-- CreateIndex
CREATE INDEX "leads_lead_type_status_idx" ON "leads"("lead_type", "status");

-- CreateIndex
CREATE INDEX "leads_lead_type_created_at_idx" ON "leads"("lead_type", "created_at");

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_ecosystem_partner_id_fkey" FOREIGN KEY ("ecosystem_partner_id") REFERENCES "EcosystemPartner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill contact submissions
INSERT INTO "leads" (
    "id", "lead_type", "category", "source_id", "name", "email", "phone", "message",
    "project_or_company", "country", "status", "legacy_table", "legacy_id", "created_at", "updated_at"
)
SELECT
    'c_' || cs."id",
    'CONTACT_FORM'::"LeadType",
    CASE
        WHEN cs."message" LIKE '[general]%' THEN 'General Inquiry'
        WHEN cs."message" LIKE '[property]%' THEN 'Property Inquiry'
        WHEN cs."message" LIKE '[agent_inquiry]%' THEN 'Agent Inquiry'
        ELSE 'General Inquiry'
    END,
    cs."id",
    cs."name",
    cs."email",
    cs."phone",
    cs."message",
    NULL,
    'INDIA'::"LeadCountry",
    'NEW',
    'contact_submissions',
    cs."id",
    cs."createdAt",
    cs."createdAt"
FROM "ContactSubmission" cs
ON CONFLICT ("legacy_table", "legacy_id") DO NOTHING;

-- Backfill project leads
INSERT INTO "leads" (
    "id", "lead_type", "category", "source_id", "name", "email", "phone", "message",
    "project_or_company", "country", "status", "project_id", "legacy_table", "legacy_id", "created_at", "updated_at"
)
SELECT
    'p_' || pl."id",
    'PROJECT_INQUIRY'::"LeadType",
    p."name",
    pl."id",
    pl."name",
    pl."email",
    pl."phone",
    pl."message",
    p."name",
    'UAE'::"LeadCountry",
    'NEW',
    pl."project_id",
    'project_leads',
    pl."id",
    pl."created_at",
    pl."created_at"
FROM "project_leads" pl
JOIN "projects" p ON p."id" = pl."project_id"
ON CONFLICT ("legacy_table", "legacy_id") DO NOTHING;

-- Backfill ecosystem partner applications
INSERT INTO "leads" (
    "id", "lead_type", "category", "source_id", "name", "email", "phone", "message",
    "project_or_company", "country", "status", "metadata", "legacy_table", "legacy_id",
    "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "referrer", "landing_url",
    "created_at", "updated_at"
)
SELECT
    'e_' || epa."id",
    'ECOSYSTEM_REGISTRATION'::"LeadType",
    epa."category",
    epa."id",
    COALESCE(epa."contactInfo"->>'partnerManagerName', epa."contactInfo"->>'contactName', epa."contactInfo"->>'principalName', epa."contactInfo"->>'bdName', 'Partner Applicant'),
    COALESCE(epa."contactInfo"->>'email', ''),
    COALESCE(epa."contactInfo"->>'phone', NULL),
    NULL,
    COALESCE(epa."companyDetails"->>'legalCompanyName', epa."companyDetails"->>'fullLegalName', epa."companyDetails"->>'businessName', epa."companyDetails"->>'legalBusinessName', epa."category"),
    'INDIA'::"LeadCountry",
    CASE epa."stage"::text
        WHEN 'APPLIED' THEN 'APPLIED'
        WHEN 'UNDER_REVIEW' THEN 'UNDER_REVIEW'
        WHEN 'APPROVED' THEN 'APPROVED'
        WHEN 'ONBOARDED' THEN 'ONBOARDED'
        ELSE 'APPLIED'
    END,
    jsonb_build_object(
        'applicationId', epa."id",
        'companyDetails', epa."companyDetails",
        'contactInfo', epa."contactInfo",
        'offerDetails', epa."offerDetails",
        'businessIntent', epa."businessIntent",
        'logoUrl', epa."logoUrl",
        'certificateUrl', epa."certificateUrl"
    ),
    'ecosystem_partner_applications',
    epa."id",
    epa."utmSource",
    epa."utmMedium",
    epa."utmCampaign",
    epa."utmTerm",
    epa."utmContent",
    epa."referrer",
    epa."landingUrl",
    epa."createdAt",
    epa."updatedAt"
FROM "EcosystemPartnerApplication" epa
ON CONFLICT ("legacy_table", "legacy_id") DO NOTHING;
