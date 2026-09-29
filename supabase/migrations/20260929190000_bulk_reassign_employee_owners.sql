-- =============================================================================
-- Bulk reassign employee owners before deleting a user (admin-only).
-- Used by POST /api/delete-user so every owned dossier gets a new owner_id
-- and matching employee_users row (same side effect as set_employee_owner).
-- =============================================================================

CREATE OR REPLACE FUNCTION public.bulk_reassign_employee_owners(
  p_from_user_id uuid,
  p_assignments jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_owned_count int;
  v_assign_count int;
  v_row jsonb;
  v_employee_id uuid;
  v_owner_id uuid;
  v_seen uuid[] := ARRAY[]::uuid[];
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'not authorized to bulk reassign employee owners';
  END IF;

  IF p_from_user_id IS NULL THEN
    RAISE EXCEPTION 'from user id required';
  END IF;

  IF p_assignments IS NULL OR jsonb_typeof(p_assignments) <> 'array' THEN
    RAISE EXCEPTION 'assignments must be a json array';
  END IF;

  SELECT count(*)::int INTO v_owned_count
  FROM public.employees
  WHERE owner_id = p_from_user_id;

  v_assign_count := jsonb_array_length(p_assignments);

  IF v_assign_count <> v_owned_count THEN
    RAISE EXCEPTION
      'assignment count (%) must equal owned employees (%)',
      v_assign_count,
      v_owned_count;
  END IF;

  FOR v_row IN SELECT value FROM jsonb_array_elements(p_assignments)
  LOOP
    BEGIN
      v_employee_id := (v_row->>'employee_id')::uuid;
    EXCEPTION WHEN others THEN
      RAISE EXCEPTION 'invalid employee_id in assignments';
    END;

    BEGIN
      v_owner_id := (v_row->>'owner_id')::uuid;
    EXCEPTION WHEN others THEN
      RAISE EXCEPTION 'invalid owner_id in assignments';
    END;

    IF v_employee_id IS NULL OR v_owner_id IS NULL THEN
      RAISE EXCEPTION 'employee_id and owner_id required';
    END IF;

    IF v_owner_id = p_from_user_id THEN
      RAISE EXCEPTION 'new owner cannot be the user being removed';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.users u WHERE u.id = v_owner_id) THEN
      RAISE EXCEPTION 'owner user not found';
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM public.employees e
      WHERE e.id = v_employee_id
        AND e.owner_id = p_from_user_id
    ) THEN
      RAISE EXCEPTION 'employee not owned by from user';
    END IF;

    IF v_employee_id = ANY (v_seen) THEN
      RAISE EXCEPTION 'duplicate employee assignment';
    END IF;

    v_seen := array_append(v_seen, v_employee_id);
  END LOOP;

  FOR v_row IN SELECT value FROM jsonb_array_elements(p_assignments)
  LOOP
    v_employee_id := (v_row->>'employee_id')::uuid;
    v_owner_id := (v_row->>'owner_id')::uuid;

    UPDATE public.employees
    SET owner_id = v_owner_id
    WHERE id = v_employee_id;

    INSERT INTO public.employee_users (user_id, employee_id, assigned_at)
    SELECT v_owner_id, v_employee_id, now()
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.employee_users eu
      WHERE eu.user_id = v_owner_id
        AND eu.employee_id = v_employee_id
    );
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.bulk_reassign_employee_owners(uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.bulk_reassign_employee_owners(uuid, jsonb) TO authenticated;
