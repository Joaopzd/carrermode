
CREATE TYPE public.stint_status AS ENUM ('ativa', 'encerrada');
CREATE TYPE public.stint_exit_reason AS ENUM ('demitido', 'pediu_para_sair', 'fim_de_contrato', 'aposentou');

CREATE TABLE public.stints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  save_id uuid NOT NULL REFERENCES public.saves(id) ON DELETE CASCADE,
  league_id uuid REFERENCES public.leagues(id),
  club_id uuid REFERENCES public.clubs(id),
  data_inicio date NOT NULL DEFAULT current_date,
  data_fim date,
  status public.stint_status NOT NULL DEFAULT 'ativa',
  motivo_saida public.stint_exit_reason,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.stints TO authenticated;
GRANT ALL ON public.stints TO service_role;

ALTER TABLE public.stints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage stints of their saves"
ON public.stints FOR ALL TO authenticated
USING (public.owns_save(save_id))
WITH CHECK (public.owns_save(save_id));

CREATE INDEX idx_stints_save_id ON public.stints(save_id);
CREATE INDEX idx_stints_status ON public.stints(save_id, status);

CREATE TRIGGER stints_touch BEFORE UPDATE ON public.stints
FOR EACH ROW EXECUTE FUNCTION public.touch_league_rules();

-- backfill: uma stint ativa por save
INSERT INTO public.stints (save_id, league_id, club_id, data_inicio, status)
SELECT s.id, s.league_id, s.club_id, s.criado_em::date, 'ativa'
FROM public.saves s;

CREATE OR REPLACE FUNCTION public.owns_stint(_stint_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.stints st
    JOIN public.saves s ON s.id = st.save_id
    WHERE st.id = _stint_id AND s.user_id = auth.uid()
  );
$$;

-- stint_id nas tabelas de dados
ALTER TABLE public.seasons ADD COLUMN stint_id uuid REFERENCES public.stints(id) ON DELETE CASCADE;
ALTER TABLE public.staff ADD COLUMN stint_id uuid REFERENCES public.stints(id) ON DELETE CASCADE;
ALTER TABLE public.players ADD COLUMN stint_id uuid REFERENCES public.stints(id) ON DELETE CASCADE;
ALTER TABLE public.matches ADD COLUMN stint_id uuid REFERENCES public.stints(id) ON DELETE CASCADE;
ALTER TABLE public.transfers ADD COLUMN stint_id uuid REFERENCES public.stints(id) ON DELETE CASCADE;
ALTER TABLE public.standings_snapshot ADD COLUMN stint_id uuid REFERENCES public.stints(id) ON DELETE CASCADE;
ALTER TABLE public.news_feed ADD COLUMN stint_id uuid REFERENCES public.stints(id) ON DELETE CASCADE;
ALTER TABLE public.board_objectives ADD COLUMN stint_id uuid REFERENCES public.stints(id) ON DELETE CASCADE;
ALTER TABLE public.trophy_gallery ADD COLUMN stint_id uuid REFERENCES public.stints(id) ON DELETE CASCADE;
ALTER TABLE public.fan_pressure_events ADD COLUMN stint_id uuid REFERENCES public.stints(id) ON DELETE CASCADE;

UPDATE public.seasons t SET stint_id = st.id FROM public.stints st WHERE st.save_id = t.save_id AND st.status = 'ativa';
UPDATE public.staff t SET stint_id = st.id FROM public.stints st WHERE st.save_id = t.save_id AND st.status = 'ativa';
UPDATE public.players t SET stint_id = st.id FROM public.stints st WHERE st.save_id = t.save_id AND st.status = 'ativa';
UPDATE public.matches t SET stint_id = st.id FROM public.stints st WHERE st.save_id = t.save_id AND st.status = 'ativa';
UPDATE public.transfers t SET stint_id = st.id FROM public.stints st WHERE st.save_id = t.save_id AND st.status = 'ativa';
UPDATE public.standings_snapshot t SET stint_id = st.id FROM public.stints st WHERE st.save_id = t.save_id AND st.status = 'ativa';
UPDATE public.news_feed t SET stint_id = st.id FROM public.stints st WHERE st.save_id = t.save_id AND st.status = 'ativa';
UPDATE public.board_objectives t SET stint_id = st.id FROM public.stints st WHERE st.save_id = t.save_id AND st.status = 'ativa';
UPDATE public.trophy_gallery t SET stint_id = st.id FROM public.stints st WHERE st.save_id = t.save_id AND st.status = 'ativa';
UPDATE public.fan_pressure_events t SET stint_id = st.id FROM public.stints st WHERE st.save_id = t.save_id AND st.status = 'ativa';

CREATE INDEX idx_seasons_stint ON public.seasons(stint_id);
CREATE INDEX idx_staff_stint ON public.staff(stint_id);
CREATE INDEX idx_players_stint ON public.players(stint_id);
CREATE INDEX idx_matches_stint ON public.matches(stint_id);
CREATE INDEX idx_transfers_stint ON public.transfers(stint_id);
CREATE INDEX idx_standings_stint ON public.standings_snapshot(stint_id);
CREATE INDEX idx_news_stint ON public.news_feed(stint_id);
CREATE INDEX idx_board_objectives_stint ON public.board_objectives(stint_id);
CREATE INDEX idx_trophy_stint ON public.trophy_gallery(stint_id);
CREATE INDEX idx_fan_pressure_stint ON public.fan_pressure_events(stint_id);
