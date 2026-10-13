import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

/**
 * Cliente sem tipagem do banco: as colunas/tabelas novas (início da contratação e parcelas)
 * só entram em types.ts depois que o Supabase regenera os tipos.
 */
export const db = supabase as unknown as SupabaseClient;

export type InicioTipo = "agora" | "proxima_janela" | "proxima_temporada";

export const ROTULO_INICIO: Record<InicioTipo, string> = {
  agora: "Agora",
  proxima_janela: "Próxima janela",
  proxima_temporada: "Próxima temporada",
};

const pad = (n: number) => String(n).padStart(2, "0");

/** Janelas: julho e agosto (verão) e janeiro (inverno). */
export function janelaAberta(dia: string): boolean {
  const mes = Number(dia.slice(5, 7));
  return mes === 1 || mes === 7 || mes === 8;
}

/** Próxima abertura de janela estritamente depois do dia informado: 1º de julho ou 1º de janeiro. */
export function proximaAberturaJanela(dia: string): string {
  const ano = Number(dia.slice(0, 4));
  const mes = Number(dia.slice(5, 7));
  return mes < 7 ? `${ano}-07-01` : `${ano + 1}-01-01`;
}

export function formatarDiaCurto(dia: string): string {
  return `${dia.slice(8, 10)}/${dia.slice(5, 7)}/${dia.slice(0, 4)}`;
}

/** Divide o que sobra depois do valor à vista em parcelas iguais (a última absorve o arredondamento). */
export function calcularParcelas(total: number, aVista: number, qtd: number): number[] {
  const restante = Math.max(0, total - aVista);
  if (qtd <= 0 || restante <= 0) return [];
  const base = Math.floor((restante / qtd) * 100) / 100;
  const lista = Array.from({ length: qtd }, () => base);
  lista[qtd - 1] = Math.round((restante - base * (qtd - 1)) * 100) / 100;
  return lista;
}

export type JogadorPendente = {
  nome: string;
  /** Quando é um ex-jogador voltando, o registro dele é reativado em vez de criar outro. */
  retorno_id?: string | null;
  payload: Record<string, unknown>;
};

export type ChegadaPendente = {
  id: string;
  clube_contraparte: string | null;
  inicio_tipo: InicioTipo;
  data_inicio: string | null;
  jogador_pendente: JogadorPendente | null;
};

export type Parcela = {
  id: string;
  transfer_id: string;
  numero: number;
  valor: number;
  direcao: "pagar" | "receber";
  status: "pendente" | "liquidada";
  season_liquidacao_id: string | null;
};

export async function criarParcelas(args: {
  transferId: string;
  saveId: string;
  stintId: string | null;
  direcao: "pagar" | "receber";
  valores: number[];
}) {
  if (args.valores.length === 0) return;
  const { error } = await db.from("transfer_parcelas").insert(
    args.valores.map((valor, i) => ({
      transfer_id: args.transferId,
      save_id: args.saveId,
      stint_id: args.stintId,
      numero: i + 1,
      valor,
      direcao: args.direcao,
    })),
  );
  if (error) throw error;
}

export async function carregarParcelas(stintId: string): Promise<Parcela[]> {
  const { data } = await db
    .from("transfer_parcelas")
    .select("*")
    .eq("stint_id", stintId)
    .order("numero", { ascending: true });
  return (data ?? []) as Parcela[];
}

export async function listarChegadasPendentes(stintId: string): Promise<ChegadaPendente[]> {
  const { data } = await db
    .from("transfers")
    .select("id, clube_contraparte, inicio_tipo, data_inicio, jogador_pendente")
    .eq("stint_id", stintId)
    .eq("chegada_status", "pendente")
    .order("data_inicio", { ascending: true, nullsFirst: false });
  return (data ?? []) as ChegadaPendente[];
}

/** Coloca no elenco os jogadores das chegadas informadas e marca a transferência como concluída. */
async function efetivarChegadas(saveId: string, stintId: string, lista: ChegadaPendente[]) {
  const nomes: string[] = [];
  for (const c of lista) {
    const jp = c.jogador_pendente;
    if (!jp?.payload) continue;
    let playerId: string | null = null;
    if (jp.retorno_id) {
      const { error } = await db
        .from("players")
        .update({
          ...jp.payload,
          ativo: true,
          categoria: "principal",
          data_saida: null,
          motivo_saida: null,
          clube_destino: null,
          transfer_saida_id: null,
        })
        .eq("id", jp.retorno_id)
        .eq("stint_id", stintId);
      if (!error) playerId = jp.retorno_id;
    } else {
      const { data, error } = await db
        .from("players")
        .insert({
          save_id: saveId,
          stint_id: stintId,
          categoria: "principal",
          criado_via: "transferencia",
          ...jp.payload,
        })
        .select("id")
        .maybeSingle();
      if (!error && data) playerId = data.id as string;
    }
    if (!playerId) continue;
    await db
      .from("transfers")
      .update({ player_id: playerId, chegada_status: "concluida" })
      .eq("id", c.id);
    nomes.push(jp.nome);
  }
  return { ativados: nomes.length, nomes };
}

