-- PROFILES
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE NOT NULL,
  display_name text,
  criado_em timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, username, display_name)
  VALUES (
    NEW.id,
    COALESCE(
      NULLIF(NEW.raw_user_meta_data->>'username', ''),
      split_part(NEW.email, '@', 1) || '_' || substr(NEW.id::text, 1, 6)
    ),
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'username')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- LEAGUES / CLUBS (catálogo compartilhado)
CREATE TABLE public.leagues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  pais text NOT NULL,
  nivel integer NOT NULL,
  temporada_ref text,
  criado_em timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.leagues TO authenticated;
GRANT ALL ON public.leagues TO service_role;
ALTER TABLE public.leagues ENABLE ROW LEVEL SECURITY;
CREATE POLICY "leagues_read" ON public.leagues FOR SELECT TO authenticated USING (true);

CREATE TABLE public.clubs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id uuid REFERENCES public.leagues(id) ON DELETE CASCADE,
  nome text NOT NULL,
  escudo_url text,
  temporada_ref text,
  criado_em timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_clubs_league ON public.clubs(league_id);
GRANT SELECT ON public.clubs TO authenticated;
GRANT ALL ON public.clubs TO service_role;
ALTER TABLE public.clubs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "clubs_read" ON public.clubs FOR SELECT TO authenticated USING (true);

