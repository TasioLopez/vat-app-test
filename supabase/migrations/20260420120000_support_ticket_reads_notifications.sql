-- Per-user read cursor for support tickets (badges / unread counts)

CREATE TABLE public.support_ticket_reads (
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  last_read_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, ticket_id)
);

CREATE INDEX idx_support_ticket_reads_user ON public.support_ticket_reads(user_id);

ALTER TABLE public.support_ticket_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_ticket_reads FORCE ROW LEVEL SECURITY;

CREATE POLICY "support_ticket_reads_select_own"
  ON public.support_ticket_reads FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "support_ticket_reads_insert"
  ON public.support_ticket_reads FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.support_tickets t
      WHERE t.id = ticket_id
      AND (t.requester_id = auth.uid() OR public.is_admin())
    )
  );

CREATE POLICY "support_ticket_reads_update"
  ON public.support_ticket_reads FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.support_tickets t
      WHERE t.id = ticket_id
      AND (t.requester_id = auth.uid() OR public.is_admin())
    )
  );

-- Unread tickets for the current user as requester (non-staff replies)
CREATE OR REPLACE FUNCTION public.help_unread_ticket_count_requester()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT count(*)::integer
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

-- Admin inbox: open tickets never opened by this admin, or new customer messages after last read
CREATE OR REPLACE FUNCTION public.help_unread_ticket_count_admin()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT count(*)::integer
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

GRANT EXECUTE ON FUNCTION public.help_unread_ticket_count_requester() TO authenticated;
GRANT EXECUTE ON FUNCTION public.help_unread_ticket_count_admin() TO authenticated;
