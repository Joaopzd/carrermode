/**
 * Preenchimento rápido de partida a partir de fotos das telas do jogo.
 * Este módulo roda no navegador: reduz as imagens e converte a leitura da IA
 * (ver partida-foto.functions.ts) nos campos do formulário de fechar partida.
 */

export type EstatisticasLado = {
  posse_pct: number | null;
  recuperacao_segundos: number | null;
  finalizacoes: number | null;
  gols_esperados: number | null;
  passes: number | null;
  precisao_passes_pct: number | null;
  divididas_ganhas: number | null;
  desarmes: number | null;
  defesas: number | null;
  cartoes_amarelos: number | null;
  cartoes_vermelhos: number | null;
};

export type LadoPartida = {
  nome: string | null;
  gols: number | null;
  stats: EstatisticasLado;
};

export type JogadorLido = {
  nome: string;
  /** Código mostrado no jogo (PE, ATA, MCD, GL, RES...). */
  posicao: string | null;
  /** Nota final (NF). Nulo quando aparece N/D: o jogador não entrou. */
  nota: number | null;
  gols: number | null;
  assistencias: number | null;
};

export type ExtracaoPartida = {
  esquerda: LadoPartida;
  direita: LadoPartida;
  jogadores: JogadorLido[];
  melhor_em_campo: string | null;
  observacoes: string | null;
};

// ---------- imagem ----------
/** Reduz a foto (lado maior = 1600 px) e devolve um data URL JPEG leve para enviar à IA. */
export function reduzirImagem(file: File, maxLado = 1600): Promise<string> {
  return new Promise((resolve, reject) => {
    const leitor = new FileReader();
    leitor.onerror = () => reject(new Error("Não foi possível ler a imagem."));
    leitor.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Imagem inválida."));
      img.onload = () => {
        const escala = Math.min(1, maxLado / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * escala);
        canvas.height = Math.round(img.height * escala);
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Navegador sem suporte a imagem."));
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };
      img.src = String(leitor.result);
    };
    leitor.readAsDataURL(file);
  });
}

// ---------- nomes ----------
const TROCAS: Record<string, string> = {
  ð: "d",
  đ: "d",
  þ: "th",
  ø: "o",
  æ: "ae",
  œ: "oe",
  ł: "l",
  ß: "ss",
  ı: "i",
};

