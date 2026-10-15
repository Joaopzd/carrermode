import { supabase } from "@/integrations/supabase/client";
import { escopo } from "@/lib/stint";

/**
 * O feed de notícias foi removido. Estas duas funções continuam exportadas, sem efeito,
 * apenas para não quebrar telas que ainda as chamam. Remova as chamadas quando puder.
 */
export async function checarEventosPosPartida(
  _saveId: string,
  _matchId: string,
  _stintId?: string | null,
): Promise<void> {
  /* sem efeito */
}

export async function checarVendaPolemica(
  _saveId: string,
  _playerId: string,
  _valor: number | null,
  _clubeDestino: string | null,
  _stintId?: string | null,
): Promise<void> {
  /* sem efeito */
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

/** Compara as metas da diretoria com os dados reais e atualiza o status de cada uma. */
export async function avaliarMetas(
  saveId: string,
  stintId?: string | null,
): Promise<MetaAvaliada[]> {
  const [{ data: metas }, { data: standings }, { data: transfers }, { data: players }] =
    await Promise.all([
      escopo(supabase.from("board_objectives").select("*"), saveId, stintId),
      escopo(
        supabase.from("standings_snapshot").select("time, posicao, rodada"),
        saveId,
        stintId,
      ).order("rodada", { ascending: false }),
      escopo(supabase.from("transfers").select("tipo, valor"), saveId, stintId),
      escopo(supabase.from("players").select("salario, motivo_saida"), saveId, stintId).eq(
        "ativo",
        true,
      ),
    ]);

  const consultaClube = supabase
    .from("stints")
    .select("clubs(nome)")
    .eq("id", stintId ?? "00000000-0000-0000-0000-000000000000");
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
    if (novoStatus === m.status) continue;
    await supabase.from("board_objectives").update({ status: novoStatus }).eq("id", m.id);
  }

  return avaliadas;
}
