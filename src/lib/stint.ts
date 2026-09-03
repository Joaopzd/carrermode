import { supabase } from "@/integrations/supabase/client";

export type StintStatus = "ativa" | "encerrada";

export const MOTIVOS_SAIDA_STINT = [
  { valor: "demitido", rotulo: "Demitido" },
  { valor: "pediu_para_sair", rotulo: "Pedi para sair" },
  { valor: "fim_de_contrato", rotulo: "Fim de contrato" },
  { valor: "aposentou", rotulo: "Aposentadoria" },
] as const;

export type MotivoSaidaStint = (typeof MOTIVOS_SAIDA_STINT)[number]["valor"];

export function rotuloMotivoStint(m: string | null | undefined) {
  return MOTIVOS_SAIDA_STINT.find((x) => x.valor === m)?.rotulo ?? "—";
}

export type Stint = {
  id: string;
  save_id: string;
  league_id: string | null;
  club_id: string | null;
  data_inicio: string;
  data_fim: string | null;
  status: StintStatus;
  motivo_saida: MotivoSaidaStint | null;
};

/** Retorna a passagem ativa da save, criando uma a partir da própria save se não existir. */
export async function garantirStintAtiva(saveId: string): Promise<Stint | null> {
  const { data } = await supabase
    .from("stints")
    .select("*")
    .eq("save_id", saveId)
    .eq("status", "ativa")
    .order("criado_em", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (data) return data as unknown as Stint;

  const { data: save } = await supabase
    .from("saves")
    .select("id, league_id, club_id, criado_em")
    .eq("id", saveId)
    .maybeSingle();
  if (!save) return null;

  const { data: criada } = await supabase
    .from("stints")
    .insert({
      save_id: saveId,
      league_id: (save as { league_id: string | null }).league_id,
      club_id: (save as { club_id: string | null }).club_id,
      data_inicio: String((save as { criado_em: string }).criado_em).slice(0, 10),
      status: "ativa",
    })
    .select("*")
    .single();

  return (criada as unknown as Stint) ?? null;
}

/** Encerra a passagem atual registrando o motivo da saída. */
export async function encerrarStint(stintId: string, motivo: MotivoSaidaStint) {
  const { error } = await supabase
    .from("stints")
    .update({
      status: "encerrada",
      motivo_saida: motivo,
      data_fim: new Date().toISOString().slice(0, 10),
    })
    .eq("id", stintId);
  if (error) throw error;
}

/** Cria uma nova passagem ativa para a save. */
export async function criarStint(saveId: string, leagueId: string, clubId: string) {
  const { data, error } = await supabase
    .from("stints")
    .insert({
      save_id: saveId,
      league_id: leagueId,
      club_id: clubId,
      data_inicio: new Date().toISOString().slice(0, 10),
      status: "ativa",
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as unknown as Stint;
}

/** Uma passagem é "vazia" quando ainda não tem elenco nem partidas registradas. */
export async function stintSemDados(stintId: string): Promise<boolean> {
  const [players, matches] = await Promise.all([
    supabase.from("players").select("id", { count: "exact", head: true }).eq("stint_id", stintId),
    supabase.from("matches").select("id", { count: "exact", head: true }).eq("stint_id", stintId),
  ]);
  return (players.count ?? 0) === 0 && (matches.count ?? 0) === 0;
}

/** Aplica o filtro de escopo: passagem atual quando houver, senão a carreira inteira. */
export function escopo<T extends { eq: (coluna: string, valor: string) => T }>(
  q: T,
  saveId: string,
  stintId?: string | null,
): T {
  return stintId ? q.eq("stint_id", stintId) : q.eq("save_id", saveId);
}
