-- Rename the public manual-property lifecycle state from APPROVED to PUBLISHED.
-- PostgreSQL keeps existing row values consistent when an enum value is renamed.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'ManualPropertyStatus'
      AND e.enumlabel = 'APPROVED'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'ManualPropertyStatus'
      AND e.enumlabel = 'PUBLISHED'
  ) THEN
    ALTER TYPE "ManualPropertyStatus" RENAME VALUE 'APPROVED' TO 'PUBLISHED';
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.guard_manual_property_status_transition()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  old_status text;
  new_status text;
BEGIN
  old_status := COALESCE(OLD.status::text, '');
  new_status := COALESCE(NEW.status::text, '');

  IF old_status = new_status THEN
    RETURN NEW;
  END IF;

  IF (
    (old_status = 'DRAFT' AND (new_status = 'PENDING_REVIEW' OR new_status = 'PUBLISHED' OR new_status = 'ARCHIVED')) OR
    (old_status = 'PENDING_REVIEW' AND (new_status = 'PUBLISHED' OR new_status = 'REJECTED')) OR
    (old_status = 'PUBLISHED' AND (new_status = 'DRAFT' OR new_status = 'SOLD' OR new_status = 'ARCHIVED')) OR
    (old_status = 'SOLD' AND (new_status = 'PUBLISHED' OR new_status = 'ARCHIVED')) OR
    (old_status = 'REJECTED' AND (new_status = 'DRAFT' OR new_status = 'ARCHIVED')) OR
    (old_status = 'ARCHIVED' AND (new_status = 'DRAFT' OR new_status = 'PENDING_REVIEW' OR new_status = 'PUBLISHED'))
  ) THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Invalid manual property status transition: % -> %', old_status, new_status
    USING ERRCODE = 'check_violation';
END;
$$;
