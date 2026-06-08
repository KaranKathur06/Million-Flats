-- Manual property status transition guard
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

  -- Allowed transitions:
  -- DRAFT -> PENDING_REVIEW
  -- DRAFT -> ARCHIVED
  -- PENDING_REVIEW -> APPROVED | REJECTED
  -- APPROVED -> ARCHIVED
  -- REJECTED -> ARCHIVED
  -- ARCHIVED -> PENDING_REVIEW
  IF (
    (old_status = 'DRAFT' AND (new_status = 'PENDING_REVIEW' OR new_status = 'ARCHIVED')) OR
    (old_status = 'PENDING_REVIEW' AND (new_status = 'APPROVED' OR new_status = 'REJECTED')) OR
    (old_status = 'APPROVED' AND (new_status = 'ARCHIVED')) OR
    (old_status = 'REJECTED' AND (new_status = 'ARCHIVED')) OR
    (old_status = 'ARCHIVED' AND (new_status = 'PENDING_REVIEW'))
  ) THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Invalid manual property status transition: % -> %', old_status, new_status
    USING ERRCODE = 'check_violation';
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_manual_property_status_transition ON public.manual_properties;
CREATE TRIGGER trg_guard_manual_property_status_transition
BEFORE UPDATE OF status ON public.manual_properties
FOR EACH ROW
EXECUTE FUNCTION public.guard_manual_property_status_transition();


-- Agent profile_status transition guard
CREATE OR REPLACE FUNCTION public.guard_agent_profile_status_transition()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  old_status text;
  new_status text;
BEGIN
  old_status := COALESCE(OLD.profile_status::text, '');
  new_status := COALESCE(NEW.profile_status::text, '');

  IF old_status = new_status THEN
    RETURN NEW;
  END IF;

  -- Allowed transitions:
  -- DRAFT -> SUBMITTED
  -- SUBMITTED -> VERIFIED | SUSPENDED
  -- VERIFIED -> LIVE | SUSPENDED
  -- LIVE -> SUSPENDED
  -- SUSPENDED -> LIVE
  IF (
    (old_status = 'DRAFT' AND new_status = 'SUBMITTED') OR
    (old_status = 'SUBMITTED' AND (new_status = 'VERIFIED' OR new_status = 'SUSPENDED')) OR
    (old_status = 'VERIFIED' AND (new_status = 'LIVE' OR new_status = 'SUSPENDED')) OR
    (old_status = 'LIVE' AND new_status = 'SUSPENDED') OR
    (old_status = 'SUSPENDED' AND new_status = 'LIVE')
  ) THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Invalid agent profile status transition: % -> %', old_status, new_status
    USING ERRCODE = 'check_violation';
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_agent_profile_status_transition ON public.agents;
CREATE TRIGGER trg_guard_agent_profile_status_transition
BEFORE UPDATE OF profile_status ON public.agents
FOR EACH ROW
EXECUTE FUNCTION public.guard_agent_profile_status_transition();
