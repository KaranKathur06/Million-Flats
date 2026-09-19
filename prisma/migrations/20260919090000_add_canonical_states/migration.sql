CREATE TABLE IF NOT EXISTS "states" (
  "id" TEXT NOT NULL,
  "country" "CountryCode" NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "states_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "states_country_code_key" ON "states" ("country", "code");
CREATE UNIQUE INDEX IF NOT EXISTS "states_country_name_key" ON "states" ("country", "name");
CREATE INDEX IF NOT EXISTS "states_country_idx" ON "states" ("country");

ALTER TABLE "cities" ADD COLUMN IF NOT EXISTS "state_id" TEXT;
CREATE INDEX IF NOT EXISTS "cities_state_id_idx" ON "cities" ("state_id");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cities_state_id_fkey') THEN
    ALTER TABLE "cities" ADD CONSTRAINT "cities_state_id_fkey"
      FOREIGN KEY ("state_id") REFERENCES "states"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

INSERT INTO "states" ("id", "country", "code", "name", "updated_at") VALUES
  ('state-in-andhra-pradesh', 'INDIA', 'IN-AP', 'Andhra Pradesh', CURRENT_TIMESTAMP),
  ('state-in-delhi', 'INDIA', 'IN-DL', 'Delhi', CURRENT_TIMESTAMP),
  ('state-in-gujarat', 'INDIA', 'IN-GJ', 'Gujarat', CURRENT_TIMESTAMP),
  ('state-in-karnataka', 'INDIA', 'IN-KA', 'Karnataka', CURRENT_TIMESTAMP),
  ('state-in-kerala', 'INDIA', 'IN-KL', 'Kerala', CURRENT_TIMESTAMP),
  ('state-in-madhya-pradesh', 'INDIA', 'IN-MP', 'Madhya Pradesh', CURRENT_TIMESTAMP),
  ('state-in-maharashtra', 'INDIA', 'IN-MH', 'Maharashtra', CURRENT_TIMESTAMP),
  ('state-in-punjab', 'INDIA', 'IN-PB', 'Punjab', CURRENT_TIMESTAMP),
  ('state-in-rajasthan', 'INDIA', 'IN-RJ', 'Rajasthan', CURRENT_TIMESTAMP),
  ('state-in-tamil-nadu', 'INDIA', 'IN-TN', 'Tamil Nadu', CURRENT_TIMESTAMP),
  ('state-in-telangana', 'INDIA', 'IN-TG', 'Telangana', CURRENT_TIMESTAMP),
  ('state-in-uttar-pradesh', 'INDIA', 'IN-UP', 'Uttar Pradesh', CURRENT_TIMESTAMP),
  ('state-in-west-bengal', 'INDIA', 'IN-WB', 'West Bengal', CURRENT_TIMESTAMP),
  ('state-ae-abu-dhabi', 'UAE', 'AE-AZ', 'Abu Dhabi', CURRENT_TIMESTAMP),
  ('state-ae-ajman', 'UAE', 'AE-AJ', 'Ajman', CURRENT_TIMESTAMP),
  ('state-ae-dubai', 'UAE', 'AE-DU', 'Dubai', CURRENT_TIMESTAMP),
  ('state-ae-fujairah', 'UAE', 'AE-FU', 'Fujairah', CURRENT_TIMESTAMP),
  ('state-ae-ras-al-khaimah', 'UAE', 'AE-RK', 'Ras Al Khaimah', CURRENT_TIMESTAMP),
  ('state-ae-sharjah', 'UAE', 'AE-SH', 'Sharjah', CURRENT_TIMESTAMP),
  ('state-ae-umm-al-quwain', 'UAE', 'AE-UQ', 'Umm Al Quwain', CURRENT_TIMESTAMP)
ON CONFLICT ("country", "code") DO UPDATE SET "name" = EXCLUDED."name", "updated_at" = CURRENT_TIMESTAMP;

UPDATE "cities" SET "state_id" = 'state-in-gujarat' WHERE "country" = 'INDIA' AND lower("name") IN ('ahmedabad', 'rajkot', 'surat', 'vadodara');
UPDATE "cities" SET "state_id" = 'state-in-maharashtra' WHERE "country" = 'INDIA' AND lower("name") IN ('mumbai', 'navi mumbai', 'navi-mumbai', 'pune', 'nagpur', 'nashik', 'thane', 'aurangabad', 'alibag', 'alibaug');
UPDATE "cities" SET "state_id" = 'state-in-karnataka' WHERE "country" = 'INDIA' AND lower("name") IN ('bengaluru', 'bangalore');
UPDATE "cities" SET "state_id" = 'state-in-telangana' WHERE "country" = 'INDIA' AND lower("name") IN ('hyderabad');
UPDATE "cities" SET "state_id" = 'state-in-tamil-nadu' WHERE "country" = 'INDIA' AND lower("name") IN ('chennai', 'coimbatore', 'madurai');
UPDATE "cities" SET "state_id" = 'state-in-west-bengal' WHERE "country" = 'INDIA' AND lower("name") IN ('kolkata', 'howrah');
UPDATE "cities" SET "state_id" = 'state-in-uttar-pradesh' WHERE "country" = 'INDIA' AND lower("name") IN ('lucknow', 'noida', 'greater noida', 'agra', 'kanpur', 'ghaziabad', 'meerut', 'varanasi', 'prayagraj');
UPDATE "cities" SET "state_id" = 'state-in-delhi' WHERE "country" = 'INDIA' AND lower("name") = 'delhi';
UPDATE "cities" SET "state_id" = 'state-in-rajasthan' WHERE "country" = 'INDIA' AND lower("name") IN ('jaipur', 'jodhpur', 'kota');
UPDATE "cities" SET "state_id" = 'state-in-madhya-pradesh' WHERE "country" = 'INDIA' AND lower("name") IN ('indore', 'bhopal', 'gwalior', 'jabalpur');
UPDATE "cities" SET "state_id" = 'state-in-punjab' WHERE "country" = 'INDIA' AND lower("name") IN ('amritsar', 'ludhiana');
UPDATE "cities" SET "state_id" = 'state-in-kerala' WHERE "country" = 'INDIA' AND lower("name") IN ('kochi', 'trivandrum');
UPDATE "cities" SET "state_id" = 'state-ae-dubai' WHERE "country" = 'UAE' AND lower("name") = 'dubai';
UPDATE "cities" SET "state_id" = 'state-ae-abu-dhabi' WHERE "country" = 'UAE' AND lower("name") IN ('abu dhabi', 'al ain');
UPDATE "cities" SET "state_id" = 'state-ae-sharjah' WHERE "country" = 'UAE' AND lower("name") = 'sharjah';
UPDATE "cities" SET "state_id" = 'state-ae-ajman' WHERE "country" = 'UAE' AND lower("name") = 'ajman';
UPDATE "cities" SET "state_id" = 'state-ae-ras-al-khaimah' WHERE "country" = 'UAE' AND lower("name") = 'ras al khaimah';
UPDATE "cities" SET "state_id" = 'state-ae-fujairah' WHERE "country" = 'UAE' AND lower("name") = 'fujairah';
UPDATE "cities" SET "state_id" = 'state-ae-umm-al-quwain' WHERE "country" = 'UAE' AND lower("name") = 'umm al quwain';
