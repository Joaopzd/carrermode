CREATE OR REPLACE FUNCTION public.owns_league(_league_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.saves s
    WHERE s.league_id = _league_id AND s.user_id = auth.uid()
  );
$$;

DROP POLICY IF EXISTS league_rules_update ON public.league_rules;
DROP POLICY IF EXISTS league_rules_write ON public.league_rules;

CREATE POLICY league_rules_insert_own_league ON public.league_rules
  FOR INSERT TO authenticated
  WITH CHECK (public.owns_league(league_id));

CREATE POLICY league_rules_update_own_league ON public.league_rules
  FOR UPDATE TO authenticated
  USING (public.owns_league(league_id))
  WITH CHECK (public.owns_league(league_id));

CREATE POLICY league_rules_delete_own_league ON public.league_rules
  FOR DELETE TO authenticated
  USING (public.owns_league(league_id));