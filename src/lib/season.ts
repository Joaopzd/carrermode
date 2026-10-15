import { supabase } from "@/integrations/supabase/client";
import { carregarRegras, zonaDaPosicao } from "@/lib/league-rules";
import { resolverEmprestimosNoFimDaTemporada } from "@/lib/emprestimos";
import {
  ajusteFinanceiroParcelado,
  ativarChegadasDeTemporada,
  liquidarParcelasDaTemporada,
} from "@/lib/transferencias-futuras";

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
  zona_final?: string | null;
  movimento?: "acesso" | "rebaixamento" | "permanencia";
  liga_anterior?: string | null;
  liga_nova?: string | null;
  competicoes_classificado?: string[];
};

export type TransicaoLiga = {
  posicao: number | null;
  zona: string | null;
  movimento: "acesso" | "rebaixamento" | "permanencia";
  ligaAnterior: string | null;
  ligaNova: string | null;
  competicoes: string[];
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
  stintId?: string,
): Promise<Season | null> {
  if (!stintId) return null;
  const q = supabase.from("seasons").select("*");
  const { data } = await q.eq("stint_id", stintId)
    .eq("status", "ativa")
    .order("criado_em", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (data) return data as unknown as Season;

  const { data: criada } = await supabase
    .from("seasons")
    .insert({ save_id: saveId, stint_id: stintId ?? null, nome: nomePadrao, status: "ativa" })
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

const normalizar = (v: string | null | undefined) =>
  (v ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();

/**
 * Lê a classificação final da temporada e decide o destino do clube na próxima:
 * acesso, rebaixamento ou permanência — além das competições conquistadas.
 * Quando há mudança de divisão, atualiza a liga do save.
 */
export async function apurarTransicaoLiga(
  stintId: string,
  tabelaFinal: { time: string; posicao: number | null }[],
): Promise<TransicaoLiga> {
  const vazio: TransicaoLiga = {
    posicao: null,
    zona: null,
    movimento: "permanencia",
    ligaAnterior: null,
    ligaNova: null,
    competicoes: [],
  };

  const { data: saveRow } = await supabase
    .from("stints")
    .select("id, league_id, clubs(nome), leagues(id, nome, pais, nivel)")
    .eq("id", stintId)
    .maybeSingle();
  if (!saveRow) return vazio;

  const clube = (saveRow as { clubs: { nome: string } | null }).clubs;
  const liga = (
    saveRow as { leagues: { id: string; nome: string; pais: string; nivel: number } | null }
  ).leagues;
  if (!liga || !clube) return { ...vazio, ligaAnterior: liga?.nome ?? null };

  const minhaLinha = tabelaFinal.find((l) => normalizar(l.time) === normalizar(clube.nome));
  const posicao = minhaLinha?.posicao ?? null;
  if (!posicao) return { ...vazio, ligaAnterior: liga.nome };

  const regras = await carregarRegras(liga.id);
  const zona = zonaDaPosicao(posicao, tabelaFinal.length, regras);

  const competicoes: string[] = [];
  let movimento: TransicaoLiga["movimento"] = "permanencia";
  let nivelAlvo: number | null = null;

  if (zona?.chave === "acesso") {
    movimento = "acesso";
    nivelAlvo = liga.nivel - 1;
  } else if (zona?.chave === "rebaixamento") {
    movimento = "rebaixamento";
    nivelAlvo = liga.nivel + 1;
  } else if (zona?.chave === "champions") {
    competicoes.push("UEFA Champions League");
  } else if (zona?.chave === "europa") {
    competicoes.push("UEFA Europa League");
  } else if (zona?.chave === "conference") {
    competicoes.push("UEFA Conference League");
  }

  let ligaNova: string | null = null;
  if (nivelAlvo != null && nivelAlvo >= 1) {
    const { data: destino } = await supabase
      .from("leagues")
      .select("id, nome")
      .eq("pais", liga.pais)
      .eq("nivel", nivelAlvo)
      .limit(1)
      .maybeSingle();
    if (destino) {
      ligaNova = destino.nome as string;
      await supabase
        .from("stints")
        .update({ league_id: destino.id as string })
        .eq("id", stintId);
    } else {
      // Sem divisão correspondente cadastrada: mantém a liga atual.
      movimento = "permanencia";
    }
  }

  return {
    posicao,
    zona: zona?.rotulo ?? null,
    movimento,
    ligaAnterior: liga.nome,
    ligaNova,
    competicoes,
  };
}

/** Calcula o resumo da season ativa, encerra e abre a próxima. */
export async function encerrarTemporada(saveId: string, seasonId: string, stintId: string) {
  const [partidasRes, statsRes, playersRes, transfersRes, standingsRes, seasonRes] =
    await Promise.all([
      supabase
        .from("matches")
        .select("id, placar_time, placar_adversario, competicao")
        .eq("stint_id", stintId)
        .eq("season_id", seasonId)
        .eq("status", "finalizada"),
      supabase.from("match_player_stats").select("player_id, gols, match_id"),
      supabase
        .from("players")
        .select("id, nome, overall, valor_mercado, ativo")
        .eq("stint_id", stintId),
      supabase
        .from("transfers")
        .select("tipo, valor")
        .eq("stint_id", stintId)
        .eq("season_id", seasonId),
      supabase
        .from("standings_snapshot")
        .select("time, posicao, rodada")
        .eq("stint_id", stintId)
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
  // Transferências parceladas: só o à vista conta na temporada; parcelas entram quando debitadas.
  const ajuste = await ajusteFinanceiroParcelado(stintId, seasonId);
  entradas += ajuste.entradas;
  saidas += ajuste.saidas;

  const ultimaRodada = standingsRes.data?.[0]?.rodada ?? null;
  const linhasUltima = (standingsRes.data ?? []).filter((l) => l.rodada === ultimaRodada);
  const seasonAtual = seasonRes.data as unknown as Season | null;

  const transicao = await apurarTransicaoLiga(
    stintId,
    linhasUltima.map((l) => ({ time: l.time, posicao: l.posicao })),
  );

  const resumo: ResumoSeason = {
    posicao_final: transicao.posicao ?? linhasUltima[0]?.posicao ?? null,
    zona_final: transicao.zona,
    movimento: transicao.movimento,
    liga_anterior: transicao.ligaAnterior,
    liga_nova: transicao.ligaNova,
    competicoes_classificado: transicao.competicoes,
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
      stint_id: stintId,
      nome: nova,
      status: "ativa",
      data_inicio: new Date().toISOString().slice(0, 10),
    })
    .select("*")
    .single();

  const novaSeason = (criada as unknown as Season | null) ?? null;

  // Contratações marcadas para a próxima temporada entram no elenco agora.
  await ativarChegadasDeTemporada(saveId, stintId);

  // Primeira (ou próxima) parcela de cada transferência parcelada é debitada na nova temporada.
  await liquidarParcelasDaTemporada(stintId, novaSeason?.id ?? null);

  // Empréstimos vencidos: obrigação de compra vira definitiva, o resto devolve o jogador.
  await resolverEmprestimosNoFimDaTemporada(saveId, seasonId, "verao", stintId);

  return { resumo, nova: novaSeason, transicao };
}
