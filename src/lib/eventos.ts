import { supabase } from "@/integrations/supabase/client";
import { gerarNoticia, type TipoEvento } from "@/lib/noticias.functions";
import { escopo } from "@/lib/stint";

type Partida = {
  id: string;
  data_hora: string | null;
  competicao: string | null;
  adversario: string | null;
  placar_time: number | null;
  placar_adversario: number | null;
};

async function disparar(
  saveId: string,
  tipo: TipoEvento,
  dados: Record<string, unknown>,
  extras: {
    relacionadoMatchId?: string;
    relacionadoPlayerId?: string;
    stintId?: string | null | undefined;
  } = {},
) {
  try {
    await gerarNoticia({ data: { saveId, tipo, dados, ...extras } });
  } catch (e) {
    console.error("Falha ao gerar notícia", tipo, e);
  }
}

function letra(p: Partida) {
  const a = p.placar_time ?? 0;
  const b = p.placar_adversario ?? 0;
  return a > b ? "V" : a < b ? "D" : "E";
}

async function jaExiste(saveId: string, matchId: string, tipo: string, stintId?: string | null) {
  const { data } = await escopo(supabase.from("news_feed").select("id"), saveId, stintId)
    .eq("relacionado_match_id", matchId)
    .eq("tipo", tipo)
    .limit(1);
  return (data ?? []).length > 0;
}

/** Roda após fechar uma partida: checa jogador no banco e sequência negativa. */
export async function checarEventosPosPartida(
  saveId: string,
  matchId: string,
  stintId?: string | null,
) {
  const { data: partidasRaw } = await escopo(
    supabase
      .from("matches")
      .select("id, data_hora, competicao, adversario, placar_time, placar_adversario"),
    saveId,
    stintId,
  )
    .eq("status", "finalizada")
    .order("data_hora", { ascending: false })
    .limit(5);

  const partidas = (partidasRaw ?? []) as Partida[];
  if (partidas.length === 0) return;
  const resultados = partidas.map(letra);

  // 1) Favoritos da torcida fora dos últimos 3 jogos
  const ultimas3 = partidas.slice(0, 3);
  if (ultimas3.length === 3) {
    const { data: favoritos } = await escopo(
      supabase.from("players").select("id, nome"),
      saveId,
      stintId,
    ).eq("favorito_torcida", true);

    const ids = ultimas3.map((p) => p.id);
    const { data: escalacoes } = await supabase
      .from("match_player_stats")
      .select("player_id, match_id")
      .in("match_id", ids);

    const usados = new Set((escalacoes ?? []).map((e) => e.player_id));
    for (const fav of (favoritos ?? []) as Array<{ id: string; nome: string }>) {
      if (usados.has(fav.id)) continue;
      if (await jaExiste(saveId, matchId, "torcida", stintId)) break;
      await disparar(
        saveId,
        "jogador_banco",
        { jogador: fav.nome, jogos_no_banco: 3, resultados_recentes: resultados.slice(0, 3) },
        { relacionadoMatchId: matchId, relacionadoPlayerId: fav.id, stintId },
      );
      break;
    }
  }

  // 2) Sequência negativa
  const duasDerrotas = resultados.length >= 2 && resultados[0] === "D" && resultados[1] === "D";
  const tresSemVitoria =
    resultados.length >= 3 && resultados.slice(0, 3).every((r) => r !== "V");

  if ((duasDerrotas || tresSemVitoria) && !(await jaExiste(saveId, matchId, "resultado", stintId))) {
    await disparar(
      saveId,
      "sequencia_negativa",
      {
        resultados_recentes: resultados.slice(0, 3),
        motivo: duasDerrotas ? "duas derrotas seguidas" : "três jogos sem vencer",
        ultimos_jogos: partidas.slice(0, 3).map((p) => ({
          adversario: p.adversario,
          placar: `${p.placar_time ?? 0}x${p.placar_adversario ?? 0}`,
          competicao: p.competicao,
        })),
      },
      { relacionadoMatchId: matchId, stintId },
    );
  }
}

