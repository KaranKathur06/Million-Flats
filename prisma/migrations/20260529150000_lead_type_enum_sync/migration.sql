-- Migrate LeadType to CONTACT | PROJECT | ECOSYSTEM and add source_name

CREATE TYPE "LeadType_new" AS ENUM ('CONTACT', 'PROJECT', 'ECOSYSTEM');

ALTER TABLE "leads"
  ALTER COLUMN "lead_type" TYPE "LeadType_new"
  USING (
    CASE "lead_type"::text
      WHEN 'CONTACT_FORM' THEN 'CONTACT'::"LeadType_new"
      WHEN 'PROJECT_INQUIRY' THEN 'PROJECT'::"LeadType_new"
      WHEN 'ECOSYSTEM_REGISTRATION' THEN 'ECOSYSTEM'::"LeadType_new"
      WHEN 'CONTACT' THEN 'CONTACT'::"LeadType_new"
      WHEN 'PROJECT' THEN 'PROJECT'::"LeadType_new"
      WHEN 'ECOSYSTEM' THEN 'ECOSYSTEM'::"LeadType_new"
      ELSE 'CONTACT'::"LeadType_new"
    END
  );

DROP TYPE "LeadType";
ALTER TYPE "LeadType_new" RENAME TO "LeadType";

ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "source_name" TEXT;

-- Normalize ecosystem categories to enum codes
UPDATE "leads" SET "category" = 'HOME_LOANS'
WHERE "lead_type" = 'ECOSYSTEM' AND (
  "category" IN ('home-loans-finance', 'Home Loans & Finance', 'HOME_LOANS')
  OR "category" ILIKE '%home loan%'
);

UPDATE "leads" SET "category" = 'LEGAL'
WHERE "lead_type" = 'ECOSYSTEM' AND (
  "category" IN ('legal-documentation', 'Legal & Documentation', 'LEGAL')
  OR "category" ILIKE '%legal%'
);

UPDATE "leads" SET "category" = 'INSURANCE'
WHERE "lead_type" = 'ECOSYSTEM' AND (
  "category" IN ('property-insurance', 'Property Insurance', 'INSURANCE')
  OR "category" ILIKE '%insurance%'
);

UPDATE "leads" SET "category" = 'INTERIOR'
WHERE "lead_type" = 'ECOSYSTEM' AND (
  "category" IN ('interior-design-renovation', 'Interior Design & Renovation', 'INTERIOR')
  OR "category" ILIKE '%interior%'
);

UPDATE "leads" SET "category" = 'PACKERS'
WHERE "lead_type" = 'ECOSYSTEM' AND (
  "category" IN ('packers-movers', 'Packers & Movers', 'PACKERS')
  OR "category" ILIKE '%packer%'
);

UPDATE "leads" SET "category" = 'PROPERTY_MANAGEMENT'
WHERE "lead_type" = 'ECOSYSTEM' AND (
  "category" IN ('property-management', 'Property Management', 'PROPERTY_MANAGEMENT')
  OR "category" ILIKE '%property management%'
);

UPDATE "leads" SET "category" = 'VASTU'
WHERE "lead_type" = 'ECOSYSTEM' AND (
  "category" IN ('vastu-feng-shui', 'Vastu / Feng Shui', 'VASTU')
  OR "category" ILIKE '%vastu%'
);

UPDATE "leads" SET "category" = 'TILES'
WHERE "lead_type" = 'ECOSYSTEM' AND (
  "category" IN ('tiles-surface-finishing', 'Tiles & Surface Finishing', 'TILES')
  OR "category" ILIKE '%tile%'
);

UPDATE "leads" SET "category" = 'HARDWARE'
WHERE "lead_type" = 'ECOSYSTEM' AND (
  "category" IN ('hardware-architectural-fittings', 'Hardware & Architectural Fittings', 'HARDWARE')
  OR "category" ILIKE '%hardware%'
);

UPDATE "leads" SET "category" = 'CEMENT'
WHERE "lead_type" = 'ECOSYSTEM' AND (
  "category" IN ('cement-structural', 'Cement & Structural', 'CEMENT')
  OR "category" ILIKE '%cement%'
);

UPDATE "leads" SET "category" = 'SMART_HOME'
WHERE "lead_type" = 'ECOSYSTEM' AND (
  "category" IN ('smart-home-automation', 'Smart Home & Automation', 'SMART_HOME')
  OR "category" ILIKE '%smart home%'
);

UPDATE "leads" SET "category" = 'TECHNOLOGY'
WHERE "lead_type" = 'ECOSYSTEM' AND (
  "category" IN ('technology-partners', 'Technology Partners', 'TECHNOLOGY')
  OR "category" ILIKE '%technology%'
);

-- Backfill source_name from project_or_company where missing
UPDATE "leads" SET "source_name" = "project_or_company"
WHERE "source_name" IS NULL AND "project_or_company" IS NOT NULL;
