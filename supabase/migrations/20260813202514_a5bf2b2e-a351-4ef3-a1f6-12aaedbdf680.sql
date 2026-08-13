CREATE TYPE public.competition_scope AS ENUM ('continental','liga','copa_nacional','supercopa');
CREATE TYPE public.transfer_option_status AS ENUM ('nao_aplicavel','pendente','exercida','nao_exercida');

CREATE TABLE public.competitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL UNIQUE,
  escopo public.competition_scope NOT NULL,
  pais text,
  nivel_liga integer,
  restrito_a_niveis jsonb,
  registra_vice boolean NOT NULL DEFAULT true,
  condicao_elegibilidade jsonb,
  criado_em timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.competitions TO authenticated;
GRANT ALL ON public.competitions TO service_role;
ALTER TABLE public.competitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY competitions_read ON public.competitions FOR SELECT TO authenticated USING (true);

CREATE TABLE public.trophy_gallery (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  save_id uuid NOT NULL REFERENCES public.saves(id) ON DELETE CASCADE,
  season_id uuid REFERENCES public.seasons(id) ON DELETE SET NULL,
  competition_id uuid NOT NULL REFERENCES public.competitions(id) ON DELETE CASCADE,
  campeao_clube text NOT NULL,
  vice_clube text,
  e_meu_clube_campeao boolean NOT NULL DEFAULT false,
  e_meu_clube_vice boolean NOT NULL DEFAULT false,
  data_registro timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_trophy_gallery_save ON public.trophy_gallery(save_id);
CREATE INDEX idx_trophy_gallery_season ON public.trophy_gallery(season_id);
CREATE INDEX idx_trophy_gallery_competition ON public.trophy_gallery(competition_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trophy_gallery TO authenticated;
GRANT ALL ON public.trophy_gallery TO service_role;
ALTER TABLE public.trophy_gallery ENABLE ROW LEVEL SECURITY;
CREATE POLICY trophy_own ON public.trophy_gallery FOR ALL TO authenticated USING (public.owns_save(save_id)) WITH CHECK (public.owns_save(save_id));

CREATE TABLE public.league_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id uuid NOT NULL REFERENCES public.leagues(id) ON DELETE CASCADE,
  temporada_ref text,
  vagas_champions integer NOT NULL DEFAULT 0,
  vagas_europa_league integer NOT NULL DEFAULT 0,
  vagas_conference_league integer NOT NULL DEFAULT 0,
  zona_rebaixamento_direto integer NOT NULL DEFAULT 0,
  zona_playoff_rebaixamento integer,
  vagas_acesso_direto integer,
  zona_playoff_acesso integer,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX idx_league_rules_league ON public.league_rules(league_id);
GRANT SELECT, INSERT, UPDATE ON public.league_rules TO authenticated;
GRANT ALL ON public.league_rules TO service_role;
ALTER TABLE public.league_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY league_rules_read ON public.league_rules FOR SELECT TO authenticated USING (true);
CREATE POLICY league_rules_write ON public.league_rules FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY league_rules_update ON public.league_rules FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.touch_league_rules()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.atualizado_em = now(); RETURN NEW; END; $$;
CREATE TRIGGER league_rules_touch BEFORE UPDATE ON public.league_rules
FOR EACH ROW EXECUTE FUNCTION public.touch_league_rules();

ALTER TABLE public.transfers
  ADD COLUMN tem_opcao_compra boolean NOT NULL DEFAULT false,
  ADD COLUMN valor_opcao_compra numeric,
  ADD COLUMN obrigacao_compra boolean NOT NULL DEFAULT false,
  ADD COLUMN status_opcao public.transfer_option_status NOT NULL DEFAULT 'nao_aplicavel',
  ADD COLUMN transfer_origem_emprestimo_id uuid REFERENCES public.transfers(id) ON DELETE SET NULL;