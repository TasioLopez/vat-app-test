-- Ticket IDs that count as "unread" for notification UI (same predicates as count RPCs)

CREATE OR REPLACE FUNCTION public.help_unread_ticket_ids_requester()
RETURNS TABLE (ticket_id uuid)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT t.id AS ticket_id
  FROM public.support_tickets t
  WHERE t.requester_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.support_ticket_messages m
    WHERE m.ticket_id = t.id
    AND m.is_internal = false
    AND m.author_id IS DISTINCT FROM auth.uid()
    AND m.created_at > coalesce(
      (
        SELECT r.last_read_at
        FROM public.support_ticket_reads r
        WHERE r.user_id = auth.uid() AND r.ticket_id = t.id
      ),
      '-infinity'::timestamptz
    )
  );
$$;

CREATE OR REPLACE FUNCTION public.help_unread_ticket_ids_admin()
RETURNS TABLE (ticket_id uuid)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT t.id AS ticket_id
  FROM public.support_tickets t
  WHERE public.is_admin()
  AND t.status NOT IN ('closed', 'resolved')
  AND (
    NOT EXISTS (
      SELECT 1 FROM public.support_ticket_reads r
      WHERE r.user_id = auth.uid() AND r.ticket_id = t.id
    )
    OR EXISTS (
      SELECT 1 FROM public.support_ticket_messages m
      WHERE m.ticket_id = t.id
      AND m.is_internal = false
      AND m.author_id = t.requester_id
      AND m.created_at > (
        SELECT r.last_read_at
        FROM public.support_ticket_reads r
        WHERE r.user_id = auth.uid() AND r.ticket_id = t.id
      )
    )
  );
$$;

GRANT EXECUTE ON FUNCTION public.help_unread_ticket_ids_requester() TO authenticated;
GRANT EXECUTE ON FUNCTION public.help_unread_ticket_ids_admin() TO authenticated;
