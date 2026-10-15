import { db, ajusteFinanceiroParcelado } from "@/lib/transferencias-futuras";

/** Orçamento (caixa) com que a temporada começou, informado em Configurações. */
export async function carregarOrcamentoInicial(seasonId: string | null): Promise<number | null> {
  if (!seasonId) return null;
  const { data } = await db
    .from("seasons")
    .select("orcamento_inicial")
    .eq("id", seasonId)
    .maybeSingle();
  const v = (data as { orcamento_inicial: number | null } | null)?.orcamento_inicial;
  return v == null ? null : Number(v);
}

export async function salvarOrcamentoInicial(seasonId: string, valor: number | null) {
  const { error } = await db.from("seasons").update({ orcamento_inicial: valor }).eq("id", seasonId);
  if (error) throw error;
}

export type ResumoCaixa = {
  orcamentoInicial: number | null;
  /** Vendas: à vista + parcelas recebidas na temporada. */
  receitas: number;
  /** Compras: à vista + parcelas pagas na temporada. */
  gastos: number;
  /** Orçamento inicial + receitas − gastos; nulo enquanto o orçamento não for definido. */
  caixa: number | null;
};

export async function calcularCaixa(stintId: string, seasonId: string): Promise<ResumoCaixa> {
  const [orcamentoInicial, { data: ts }, ajuste] = await Promise.all([
    carregarOrcamentoInicial(seasonId),
    db
      .from("transfers")
      .select("tipo, valor")
      .eq("stint_id", stintId)
      .eq("season_id", seasonId),
    ajusteFinanceiroParcelado(stintId, seasonId),
  ]);
  let gastos = 0;
  let receitas = 0;
  for (const t of (ts ?? []) as { tipo: string; valor: number | null }[]) {
    const v = Number(t.valor ?? 0);
    if (t.tipo === "entrada") gastos += v;
    else receitas += v;
  }
  // Nas transferências parceladas só o valor à vista entra agora; parcelas entram quando debitadas.
  gastos += ajuste.entradas;
  receitas += ajuste.saidas;
  return {
    orcamentoInicial,
    receitas,
    gastos,
    caixa: orcamentoInicial == null ? null : orcamentoInicial + receitas - gastos,
  };
}
