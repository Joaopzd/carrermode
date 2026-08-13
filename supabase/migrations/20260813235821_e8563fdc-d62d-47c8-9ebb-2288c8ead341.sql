CREATE OR REPLACE FUNCTION public.owns_league(_league_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.saves s
    WHERE s.league_id = _league_id AND s.user_id = auth.uid()
  );
$$;