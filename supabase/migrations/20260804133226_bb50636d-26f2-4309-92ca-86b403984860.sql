CREATE TABLE IF NOT EXISTS public.seasons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  save_id uuid NOT NULL REFERENCES public.saves(id) ON DELETE CASCADE,
  nome text NOT NULL,
  status text NOT NULL DEFAULT 'ativa',
  data_inicio date,
  data_fim date,
  resumo jsonb,
  criado_em timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.seasons TO authenticated;
GRANT ALL ON public.seasons TO service_role;

ALTER TABLE public.seasons ENABLE ROW LEVEL SECURITY;

CREATE POLICY seasons_own ON public.seasons
  FOR ALL TO authenticated
  USING (public.owns_save(save_id))
  WITH CHECK (public.owns_save(save_id));

CREATE INDEX IF NOT EXISTS seasons_save_idx ON public.seasons(save_id);

ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS season_id uuid REFERENCES public.seasons(id) ON DELETE SET NULL;
ALTER TABLE public.standings_snapshot ADD COLUMN IF NOT EXISTS season_id uuid REFERENCES public.seasons(id) ON DELETE SET NULL;
ALTER TABLE public.transfers ADD COLUMN IF NOT EXISTS season_id uuid REFERENCES public.seasons(id) ON DELETE SET NULL;
ALTER TABLE public.board_objectives ADD COLUMN IF NOT EXISTS season_id uuid REFERENCES public.seasons(id) ON DELETE SET NULL;
ALTER TABLE public.news_feed ADD COLUMN IF NOT EXISTS season_id uuid REFERENCES public.seasons(id) ON DELETE SET NULL;

DO $$ BEGIN
  CREATE TYPE public.motivo_saida AS ENUM ('transferencia_definitiva','emprestimo','liberado','fim_de_contrato');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.players
  ADD COLUMN IF NOT EXISTS ativo boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS data_saida date,
  ADD COLUMN IF NOT EXISTS motivo_saida public.motivo_saida,
  ADD COLUMN IF NOT EXISTS clube_destino text,
  ADD COLUMN IF NOT EXISTS transfer_saida_id uuid REFERENCES public.transfers(id) ON DELETE SET NULL;

INSERT INTO public.seasons (save_id, nome, status)
SELECT s.id, COALESCE(s.temporada, 'Temporada 1'), 'ativa'
FROM public.saves s
WHERE NOT EXISTS (SELECT 1 FROM public.seasons se WHERE se.save_id = s.id);

UPDATE public.matches m SET season_id = se.id
FROM public.seasons se WHERE se.save_id = m.save_id AND se.status = 'ativa' AND m.season_id IS NULL;
UPDATE public.standings_snapshot t SET season_id = se.id
FROM public.seasons se WHERE se.save_id = t.save_id AND se.status = 'ativa' AND t.season_id IS NULL;
UPDATE public.transfers t SET season_id = se.id
FROM public.seasons se WHERE se.save_id = t.save_id AND se.status = 'ativa' AND t.season_id IS NULL;
UPDATE public.board_objectives t SET season_id = se.id
FROM public.seasons se WHERE se.save_id = t.save_id AND se.status = 'ativa' AND t.season_id IS NULL;
UPDATE public.news_feed t SET season_id = se.id
FROM public.seasons se WHERE se.save_id = t.save_id AND se.status = 'ativa' AND t.season_id IS NULL;