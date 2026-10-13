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
  return linhas.map(([nome, nacionalidade, pos, sec, overall, idade, playstyle]) => ({
    nome,
    nacionalidade,
    posicao_principal: pos,
    posicoes_secundarias: sec,
    overall: String(overall),
    idade: idade == null ? "" : String(idade),
    playstyle,
  }));
}
