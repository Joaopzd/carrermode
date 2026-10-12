import { supabase } from "@/integrations/supabase/client";

export type EmprestimoRow = {
  id: string;
  tipo: string;
  modalidade: string | null;
  player_id: string | null;
  clube_contraparte: string | null;
  valor: number | null;
  duracao_emprestimo: string | null;
  janela: string | null;
  data: string;
  season_id?: string | null;
  tem_opcao_compra?: boolean | null;
  valor_opcao_compra?: number | null;
  obrigacao_compra?: boolean | null;
  status_opcao?: string | null;
};

const hojeISO = () => new Date().toISOString().slice(0, 10);

/** Um empréstimo segue ativo enquanto não for encerrado (compra exercida ou retorno). */
export function emprestimoAtivo(t: {
  modalidade: string | null;
  status_opcao?: string | null;
}): boolean {
  if (t.modalidade !== "emprestimo") return false;
  const s = t.status_opcao ?? "nao_aplicavel";
  return s === "pendente" || s === "nao_aplicavel";
}

/** Busca todos os empréstimos ainda ativos do save, de qualquer temporada. */
export async function carregarEmprestimosAtivos(
  saveId: string,
  stintId?: string | null,
): Promise<EmprestimoRow[]> {
  if (!stintId) return [];
  const base = supabase.from("transfers").select("*");
  const { data } = await base.eq("stint_id", stintId)
    .eq("modalidade", "emprestimo")
    .in("status_opcao", ["pendente", "nao_aplicavel"])
    .order("data", { ascending: false });
  return (data ?? []) as unknown as EmprestimoRow[];
}

/**
 * Encerra um empréstimo devolvendo o jogador:
 * - saída: o atleta emprestado volta ao elenco;
 * - entrada: o atleta cedido por outro clube deixa o elenco.
 */
export async function encerrarEmprestimo(t: EmprestimoRow) {
  await supabase.from("transfers").update({ status_opcao: "nao_exercida" }).eq("id", t.id);
  if (!t.player_id) return;
  if (t.tipo === "entrada") {
    await supabase
      .from("players")
      .update({
        ativo: false,
        capitao: false,
        status: "Transferido",
        data_saida: hojeISO(),
        motivo_saida: "emprestimo",
        clube_destino: t.clube_contraparte,
      })
      .eq("id", t.player_id);
  } else {
    await supabase
      .from("players")
      .update({
        ativo: true,
        status: "Liberado",
        data_saida: null,
        motivo_saida: null,
        clube_destino: null,
        transfer_saida_id: null,
      })
      .eq("id", t.player_id);
  }
}

/** Efetiva a compra de um jogador emprestado, gerando a transferência definitiva. */
export async function efetivarCompraEmprestimo(
  saveId: string,
  seasonId: string | null,
  t: EmprestimoRow,
  janela: "verao" | "inverno",
  stintId?: string | null,
) {
  if (!stintId) throw new Error("Nenhuma passagem ativa encontrada.");
  const hoje = hojeISO();
  const { error } = await supabase.from("transfers").insert({
    save_id: saveId,
    stint_id: stintId ?? null,
    season_id: seasonId,
    tipo: t.tipo,
    modalidade: "definitiva",
    player_id: t.player_id,
    clube_contraparte: t.clube_contraparte,
    valor: t.valor_opcao_compra ?? null,
    janela,
    data: new Date(`${hoje}T12:00:00`).toISOString(),
    transfer_origem_emprestimo_id: t.id,
  });
  if (error) throw error;
  await supabase.from("transfers").update({ status_opcao: "exercida" }).eq("id", t.id);
  if (t.player_id) {
    if (t.tipo === "saida") {
      await supabase
        .from("players")
        .update({ motivo_saida: "transferencia_definitiva" })
        .eq("id", t.player_id);
    } else {
      await supabase
        .from("players")
        .update({ ativo: true, status: "Liberado", data_saida: null, motivo_saida: null })
        .eq("id", t.player_id);
    }
  }
}

/**
 * Ao encerrar a temporada, resolve os empréstimos que venceram:
 * obrigação de compra vira transferência definitiva, o resto devolve o jogador.
 */
export async function resolverEmprestimosNoFimDaTemporada(
  saveId: string,
  seasonId: string,
  janela: "verao" | "inverno",
  stintId?: string | null,
): Promise<{ devolvidos: number; comprados: number }> {
  const ativos = (await carregarEmprestimosAtivos(saveId, stintId)).filter(
    (t) => t.season_id === seasonId,
  );
  let devolvidos = 0;
  let comprados = 0;
  for (const t of ativos) {
    if (t.obrigacao_compra) {
      await efetivarCompraEmprestimo(saveId, seasonId, t, janela, stintId);
      comprados++;
    } else {
      await encerrarEmprestimo(t);
      devolvidos++;
    }
  }
  return { devolvidos, comprados };
}
