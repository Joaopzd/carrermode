import { supabase } from "@/integrations/supabase/client";
import { carregarRegras, zonaDaPosicao } from "./league-rules";
import { chaveClube } from "./club-identidade";

/** Restores the missing preseason helper; archived snapshots are never modified. */
export async function semearTabelaProximaTemporada(input: {
  saveId: string;
  stintId: string;
  seasonId: string;
  tabelaFinal: { time: string; posicao: number | null }[];
  moveuDeDivisao: boolean;
}) {
  const { data: existente, error: erroExistente } = await supabase.from("standings_snapshot")
    .select("id").eq("stint_id", input.stintId).eq("season_id", input.seasonId).limit(1);
  if (erroExistente) throw erroExistente;
  if (existente?.length) return;
  const { data: passagem, error } = await supabase.from("stints")
    .select("league_id, clubs(nome)").eq("id", input.stintId).single();
  if (error) throw error;
  if (!passagem.league_id) return;
  const { data: clubes, error: erroClubes } = await supabase.from("clubs")
    .select("nome").eq("league_id", passagem.league_id).order("nome");
  if (erroClubes) throw erroClubes;
  const regras = await carregarRegras(passagem.league_id);
  const rebaixados = new Set(input.moveuDeDivisao ? [] : input.tabelaFinal
    .filter((linha) => linha.posicao != null && zonaDaPosicao(linha.posicao, input.tabelaFinal.length, regras)?.chave === "rebaixamento")
    .map((linha) => chaveClube(linha.time)));
  const times = new Map((clubes ?? []).filter((clube) => !rebaixados.has(chaveClube(clube.nome)))
    .map((clube) => [chaveClube(clube.nome), clube.nome]));
  if (passagem.clubs?.nome) times.set(chaveClube(passagem.clubs.nome), passagem.clubs.nome);
  if (!times.size) return;
  const { error: erroInsert } = await supabase.from("standings_snapshot").insert(
    [...times.values()].map((time, i) => ({ save_id: input.saveId, stint_id: input.stintId,
      season_id: input.seasonId, time, posicao: i + 1, rodada: 0 })),
  );
  if (erroInsert) throw erroInsert;
}