-- SAVES
CREATE TABLE public.saves (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  league_id uuid REFERENCES public.leagues(id) ON DELETE SET NULL,
  club_id uuid REFERENCES public.clubs(id) ON DELETE SET NULL,
  temporada text NOT NULL,
  criado_em timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_saves_user ON public.saves(user_id);
CREATE INDEX idx_saves_league ON public.saves(league_id);
CREATE INDEX idx_saves_club ON public.saves(club_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.saves TO authenticated;
GRANT ALL ON public.saves TO service_role;
ALTER TABLE public.saves ENABLE ROW LEVEL SECURITY;
CREATE POLICY "saves_own" ON public.saves FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.owns_save(_save_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.saves s WHERE s.id = _save_id AND s.user_id = auth.uid());
$$;
GRANT EXECUTE ON FUNCTION public.owns_save(uuid) TO authenticated;

-- MANAGERS
CREATE TABLE public.managers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  save_id uuid NOT NULL REFERENCES public.saves(id) ON DELETE CASCADE,
  nome text NOT NULL,
  sobrenome text,
  nome_usado text,
  nacionalidade text,
  estilo_tatico text,
  criado_em timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_managers_save ON public.managers(save_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.managers TO authenticated;
GRANT ALL ON public.managers TO service_role;
ALTER TABLE public.managers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "managers_own" ON public.managers FOR ALL TO authenticated USING (public.owns_save(save_id)) WITH CHECK (public.owns_save(save_id));

-- STAFF
CREATE TABLE public.staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  save_id uuid NOT NULL REFERENCES public.saves(id) ON DELETE CASCADE,
  cargo text NOT NULL,
  nome text NOT NULL,
  nacionalidade text,
  criado_em timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_staff_save ON public.staff(save_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.staff TO authenticated;
GRANT ALL ON public.staff TO service_role;
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff_own" ON public.staff FOR ALL TO authenticated USING (public.owns_save(save_id)) WITH CHECK (public.owns_save(save_id));

-- PLAYERS
CREATE TABLE public.players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  save_id uuid NOT NULL REFERENCES public.saves(id) ON DELETE CASCADE,
  nome text NOT NULL,
  nacionalidade text,
  posicao_principal text,
  posicoes_secundarias jsonb NOT NULL DEFAULT '[]'::jsonb,
  overall integer,
  valor_mercado numeric,
  salario numeric,
  idade integer,
  altura integer,
  playstyle text,
  status text,
  categoria text,
  criado_via text,
  criado_em timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_players_save ON public.players(save_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.players TO authenticated;
GRANT ALL ON public.players TO service_role;
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
CREATE POLICY "players_own" ON public.players FOR ALL TO authenticated USING (public.owns_save(save_id)) WITH CHECK (public.owns_save(save_id));

-- MATCHES
CREATE TABLE public.matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  save_id uuid NOT NULL REFERENCES public.saves(id) ON DELETE CASCADE,
  data_hora timestamptz,
  competicao text,
  adversario text,
  status text NOT NULL DEFAULT 'agendada',
  placar_time integer,
  placar_adversario integer,
  posse numeric,
  tempo_recuperacao numeric,
  chutes integer,
  xg numeric,
  passes integer,
  passes_pct numeric,
  desarmes integer,
  cartoes_amarelos integer,
  cartoes_vermelhos integer,
  criado_em timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_matches_save ON public.matches(save_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.matches TO authenticated;
GRANT ALL ON public.matches TO service_role;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "matches_own" ON public.matches FOR ALL TO authenticated USING (public.owns_save(save_id)) WITH CHECK (public.owns_save(save_id));

CREATE OR REPLACE FUNCTION public.owns_match(_match_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.matches m
    JOIN public.saves s ON s.id = m.save_id
    WHERE m.id = _match_id AND s.user_id = auth.uid()
  );
$$;
GRANT EXECUTE ON FUNCTION public.owns_match(uuid) TO authenticated;

-- MATCH PLAYER STATS
CREATE TABLE public.match_player_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  player_id uuid REFERENCES public.players(id) ON DELETE SET NULL,
  clean_sheet boolean NOT NULL DEFAULT false,
  defesas integer,
  gols integer,
  xg numeric,
  chutes integer,
  assistencias integer,
  xa numeric,
  passes integer,
  passes_pct numeric,
  desarmes integer,
  cartao_amarelo boolean NOT NULL DEFAULT false,
  cartao_vermelho boolean NOT NULL DEFAULT false,
  nota numeric
);
CREATE INDEX idx_mps_match ON public.match_player_stats(match_id);
CREATE INDEX idx_mps_player ON public.match_player_stats(player_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.match_player_stats TO authenticated;
GRANT ALL ON public.match_player_stats TO service_role;
ALTER TABLE public.match_player_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mps_own" ON public.match_player_stats FOR ALL TO authenticated USING (public.owns_match(match_id)) WITH CHECK (public.owns_match(match_id));

-- TRANSFERS
CREATE TABLE public.transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  save_id uuid NOT NULL REFERENCES public.saves(id) ON DELETE CASCADE,
  tipo text NOT NULL,
  modalidade text,
  player_id uuid REFERENCES public.players(id) ON DELETE SET NULL,
  clube_contraparte text,
  valor numeric,
  duracao_emprestimo text,
  jogador_troca_id uuid REFERENCES public.players(id) ON DELETE SET NULL,
  data timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_transfers_save ON public.transfers(save_id);
CREATE INDEX idx_transfers_player ON public.transfers(player_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.transfers TO authenticated;
GRANT ALL ON public.transfers TO service_role;
ALTER TABLE public.transfers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "transfers_own" ON public.transfers FOR ALL TO authenticated USING (public.owns_save(save_id)) WITH CHECK (public.owns_save(save_id));

-- STANDINGS SNAPSHOT
CREATE TABLE public.standings_snapshot (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  save_id uuid NOT NULL REFERENCES public.saves(id) ON DELETE CASCADE,
  rodada integer,
  time text NOT NULL,
  pontos integer NOT NULL DEFAULT 0,
  jogos integer NOT NULL DEFAULT 0,
  vitorias integer NOT NULL DEFAULT 0,
  empates integer NOT NULL DEFAULT 0,
  derrotas integer NOT NULL DEFAULT 0,
  gols_pro integer NOT NULL DEFAULT 0,
  gols_contra integer NOT NULL DEFAULT 0,
  saldo integer NOT NULL DEFAULT 0,
  posicao integer,
  criado_em timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_standings_save ON public.standings_snapshot(save_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.standings_snapshot TO authenticated;
GRANT ALL ON public.standings_snapshot TO service_role;
ALTER TABLE public.standings_snapshot ENABLE ROW LEVEL SECURITY;
CREATE POLICY "standings_own" ON public.standings_snapshot FOR ALL TO authenticated USING (public.owns_save(save_id)) WITH CHECK (public.owns_save(save_id));

-- NEWS FEED
CREATE TABLE public.news_feed (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  save_id uuid NOT NULL REFERENCES public.saves(id) ON DELETE CASCADE,
  tipo text NOT NULL,
  titulo text NOT NULL,
  corpo text,
  gerado_em timestamptz NOT NULL DEFAULT now(),
  relacionado_match_id uuid REFERENCES public.matches(id) ON DELETE SET NULL,
  relacionado_player_id uuid REFERENCES public.players(id) ON DELETE SET NULL,
  relacionado_transfer_id uuid REFERENCES public.transfers(id) ON DELETE SET NULL
);
CREATE INDEX idx_news_save ON public.news_feed(save_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.news_feed TO authenticated;
GRANT ALL ON public.news_feed TO service_role;
ALTER TABLE public.news_feed ENABLE ROW LEVEL SECURITY;
CREATE POLICY "news_own" ON public.news_feed FOR ALL TO authenticated USING (public.owns_save(save_id)) WITH CHECK (public.owns_save(save_id));

-- BOARD OBJECTIVES
CREATE TABLE public.board_objectives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  save_id uuid NOT NULL REFERENCES public.saves(id) ON DELETE CASCADE,
  temporada text,
  tipo text NOT NULL,
  meta text,
  status text NOT NULL DEFAULT 'em_andamento',
  criado_em timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_objectives_save ON public.board_objectives(save_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.board_objectives TO authenticated;
GRANT ALL ON public.board_objectives TO service_role;
ALTER TABLE public.board_objectives ENABLE ROW LEVEL SECURITY;
CREATE POLICY "objectives_own" ON public.board_objectives FOR ALL TO authenticated USING (public.owns_save(save_id)) WITH CHECK (public.owns_save(save_id));

-- FAN PRESSURE EVENTS
CREATE TABLE public.fan_pressure_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  save_id uuid NOT NULL REFERENCES public.saves(id) ON DELETE CASCADE,
  tipo text NOT NULL,
  player_id uuid REFERENCES public.players(id) ON DELETE SET NULL,
  intensidade integer,
  criado_em timestamptz NOT NULL DEFAULT now(),
  resolvido boolean NOT NULL DEFAULT false
);
CREATE INDEX idx_fan_save ON public.fan_pressure_events(save_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fan_pressure_events TO authenticated;
GRANT ALL ON public.fan_pressure_events TO service_role;
ALTER TABLE public.fan_pressure_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fan_own" ON public.fan_pressure_events FOR ALL TO authenticated USING (public.owns_save(save_id)) WITH CHECK (public.owns_save(save_id));

-- SEED LIGAS
INSERT INTO public.leagues (nome, pais, nivel) VALUES
  ('Premier League', 'Inglaterra', 1),
  ('EFL Championship', 'Inglaterra', 2),
  ('EFL League One', 'Inglaterra', 3),
  ('EFL League Two', 'Inglaterra', 4),
  ('LaLiga', 'Espanha', 1),
  ('LaLiga 2', 'Espanha', 2),
  ('Ligue 1', 'França', 1),
  ('Ligue 2', 'França', 2),
  ('Serie A', 'Itália', 1),
  ('Serie B', 'Itália', 2),
  ('Bundesliga', 'Alemanha', 1),
  ('2. Bundesliga', 'Alemanha', 2),
  ('Liga Portugal', 'Portugal', 1);
