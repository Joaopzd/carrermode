import { db } from "@/lib/transferencias-futuras";
import { normalizarNome } from "@/lib/partida-foto";

/**
 * Atributos principais do jogador (as seis "caras" do EA FC).
 * Para goleiros, os mesmos seis campos guardam Mergulho, Manejo, Chute, Reflexos,
 * Velocidade e Posicionamento, como o dataset do jogo faz.
 */
export const CHAVES_ATRIBUTO = ["ritmo", "finalizacao", "passe", "drible", "defesa", "fisico"] as const;
export type ChaveAtributo = (typeof CHAVES_ATRIBUTO)[number];
export type Atributos = Record<ChaveAtributo, number | null>;

export const COLUNA_ATRIBUTO: Record<ChaveAtributo, string> = {
  ritmo: "atrib_ritmo",
  finalizacao: "atrib_finalizacao",
  passe: "atrib_passe",
  drible: "atrib_drible",
  defesa: "atrib_defesa",
  fisico: "atrib_fisico",
};

const LINHA: [string, string][] = [
  ["RIT", "Ritmo"],
  ["FIN", "Finalização"],
  ["PAS", "Passe"],
  ["DRI", "Drible"],
  ["DEF", "Defesa"],
  ["FÍS", "Físico"],
];
const GOLEIRO: [string, string][] = [
  ["MER", "Mergulho"],
  ["MAN", "Manejo"],
  ["CHU", "Chute"],
  ["REF", "Reflexos"],
  ["VEL", "Velocidade"],
  ["POS", "Posicionamento"],
];

export function rotulosAtributos(goleiro: boolean) {
  const base = goleiro ? GOLEIRO : LINHA;
  return CHAVES_ATRIBUTO.map((chave, i) => ({
    chave,
    sigla: base[i]![0],
    nome: base[i]![1],
  }));
}

export const atributosVazios = (): Atributos => ({
  ritmo: null,
  finalizacao: null,
  passe: null,
  drible: null,
  defesa: null,
  fisico: null,
});

/** Lê os seis atributos de uma linha da tabela players (ou de um objeto parecido). */
export function atributosDaLinha(row: Record<string, unknown> | null | undefined): Atributos {
  const out = atributosVazios();
  if (!row) return out;
  for (const chave of CHAVES_ATRIBUTO) {
    const v = row[COLUNA_ATRIBUTO[chave]];
    out[chave] = typeof v === "number" && Number.isFinite(v) ? v : null;
  }
  return out;
}

export const temAtributos = (a: Partial<Atributos> | null | undefined): boolean =>
  !!a && CHAVES_ATRIBUTO.some((c) => a[c] != null);

/** Colunas do banco só para os atributos preenchidos (não mexe nos vazios). */
export function colunasDosAtributos(a: Partial<Atributos>): Record<string, number> {
  const cols: Record<string, number> = {};
  for (const chave of CHAVES_ATRIBUTO) {
    const v = a[chave];
    if (v != null) cols[COLUNA_ATRIBUTO[chave]] = v;
  }
  return cols;
}

/** Depois de criar uma passagem: grava os atributos dos jogadores pelo nome. */
export async function salvarAtributosPorNome(
  stintId: string,
  lista: { nome: string; atributos: Atributos }[],
): Promise<number> {
  const { data } = await db.from("players").select("id, nome").eq("stint_id", stintId);
  const porNome = new Map(
    ((data ?? []) as { id: string; nome: string }[]).map((p) => [normalizarNome(p.nome), p.id]),
  );
  let atualizados = 0;
  await Promise.all(
    lista.map(async (item) => {
      const id = porNome.get(normalizarNome(item.nome));
      const cols = colunasDosAtributos(item.atributos);
      if (!id || Object.keys(cols).length === 0) return;
      const { error } = await db.from("players").update(cols).eq("id", id);
      if (!error) atualizados++;
    }),
  );
  return atualizados;
}
