-- Evolução dos jogadores (base e elenco): cada avaliação guarda idade, overall e potencial.
create table if not exists public.player_evaluations (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players(id) on delete cascade,
  save_id uuid not null,
  stint_id uuid,
  season_id uuid references public.seasons(id) on delete set null,
  idade integer,
  overall integer,
  potencial integer,
  nota text,
  tipo text not null default 'avaliacao'
    check (tipo in ('cadastro', 'avaliacao', 'fim_temporada', 'promocao')),
  registrado_em timestamptz not null default now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.player_evaluations TO authenticated;
GRANT ALL ON public.player_evaluations TO service_role;

create index if not exists player_evaluations_player_idx
  on public.player_evaluations (player_id, registrado_em);
create index if not exists player_evaluations_stint_idx
  on public.player_evaluations (stint_id);

alter table public.player_evaluations enable row level security;

drop policy if exists "avaliações do próprio usuário" on public.player_evaluations;
create policy "avaliações do próprio usuário"
  on public.player_evaluations
  for all
  to authenticated
  using (exists (select 1 from public.saves s where s.id = player_evaluations.save_id and s.user_id = auth.uid()))
  with check (exists (select 1 from public.saves s where s.id = player_evaluations.save_id and s.user_id = auth.uid()));