import { supabase } from "@/integrations/supabase/client";

/** Conta quantas vezes cada jogador foi MVP no save (opcionalmente numa temporada). */
export async function contarMvps(
  saveId: string,
  seasonId?: string | null,
  stintId?: string | null,
): Promise<Record<string, number>> {
  let q = supabase
    .from("matches")
    .select("mvp_player_id")
    .not("mvp_player_id", "is", null);
  q = stintId ? q.eq("stint_id", stintId) : q.eq("save_id", saveId);
  if (seasonId) q = q.eq("season_id", seasonId);
  const { data } = await q;
  const mapa: Record<string, number> = {};
  for (const linha of (data ?? []) as { mvp_player_id: string | null }[]) {
    if (!linha.mvp_player_id) continue;
    mapa[linha.mvp_player_id] = (mapa[linha.mvp_player_id] ?? 0) + 1;
  }
  return mapa;
}

/** Contagem de MVPs de um jogador: temporada ativa e total no clube. */
export async function contarMvpsJogador(
  saveId: string,
  playerId: string,
  seasonId?: string | null,
): Promise<{ temporada: number; total: number }> {
  const [totalMapa, temporadaMapa] = await Promise.all([
    contarMvps(saveId),
    seasonId ? contarMvps(saveId, seasonId) : Promise.resolve({} as Record<string, number>),
  ]);
  return { temporada: temporadaMapa[playerId] ?? 0, total: totalMapa[playerId] ?? 0 };
}
