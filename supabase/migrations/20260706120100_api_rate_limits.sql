-- API rate limiting table (service role only; no client access)

CREATE TABLE IF NOT EXISTS public.api_rate_limits (
  rate_key text PRIMARY KEY,
  window_start timestamptz NOT NULL DEFAULT now(),
  request_count integer NOT NULL DEFAULT 0
);

ALTER TABLE public.api_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_rate_limits FORCE ROW LEVEL SECURITY;

-- No policies: authenticated/anon cannot access; service role bypasses RLS.

CREATE OR REPLACE FUNCTION public.check_api_rate_limit(
  p_key text,
  p_window_seconds integer,
  p_max_requests integer
)
RETURNS TABLE(allowed boolean, retry_after_seconds integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_now timestamptz := now();
  v_row public.api_rate_limits%ROWTYPE;
  v_elapsed numeric;
BEGIN
  IF p_key IS NULL OR length(trim(p_key)) = 0 THEN
    allowed := true;
    retry_after_seconds := 0;
    RETURN NEXT;
    RETURN;
  END IF;

  SELECT * INTO v_row FROM public.api_rate_limits WHERE rate_key = p_key FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.api_rate_limits (rate_key, window_start, request_count)
    VALUES (p_key, v_now, 1);
    allowed := true;
    retry_after_seconds := 0;
    RETURN NEXT;
    RETURN;
  END IF;

  v_elapsed := EXTRACT(EPOCH FROM (v_now - v_row.window_start));

  IF v_elapsed >= p_window_seconds THEN
    UPDATE public.api_rate_limits
    SET window_start = v_now, request_count = 1
    WHERE rate_key = p_key;
    allowed := true;
    retry_after_seconds := 0;
    RETURN NEXT;
    RETURN;
  END IF;

  IF v_row.request_count >= p_max_requests THEN
    allowed := false;
    retry_after_seconds := GREATEST(1, ceil(p_window_seconds - v_elapsed)::integer);
    RETURN NEXT;
    RETURN;
  END IF;

  UPDATE public.api_rate_limits
  SET request_count = request_count + 1
  WHERE rate_key = p_key;

  allowed := true;
  retry_after_seconds := 0;
  RETURN NEXT;
END;
$$;

REVOKE ALL ON TABLE public.api_rate_limits FROM authenticated, anon;
REVOKE ALL ON FUNCTION public.check_api_rate_limit(text, integer, integer) FROM authenticated, anon;
GRANT EXECUTE ON FUNCTION public.check_api_rate_limit(text, integer, integer) TO service_role;
