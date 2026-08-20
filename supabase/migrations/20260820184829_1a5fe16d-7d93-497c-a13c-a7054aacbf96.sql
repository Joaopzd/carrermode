CREATE TYPE public.league_leader_kind AS ENUM ('artilheiro', 'assistente', 'clean_sheet');

CREATE TABLE public.league_leaders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  save_id uuid NOT NULL REFERENCES public.saves(id) ON DELETE CASCADE,
  season_id uuid REFERENCES public.seasons(id) ON DELETE CASCADE,
  categoria public.league_leader_kind NOT NULL,
  posicao integer NOT NULL CHECK (posicao BETWEEN 1 AND 5),
  jogador text NOT NULL,
  clube text,
  valor numeric,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE (save_id, season_id, categoria, posicao)
);

CREATE INDEX idx_league_leaders_save ON public.league_leaders(save_id);
CREATE INDEX idx_league_leaders_season ON public.league_leaders(season_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.league_leaders TO authenticated;
GRANT ALL ON public.league_leaders TO service_role;

ALTER TABLE public.league_leaders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage league leaders"
ON public.league_leaders FOR ALL TO authenticated
USING (public.owns_save(save_id))
WITH CHECK (public.owns_save(save_id));

CREATE OR REPLACE FUNCTION public.touch_league_leaders()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_league_leaders_updated
BEFORE UPDATE ON public.league_leaders
FOR EACH ROW EXECUTE FUNCTION public.touch_league_leaders();