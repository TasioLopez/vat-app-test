-- Atomic reorder/reparent for kb_categories (sequential updates in one transaction function)
CREATE OR REPLACE FUNCTION public.apply_kb_category_reorder(p_items jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  el jsonb;
BEGIN
  FOR el IN SELECT jsonb_array_elements(p_items)
  LOOP
    UPDATE public.kb_categories
    SET
      parent_id = CASE
        WHEN el->>'parentId' IS NULL OR (el->>'parentId') = '' THEN NULL
        ELSE (el->>'parentId')::uuid
      END,
      sort_order = (el->>'sortOrder')::int
    WHERE id = (el->>'id')::uuid;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.apply_kb_category_reorder(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.apply_kb_category_reorder(jsonb) TO service_role;