/** Chegadas da próxima janela cuja data de abertura já chegou no calendário da carreira. */
export async function ativarChegadasPorData(saveId: string, stintId: string, dataAtual: string) {
  if (!stintId) return { ativados: 0, nomes: [] as string[] };
  const pendentes = await listarChegadasPendentes(stintId);
  const devidas = pendentes.filter(
    (c) => c.inicio_tipo === "proxima_janela" && c.data_inicio && c.data_inicio <= dataAtual,
  );
  return efetivarChegadas(saveId, stintId, devidas);
}

/** Chegadas marcadas para a próxima temporada: entram quando a nova temporada começa. */
export async function ativarChegadasDeTemporada(saveId: string, stintId: string) {
  const pendentes = await listarChegadasPendentes(stintId);
  return efetivarChegadas(
    saveId,
    stintId,
    pendentes.filter((c) => c.inicio_tipo === "proxima_temporada"),
  );
}

/** Antecipa a chegada de uma contratação agendada (botão "Chegar agora"). */
export async function ativarChegadaAgora(saveId: string, stintId: string, transferId: string) {
  const pendentes = await listarChegadasPendentes(stintId);
  return efetivarChegadas(
    saveId,
    stintId,
    pendentes.filter((c) => c.id === transferId),
  );
}

/** Na virada de temporada, liquida a próxima parcela pendente de cada transferência parcelada. */
export async function liquidarParcelasDaTemporada(
  stintId: string,
  novaSeasonId: string | null,
) {
  const { data } = await db
    .from("transfer_parcelas")
    .select("*")
    .eq("stint_id", stintId)
    .eq("status", "pendente")
    .order("numero", { ascending: true });
  const proxima = new Map<string, Parcela>();
  for (const p of (data ?? []) as Parcela[]) {
    if (!proxima.has(p.transfer_id)) proxima.set(p.transfer_id, p);
  }
  let pagar = 0;
  let receber = 0;
  const hoje = new Date().toISOString().slice(0, 10);
  for (const p of proxima.values()) {
    const { error } = await db
      .from("transfer_parcelas")
      .update({ status: "liquidada", season_liquidacao_id: novaSeasonId, liquidada_em: hoje })
      .eq("id", p.id);
    if (error) continue;
    if (p.direcao === "pagar") pagar += Number(p.valor);
    else receber += Number(p.valor);
  }
  return { qtd: proxima.size, pagar, receber };
}

/**
 * Ajuste do resumo financeiro de uma temporada: nas transferências parceladas só o valor à vista
 * pertence à temporada em que foram feitas; as parcelas entram na temporada em que são debitadas.
 */
export async function ajusteFinanceiroParcelado(stintId: string, seasonId: string) {
  const [{ data: ts }, { data: ps }] = await Promise.all([
    db
      .from("transfers")
      .select("tipo, valor, parcelado, valor_a_vista")
      .eq("stint_id", stintId)
      .eq("season_id", seasonId)
      .eq("parcelado", true),
    db
      .from("transfer_parcelas")
      .select("direcao, valor")
      .eq("stint_id", stintId)
      .eq("season_liquidacao_id", seasonId)
      .eq("status", "liquidada"),
  ]);
  let entradas = 0;
  let saidas = 0;
  for (const t of (ts ?? []) as { tipo: string; valor: number | null; valor_a_vista: number | null }[]) {
    const parteParcelada = Number(t.valor ?? 0) - Number(t.valor_a_vista ?? 0);
    if (t.tipo === "entrada") entradas -= parteParcelada;
    else saidas -= parteParcelada;
  }
  for (const p of (ps ?? []) as { direcao: string; valor: number }[]) {
    if (p.direcao === "pagar") entradas += Number(p.valor);
    else saidas += Number(p.valor);
  }
  return { entradas, saidas };
}