/** Chame ao registrar uma transferência de saída. */
export async function checarVendaPolemica(
  saveId: string,
  playerId: string,
  valor: number | null,
  clubeDestino: string | null,
  stintId?: string | null,
) {
  const { data: elenco } = await escopo(
    supabase.from("players").select("id, nome, overall, favorito_torcida"),
    saveId,
    stintId,
  );

  const lista = (elenco ?? []) as Array<{
    id: string;
    nome: string;
    overall: number | null;
    favorito_torcida: boolean;
  }>;
  const jogador = lista.find((j) => j.id === playerId);
  if (!jogador) return;

  const comOverall = lista.filter((j) => typeof j.overall === "number");
  const media =
    comOverall.length > 0
      ? comOverall.reduce((a, j) => a + (j.overall ?? 0), 0) / comOverall.length
      : 0;

  const polemica = jogador.favorito_torcida || (jogador.overall ?? 0) > media;
  if (!polemica) return;

  await disparar(
    saveId,
    "venda_polemica",
    {
      jogador: jogador.nome,
      overall: jogador.overall,
      overall_medio_elenco: Math.round(media),
      favorito_torcida: jogador.favorito_torcida,
      valor,
      clube_destino: clubeDestino,
    },
    { relacionadoPlayerId: playerId, stintId },
  );
}

export type MetaAvaliada = {
  id: string;
  tipo: string;
  meta: string;
  status: string;
  atual: number | null;
  rotulo: string;
  cumprida: boolean;
};

/** Compara as metas da diretoria com os dados reais e dispara notícias. */
export async function avaliarMetas(
  saveId: string,
  stintId?: string | null,
): Promise<MetaAvaliada[]> {
  const [{ data: metas }, { data: standings }, { data: matches }, { data: transfers }, { data: players }] =
    await Promise.all([
      escopo(supabase.from("board_objectives").select("*"), saveId, stintId),
      escopo(
        supabase.from("standings_snapshot").select("time, posicao, rodada"),
        saveId,
        stintId,
      ).order("rodada", { ascending: false }),
      escopo(
        supabase.from("matches").select("placar_time, placar_adversario"),
        saveId,
        stintId,
      )
        .eq("competicao", "Liga")
        .eq("status", "finalizada"),
      escopo(supabase.from("transfers").select("tipo, valor"), saveId, stintId),
      escopo(supabase.from("players").select("salario, motivo_saida"), saveId, stintId).eq(
        "ativo",
        true,
      ),
    ]);

  const consultaClube = supabase.from("stints").select("clubs(nome)").eq("id", stintId ?? "00000000-0000-0000-0000-000000000000");
  const { data: saveRow } = await consultaClube.maybeSingle();
  const clubeNome = (saveRow as { clubs: { nome: string } | null } | null)?.clubs?.nome ?? null;

  const ultimaRodada = (standings ?? [])[0]?.rodada ?? null;
  const minhaLinha = (standings ?? []).find(
    (s) => s.rodada === ultimaRodada && clubeNome && s.time === clubeNome,
  );
  const posicaoAtual = minhaLinha?.posicao ?? null;

  const receita = (transfers ?? [])
    .filter((t) => t.tipo === "saida" || t.tipo === "venda")
    .reduce((a, t) => a + Number(t.valor ?? 0), 0);
  const folha = (players ?? []).reduce((a, p) => a + Number(p.salario ?? 0), 0);
  const jogosLiga = (matches ?? []).length;

  const avaliadas: MetaAvaliada[] = [];

  for (const m of (metas ?? []) as Array<{
    id: string;
    tipo: string;
    meta: string | null;
    status: string;
  }>) {
    const alvo = Number(m.meta ?? 0);
    let atual: number | null = null;
    let cumprida = false;
    let rotulo = "";

    if (m.tipo === "posicao_alvo") {
      atual = posicaoAtual;
      rotulo = "Posição na liga";
      cumprida = atual !== null && atual <= alvo;
    } else if (m.tipo === "receita_vendas") {
      atual = receita;
      rotulo = "Receita com vendas";
      cumprida = receita >= alvo;
    } else if (m.tipo === "teto_salarial") {
      atual = folha;
      rotulo = "Folha salarial";
      cumprida = folha <= alvo;
    }

    avaliadas.push({
      id: m.id,
      tipo: m.tipo,
      meta: m.meta ?? "",
      status: m.status,
      atual,
      rotulo,
      cumprida,
    });

    const novoStatus = cumprida ? "cumprida" : atual === null ? "em_andamento" : "em_risco";
    if (novoStatus === m.status || (novoStatus === "em_andamento" && m.status === "em_andamento"))
      continue;

    await supabase.from("board_objectives").update({ status: novoStatus }).eq("id", m.id);

    if (novoStatus === "cumprida" || novoStatus === "em_risco") {
      await disparar(saveId, novoStatus === "cumprida" ? "meta_cumprida" : "meta_risco", {
        meta: rotulo,
        alvo,
        valor_atual: atual,
        jogos_de_liga_disputados: jogosLiga,
      }, { stintId: stintId ?? null });
    }
  }

  return avaliadas;
}
