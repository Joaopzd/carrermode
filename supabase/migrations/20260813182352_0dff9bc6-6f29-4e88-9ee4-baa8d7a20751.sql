ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS mvp_player_id uuid REFERENCES public.players(id) ON DELETE SET NULL;
ALTER TABLE public.match_player_stats ADD COLUMN IF NOT EXISTS titular boolean NOT NULL DEFAULT true;
CREATE INDEX IF NOT EXISTS idx_matches_mvp_player_id ON public.matches(mvp_player_id);