CREATE TYPE public.player_overall_history_reason AS ENUM ('cadastro_inicial', 'atualizacao_manual', 'fim_temporada');

ALTER TYPE public.motivo_saida ADD VALUE IF NOT EXISTS 'aposentadoria';
ALTER TYPE public.motivo_saida ADD VALUE IF NOT EXISTS 'rescisao_contrato';

CREATE TABLE public.player_overall_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  season_id uuid NOT NULL REFERENCES public.seasons(id) ON DELETE CASCADE,
  overall integer NOT NULL,
  valor_mercado numeric NULL,
  registrado_em timestamp with time zone NOT NULL DEFAULT now(),
  motivo public.player_overall_history_reason NOT NULL
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.player_overall_history TO authenticated;
GRANT ALL ON public.player_overall_history TO service_role;

ALTER TABLE public.player_overall_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "player_overall_history_own"
ON public.player_overall_history
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.players p
    WHERE p.id = player_overall_history.player_id
      AND public.owns_save(p.save_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.players p
    WHERE p.id = player_overall_history.player_id
      AND public.owns_save(p.save_id)
  )
);

CREATE INDEX player_overall_history_player_date_idx
ON public.player_overall_history(player_id, registrado_em);

CREATE INDEX player_overall_history_season_idx
ON public.player_overall_history(season_id);