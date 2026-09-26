DO $$
DECLARE
  orphan_property_count BIGINT;
  orphan_agent_count BIGINT;
BEGIN
  SELECT COUNT(*)
  INTO orphan_property_count
  FROM "leads" AS lead
  LEFT JOIN "manual_properties" AS property ON property."id" = lead."property_id"
  WHERE lead."property_id" IS NOT NULL
    AND property."id" IS NULL;

  SELECT COUNT(*)
  INTO orphan_agent_count
  FROM "leads" AS lead
  LEFT JOIN "agents" AS agent ON agent."id" = lead."agent_id"
  WHERE lead."agent_id" IS NOT NULL
    AND agent."id" IS NULL;

  IF orphan_property_count > 0 OR orphan_agent_count > 0 THEN
    RAISE EXCEPTION 'Cannot add Lead foreign keys: % orphan property_id values and % orphan agent_id values exist in leads.', orphan_property_count, orphan_agent_count;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint AS constraint_row
    WHERE constraint_row.conrelid = '"leads"'::regclass
      AND constraint_row.confrelid = '"manual_properties"'::regclass
      AND constraint_row.contype = 'f'
      AND constraint_row.conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = '"leads"'::regclass AND attname = 'property_id')]::SMALLINT[]
      AND constraint_row.confkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = '"manual_properties"'::regclass AND attname = 'id')]::SMALLINT[]
  ) THEN
    ALTER TABLE "leads"
      ADD CONSTRAINT "leads_property_id_fkey"
      FOREIGN KEY ("property_id") REFERENCES "manual_properties"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint AS constraint_row
    WHERE constraint_row.conrelid = '"leads"'::regclass
      AND constraint_row.confrelid = '"agents"'::regclass
      AND constraint_row.contype = 'f'
      AND constraint_row.conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = '"leads"'::regclass AND attname = 'agent_id')]::SMALLINT[]
      AND constraint_row.confkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = '"agents"'::regclass AND attname = 'id')]::SMALLINT[]
  ) THEN
    ALTER TABLE "leads"
      ADD CONSTRAINT "leads_agent_id_fkey"
      FOREIGN KEY ("agent_id") REFERENCES "agents"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;