export function normalizarNome(s: string): string {
  const base = s
    .toLowerCase()
    .replace(/[ðđþøæœłßı]/g, (c) => TROCAS[c] ?? c)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  return base
    .replace(/[^a-z\s-]/g, " ")
    .replace(/-/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function distancia(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (!m) return n;
  if (!n) return m;
  let anterior = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const atual = [i];
    for (let j = 1; j <= n; j++) {
      atual[j] = Math.min(
        (anterior[j] ?? 0) + 1,
        (atual[j - 1] ?? 0) + 1,
        (anterior[j - 1] ?? 0) + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    anterior = atual;
  }
  return anterior[n] ?? 0;
}

const semelhanca = (a: string, b: string) =>
  a && b ? 1 - distancia(a, b) / Math.max(a.length, b.length) : 0;

/** Pontua o quanto um nome lido na tela ("H. Wright") combina com um nome do elenco ("Haji Wright"). */
export function pontuarNome(lido: string, doElenco: string): number {
  const a = normalizarNome(lido).split(" ").filter(Boolean);
  const b = normalizarNome(doElenco).split(" ").filter(Boolean);
  if (a.length === 0 || b.length === 0) return 0;

  const inicial = a.length > 1 && (a[0]?.length ?? 0) === 1 ? a[0] : null;
  const sobrenomeLido = (inicial ? a.slice(1) : a.length > 1 ? a.slice(1) : a).join(" ");
  const caudas = new Set<string>();
  caudas.add(b[b.length - 1] ?? "");
  caudas.add(b[0] ?? ""); // nome único ou sobrenome antes do nome ("Djené Dakonam")
  if (b.length >= 2) caudas.add(b.slice(-2).join(" "));
  if (b.length >= 2) caudas.add(b.slice(1).join(" "));
  caudas.add(b.join(" "));

  let melhor = 0;
  for (const cauda of caudas) melhor = Math.max(melhor, semelhanca(sobrenomeLido, cauda));
  if (inicial) {
    melhor += b[0]?.startsWith(inicial) ? 0.12 : -0.3;
  } else if (a.length > 1) {
    melhor = Math.max(melhor, semelhanca(a.join(" "), b.join(" ")));
  }
  return melhor;
}

type ElencoItem = { id: string; nome: string; posicao_principal: string | null };

/** Liga cada nome lido a um jogador do elenco (cada jogador no máximo uma vez). */
export function casarJogadores(
  nomes: string[],
  elenco: ElencoItem[],
  limite = 0.8,
): Map<string, ElencoItem> {
  const pares: { nome: string; jogador: ElencoItem; pontos: number }[] = [];
  for (const nome of nomes) {
    for (const jogador of elenco) {
      const pontos = pontuarNome(nome, jogador.nome);
      if (pontos >= limite) pares.push({ nome, jogador, pontos });
    }
  }
  pares.sort((x, y) => y.pontos - x.pontos);
  const usadosNomes = new Set<string>();
  const usadosJogadores = new Set<string>();
  const resultado = new Map<string, ElencoItem>();
  for (const p of pares) {
    if (usadosNomes.has(p.nome) || usadosJogadores.has(p.jogador.id)) continue;
    usadosNomes.add(p.nome);
    usadosJogadores.add(p.jogador.id);
    resultado.set(p.nome, p.jogador);
  }
  return resultado;
}

// ---------- lado do meu clube ----------
function semelhancaClube(lido: string | null, clube: string | null | undefined): number {
  if (!lido || !clube) return 0;
  const a = normalizarNome(lido);
  const b = normalizarNome(clube);
  if (!a || !b) return 0;
  if (a.includes(b) || b.includes(a)) return 1;
  const ta = new Set(a.split(" "));
  const tb = new Set(b.split(" "));
  const comuns = [...ta].filter((t) => tb.has(t)).length;
  const jaccard = comuns / new Set([...ta, ...tb]).size;
  return Math.max(jaccard, semelhanca(a, b));
}

export type Lado = "esquerda" | "direita";

/** Descobre em qual lado da tela está o meu clube. */
export function escolherLado(
  ex: ExtracaoPartida,
  meuClube: string | null | undefined,
  adversario: string | null | undefined,
  mando: string | null | undefined,
): { lado: Lado; confiavel: boolean } {
  const e = semelhancaClube(ex.esquerda.nome, meuClube);
  const d = semelhancaClube(ex.direita.nome, meuClube);
  if (Math.max(e, d) >= 0.6 && Math.abs(e - d) >= 0.2) {
    return { lado: e > d ? "esquerda" : "direita", confiavel: true };
  }
  const ae = semelhancaClube(ex.esquerda.nome, adversario);
  const ad = semelhancaClube(ex.direita.nome, adversario);
  if (Math.max(ae, ad) >= 0.6 && Math.abs(ae - ad) >= 0.2) {
    return { lado: ae > ad ? "direita" : "esquerda", confiavel: true };
  }
  return { lado: /fora|away/i.test(mando ?? "") ? "direita" : "esquerda", confiavel: false };
}

export function outroLado(l: Lado): Lado {
  return l === "esquerda" ? "direita" : "esquerda";
}

// ---------- preenchimento do formulário ----------
export type CamposJogo = {
  placar_time: string;
  placar_adversario: string;
  posse: string;
  tempo_recuperacao: string;
  chutes: string;
  xg: string;
  passes: string;
  passes_pct: string;
  desarmes: string;
  cartoes_amarelos: string;
  cartoes_vermelhos: string;
};

export type StatPreenchida = {
  titular: boolean;
  gols: string;
  assistencias: string;
  nota: string;
  clean_sheet?: boolean;
  defesas?: string;
};

export type Preenchimento = {
  lado: Lado;
  ladoConfiavel: boolean;
  jogo: Partial<CamposJogo>;
  /** Jogadores reconhecidos, por id do elenco. */
  jogadores: Record<string, StatPreenchida>;
  mvpId: string | null;
  naoEncontrados: string[];
  adversarioLido: string | null;
};

const txt = (v: number | null | undefined) => (v == null || !Number.isFinite(v) ? undefined : String(v));

export function montarPreenchimento(args: {
  extracao: ExtracaoPartida;
  elenco: ElencoItem[];
  meuClube: string | null | undefined;
  adversario: string | null | undefined;
  mando: string | null | undefined;
  ehGoleiro: (posicao: string | null) => boolean;
  /** Força um lado (botão "inverter lados"). */
  lado?: Lado;
}): Preenchimento {
  const { extracao: ex, elenco, ehGoleiro } = args;
  const escolha = args.lado
    ? { lado: args.lado, confiavel: true }
    : escolherLado(ex, args.meuClube, args.adversario, args.mando);
  const meu = ex[escolha.lado];
  const rival = ex[outroLado(escolha.lado)];

  const jogo: Partial<CamposJogo> = {};
  const poe = <K extends keyof CamposJogo>(k: K, v: string | undefined) => {
    if (v !== undefined) jogo[k] = v as CamposJogo[K];
  };
  poe("placar_time", txt(meu.gols));
  poe("placar_adversario", txt(rival.gols));
  poe("posse", txt(meu.stats.posse_pct));
  poe("tempo_recuperacao", txt(meu.stats.recuperacao_segundos));
  poe("chutes", txt(meu.stats.finalizacoes));
  poe("xg", txt(meu.stats.gols_esperados));
  poe("passes", txt(meu.stats.passes));
  poe("passes_pct", txt(meu.stats.precisao_passes_pct));
  poe("desarmes", txt(meu.stats.desarmes ?? meu.stats.divididas_ganhas));
  poe("cartoes_amarelos", txt(meu.stats.cartoes_amarelos));
  poe("cartoes_vermelhos", txt(meu.stats.cartoes_vermelhos));

  // Só quem entrou em campo (nota diferente de N/D) é considerado.
  const jogaram = ex.jogadores.filter((j) => j.nota != null);
  const casados = casarJogadores(
    jogaram.map((j) => j.nome),
    elenco,
  );
  const jogadores: Record<string, StatPreenchida> = {};
  const naoEncontrados: string[] = [];
  const sofreuGol = (rival.gols ?? 1) > 0;
  for (const j of jogaram) {
    const achado = casados.get(j.nome);
    if (!achado) {
      naoEncontrados.push(j.nome);
      continue;
    }
    const goleiro = ehGoleiro(achado.posicao_principal);
    const defesas = txt(meu.stats.defesas);
    jogadores[achado.id] = {
      titular: (j.posicao ?? "").toUpperCase() !== "RES",
      gols: String(j.gols ?? 0),
      assistencias: String(j.assistencias ?? 0),
      nota: j.nota != null ? j.nota.toFixed(1) : "",
      ...(goleiro
        ? {
            clean_sheet: !sofreuGol && rival.gols != null,
            ...(defesas != null ? { defesas } : {}),
          }
        : {}),
    };
  }

  let mvpId: string | null = null;
  if (ex.melhor_em_campo) {
    const m = casarJogadores([ex.melhor_em_campo], elenco).get(ex.melhor_em_campo);
    mvpId = m?.id ?? null;
  }

  return {
    lado: escolha.lado,
    ladoConfiavel: escolha.confiavel,
    jogo,
    jogadores,
    mvpId,
    naoEncontrados,
    adversarioLido: rival.nome,
  };
}
