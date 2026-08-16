DROP POLICY IF EXISTS league_rules_read ON public.league_rules;
CREATE POLICY league_rules_read ON public.league_rules FOR SELECT TO authenticated USING (public.owns_league(league_id));