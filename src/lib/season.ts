import { supabase } from "@/integrations/supabase/client";

export type Season = {
  id: string;
  save_id: string;
  nome: string;
  status: string;
  data_inicio: string | null;
  data_fim: string | null;
  resumo: ResumoSeason | null;
};

export type ResumoSeason = {
  posicao_final?: number | null;
  pontos?: number | null;
  jogos?: number;
  vitorias?: number;
  empates?: number;
  derrotas?: number;
  gols_pro?: number;
  gols_contra?: number;
  artilheiro?: { nome: string; gols: number } | null;
  saldo_transferencias?: number;
  entradas?: number;
  saidas?: number;
};

export const MOTIVOS_SAIDA = [
  { valor: "transferencia_definitiva", rotulo: "Transferência definitiva" },
  { valor: "emprestimo", rotulo: "Empréstimo" },
  { valor: "liberado", rotulo: "Liberado" },
  { valor: "fim_de_contrato", rotulo: "Fim de contrato" },
  { valor: "aposentadoria", rotulo: "Aposentadoria" },
  { valor: "rescisao_contrato", rotulo: "Rescisão de contrato" },
] as const;

export function rotuloMotivo(m: string | null | undefined) {
  return MOTIVOS_SAIDA.find((x) => x.valor === m)?.rotulo ?? "—";
}

/** Retorna a season ativa do save, criando uma se ainda não existir. */
export async function garantirSeasonAtiva(
  saveId: string,
  nomePadrao = "Temporada 1",
): Promise<Season | null> {
  const { data } = await supabase
    .from("seasons")
    .select("*")
    .eq("save_id", saveId)
    .eq("status", "ativa")
    .order("criado_em", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (data) return data as unknown as Season;

  const { data: criada } = await supabase
    .from("seasons")
    .insert({ save_id: saveId, nome: nomePadrao, status: "ativa" })
    .select("*")
    .single();

  return (criada as unknown as Season) ?? null;
}

function proximoNomeTemporada(nome: string): string {
  // "2025/2026" -> "2026/2027"
  const barra = nome.match(/(\d{4})\s*\/\s*(\d{2,4})/);
  if (barra?.[1] && barra[2]) {
    const ini = Number(barra[1]) + 1;
    const fimTam = barra[2].length;
    const fim = ini + 1;
    return nome.replace(barra[0], `${ini}/${fimTam === 2 ? String(fim).slice(2) : fim}`);
  }
  const ano = nome.match(/(\d{4})/);
  if (ano?.[0]) return nome.replace(ano[0], String(Number(ano[0]) + 1));
  const n = nome.match(/(\d+)\s*$/);
  if (n?.[1]) return nome.replace(/(\d+)\s*$/, String(Number(n[1]) + 1));
  return `${nome} (nova)`;
}

/** Calcula o resumo da season ativa, encerra e abre a próxima. */
export async function encerrarTemporada(saveId: string, seasonId: string) {
  const [partidasRes, statsRes, playersRes, transfersRes, standingsRes, seasonRes] =
    await Promise.all([
      supabase
        .from("matches")
        .select("id, placar_time, placar_adversario, competicao")
        .eq("save_id", saveId)
        .eq("season_id", seasonId)
        .eq("status", "finalizada"),
      supabase.from("match_player_stats").select("player_id, gols, match_id"),
      supabase
        .from("players")
        .select("id, nome, overall, valor_mercado, ativo")
        .eq("save_id", saveId),
      supabase.from("transfers").select("tipo, valor").eq("save_id", saveId).eq("season_id", seasonId),
      supabase
        .from("standings_snapshot")
        .select("time, posicao, rodada")
        .eq("save_id", saveId)
        .eq("season_id", seasonId)
        .order("rodada", { ascending: false }),
      supabase.from("seasons").select("*").eq("id", seasonId).maybeSingle(),
    ]);

  const partidas = partidasRes.data ?? [];
  const idsPartidas = new Set(partidas.map((p) => p.id));

  let v = 0,
    e = 0,
    d = 0,
    gp = 0,
    gc = 0;
  for (const p of partidas) {
    const a = p.placar_time ?? 0;
    const b = p.placar_adversario ?? 0;
    gp += a;
    gc += b;
    if (a > b) v++;
    else if (a < b) d++;
    else e++;
  }

  const nomePorId = new Map((playersRes.data ?? []).map((p) => [p.id, p.nome]));
  const golsPorJogador = new Map<string, number>();
  for (const s of statsRes.data ?? []) {
    if (!s.player_id || !idsPartidas.has(s.match_id)) continue;
    if (!nomePorId.has(s.player_id)) continue;
    golsPorJogador.set(s.player_id, (golsPorJogador.get(s.player_id) ?? 0) + (s.gols ?? 0));
  }
  let artilheiro: ResumoSeason["artilheiro"] = null;
  for (const [id, gols] of golsPorJogador) {
    if (gols > 0 && (!artilheiro || gols > artilheiro.gols)) {
      artilheiro = { nome: nomePorId.get(id) ?? "—", gols };
    }
  }

  let entradas = 0;
  let saidas = 0;
  for (const t of transfersRes.data ?? []) {
    const valor = Number(t.valor ?? 0);
    if (t.tipo === "entrada") entradas += valor;
    else saidas += valor;
  }

  const ultimaRodada = standingsRes.data?.[0]?.rodada ?? null;
  const linhasUltima = (standingsRes.data ?? []).filter((l) => l.rodada === ultimaRodada);
  const seasonAtual = seasonRes.data as unknown as Season | null;

  const resumo: ResumoSeason = {
    posicao_final: linhasUltima[0]?.posicao ?? null,
    pontos: v * 3 + e,
    jogos: partidas.length,
    vitorias: v,
    empates: e,
    derrotas: d,
    gols_pro: gp,
    gols_contra: gc,
    artilheiro,
    entradas,
    saidas,
    saldo_transferencias: saidas - entradas,
  };

  const snapshots = (playersRes.data ?? [])
    .filter((player) => player.ativo && player.overall != null)
    .map((player) => ({
      player_id: player.id,
      season_id: seasonId,
      overall: player.overall as number,
      valor_mercado: player.valor_mercado,
      motivo: "fim_temporada" as const,
    }));
  if (snapshots.length > 0) {
    const { error } = await supabase.from("player_overall_history").insert(snapshots);
    if (error) throw error;
  }

  await supabase
    .from("seasons")
    .update({
      status: "encerrada",
      resumo: resumo as never,
      data_fim: new Date().toISOString().slice(0, 10),
    })
    .eq("id", seasonId);

  const nova = proximoNomeTemporada(seasonAtual?.nome ?? "Temporada 1");
  const { data: criada } = await supabase
    .from("seasons")
    .insert({
      save_id: saveId,
      nome: nova,
      status: "ativa",
      data_inicio: new Date().toISOString().slice(0, 10),
    })
    .select("*")
    .single();

  return { resumo, nova: criada as unknown as Season | null };
}
