import { casarJogadores } from "@/lib/partida-foto";
import { colunasDosAtributos, atributosDaLinha, temAtributos, type Atributos } from "@/lib/atributos-jogador";
import { db } from "@/lib/transferencias-futuras";

/**
 * Elenco pré-estabelecido por clube (EA SPORTS FC 27).
 * Dados vêm de /elencos.json (pasta public/), gerado a partir do dataset do Kaggle.
 * O arquivo é baixado uma única vez e fica em cache na memória.
 * Valor de mercado e salário não existem no dataset: ficam vazios para edição.
 */

type Linha = [
  nome: string,
  nacionalidade: string,
  posicao_principal: string,
  posicoes_secundarias: string[],
  overall: number,
  idade: number | null,
  playstyle: string,
  ritmo?: number,
  finalizacao?: number,
  passe?: number,
  drible?: number,
  defesa?: number,
  fisico?: number,
];

type Catalogo = { v: number; fonte: string; clubes: Record<string, Linha[]> };

export type JogadorPadrao = {
  nome: string;
  nacionalidade: string;
  posicao_principal: string;
  posicoes_secundarias: string[];
  overall: string;
  idade: string;
  playstyle: string;
  atributos: Atributos;
};

let cache: Promise<Catalogo> | null = null;

function carregarCatalogo(): Promise<Catalogo> {
  if (!cache) {
    cache = fetch("/elencos.json")
      .then((r) => {
        if (!r.ok) throw new Error("Catálogo de elencos indisponível.");
        return r.json() as Promise<Catalogo>;
      })
      .catch((e) => {
        cache = null; // permite tentar de novo
        throw e;
      });
  }
  return cache;
}

function normalizar(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Retorna o elenco padrão do clube, ou null se o clube não estiver no catálogo. */
export async function elencoPadraoDoClube(nomeClube: string): Promise<JogadorPadrao[] | null> {
  const cat = await carregarCatalogo();
  let linhas = cat.clubes[nomeClube];
  if (!linhas) {
    const alvo = normalizar(nomeClube);
    const chave = Object.keys(cat.clubes).find((k) => normalizar(k) === alvo);
    if (chave) linhas = cat.clubes[chave];
  }
  if (!linhas || linhas.length === 0) return null;
  return linhas.map(([nome, nacionalidade, pos, sec, overall, idade, playstyle, ritmo, finalizacao, passe, drible, defesa, fisico]) => ({
    nome,
    nacionalidade,
    posicao_principal: pos,
    posicoes_secundarias: sec,
    overall: String(overall),
    idade: idade == null ? "" : String(idade),
    playstyle,
    atributos: {
      ritmo: ritmo ?? null,
      finalizacao: finalizacao ?? null,
      passe: passe ?? null,
      drible: drible ?? null,
      defesa: defesa ?? null,
      fisico: fisico ?? null,
    },
  }));
}

/**
 * Preenche os atributos dos jogadores que já estão no elenco, pelo nome, com os dados do EA FC 27.
 * Só mexe em quem ainda não tem atributos.
 */
export async function importarAtributosDoCatalogo(
  nomeClube: string,
  jogadores: { id: string; nome: string; posicao_principal: string | null }[] &
    Record<string, unknown>[],
): Promise<{ atualizados: number; semCorrespondencia: string[] } | null> {
  const padrao = await elencoPadraoDoClube(nomeClube);
  if (!padrao) return null;
  const alvo = (jogadores as Record<string, unknown>[]).filter(
    (j) => !temAtributos(atributosDaLinha(j)),
  ) as unknown as { id: string; nome: string; posicao_principal: string | null }[];
  const casados = casarJogadores(
    padrao.map((p) => p.nome),
    alvo,
  );
  let atualizados = 0;
  await Promise.all(
    padrao.map(async (p) => {
      const jogador = casados.get(p.nome);
      if (!jogador) return;
      const cols = colunasDosAtributos(p.atributos);
      if (Object.keys(cols).length === 0) return;
      const { error } = await db.from("players").update(cols).eq("id", jogador.id);
      if (!error) atualizados++;
    }),
  );
  const usados = new Set([...casados.values()].map((j) => j.id));
  return { atualizados, semCorrespondencia: alvo.filter((j) => !usados.has(j.id)).map((j) => j.nome) };
}
