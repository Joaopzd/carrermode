import { db } from "@/lib/transferencias-futuras";

export type PartidaCarreira = {
  id: string;
  stint_id: string | null;
  data_hora: string | null;
  criado_em: string | null;
  placar_time: number | null;
  placar_adversario: number | null;
  formacao: string | null;
};

export type ResumoJogos = {
  jogos: number;
  vitorias: number;
  empates: number;
  derrotas: number;
  golsPro: number;
  golsContra: number;
  pontos: number;
  /** Pontos por jogo. */
  ppg: number;
  /** Pontos conquistados sobre os disputados (0 a 100). */
  aproveitamento: number;
};

export type MelhorFase = {
  jogos: number;
  vitorias: number;
  empates: number;
  derrotas: number;
  pontos: number;
  ppg: number;
  /** Passagem em que a fase terminou. */
  stintId: string | null;
};

export type UsoFormacao = { formacao: string; jogos: number; pct: number };

export type JogadorDestaque = {
  id: string;
  nome: string;
  overall: number;
  posicao: string | null;
};

export type Passagem = {
  id: string;
  clubeNome: string | null;
  escudo: string | null;
  ligaNome: string | null;
  status: string;
  motivoSaida: string | null;
  periodo: string;
  resumo: ResumoJogos;
  formacoes: UsoFormacao[];
  destaques: JogadorDestaque[];
  titulos: string[];
};

export type Treinador = {
  id: string | null;
  nome: string;
  nacionalidade: string | null;
  estiloTatico: string | null;
  fotoUrl: string | null;
};

export type DadosTreinador = {
  treinador: Treinador;
  carreira: ResumoJogos;
  melhorFase: MelhorFase | null;
  maiorSequenciaVitorias: number;
  formacoes: UsoFormacao[];
  passagens: Passagem[];
  totalTitulos: number;
};

const chaveTempo = (p: PartidaCarreira) => p.data_hora ?? p.criado_em ?? "";

export function resumir(partidas: PartidaCarreira[]): ResumoJogos {
  let v = 0;
  let e = 0;
  let d = 0;
  let gp = 0;
  let gc = 0;
  for (const p of partidas) {
    const a = p.placar_time ?? 0;
    const b = p.placar_adversario ?? 0;
    gp += a;
    gc += b;
    if (a > b) v++;
    else if (a < b) d++;
    else e++;
  }
  const jogos = partidas.length;
  const pontos = v * 3 + e;
  return {
    jogos,
    vitorias: v,
    empates: e,
    derrotas: d,
    golsPro: gp,
    golsContra: gc,
    pontos,
    ppg: jogos ? pontos / jogos : 0,
    aproveitamento: jogos ? (pontos / (jogos * 3)) * 100 : 0,
  };
}

/** Melhor sequência de até `janela` jogos seguidos, medida em pontos (precisa de ao menos 5 jogos). */
export function melhorFase(partidas: PartidaCarreira[], janela = 10): MelhorFase | null {
  const ord = [...partidas].sort((a, b) => chaveTempo(a).localeCompare(chaveTempo(b)));
  if (ord.length < 5) return null;
  const w = Math.min(janela, ord.length);
  let melhor: MelhorFase | null = null;
  for (let i = 0; i + w <= ord.length; i++) {
    const fatia = ord.slice(i, i + w);
    const r = resumir(fatia);
    if (!melhor || r.pontos >= melhor.pontos) {
      melhor = {
        jogos: w,
        vitorias: r.vitorias,
        empates: r.empates,
        derrotas: r.derrotas,
        pontos: r.pontos,
        ppg: r.ppg,
        stintId: fatia[fatia.length - 1]?.stint_id ?? null,
      };
    }
  }
  return melhor;
}

export function maiorSequenciaVitorias(partidas: PartidaCarreira[]): number {
  const ord = [...partidas].sort((a, b) => chaveTempo(a).localeCompare(chaveTempo(b)));
  let atual = 0;
  let melhor = 0;
  for (const p of ord) {
    if ((p.placar_time ?? 0) > (p.placar_adversario ?? 0)) {
      atual++;
      melhor = Math.max(melhor, atual);
    } else atual = 0;
  }
  return melhor;
}

export function formacoesMaisUsadas(partidas: PartidaCarreira[]): UsoFormacao[] {
  const contagem = new Map<string, number>();
  for (const p of partidas) {
    const f = p.formacao?.trim();
    if (f) contagem.set(f, (contagem.get(f) ?? 0) + 1);
  }
  const total = [...contagem.values()].reduce((a, b) => a + b, 0);
  return [...contagem.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([formacao, jogos]) => ({ formacao, jogos, pct: total ? (jogos / total) * 100 : 0 }));
}

type Relacionado<T> = T | T[] | null | undefined;
const um = <T,>(v: Relacionado<T>): T | null => (Array.isArray(v) ? (v[0] ?? null) : (v ?? null));

export async function carregarTreinador(saveId: string): Promise<DadosTreinador> {
  const colunas = "id, stint_id, data_hora, criado_em, placar_time, placar_adversario";
  const consultaPartidas = (cols: string) =>
    db.from("matches").select(cols).eq("save_id", saveId).eq("status", "finalizada");

  const [managerRes, stintsRes, seasonsRes, playersRes, trofeusRes] = await Promise.all([
    db.from("managers").select("*").eq("save_id", saveId).maybeSingle(),
    db
      .from("stints")
      .select(
        "id, status, motivo_saida, data_inicio, data_fim, escudo_url, criado_em, clubs(nome, escudo_url), leagues(nome)",
      )
      .eq("save_id", saveId)
      .order("criado_em", { ascending: true }),
    db
      .from("seasons")
      .select("id, nome, stint_id, criado_em")
      .eq("save_id", saveId)
      .order("criado_em", { ascending: true }),
    db
      .from("players")
      .select("id, nome, overall, posicao_principal, stint_id")
      .eq("save_id", saveId)
      .not("overall", "is", null),
    db
      .from("trophy_gallery")
      .select("id, stint_id, competition_id, season_id")
      .eq("save_id", saveId)
      .eq("e_meu_clube_campeao", true),
  ]);

  // A coluna "formacao" pode ainda não existir: tenta com ela e volta sem se falhar.
  let partidasRes = await consultaPartidas(`${colunas}, formacao`);
  if (partidasRes.error) partidasRes = await consultaPartidas(colunas);
  const partidas = ((partidasRes.data ?? []) as unknown as Partial<PartidaCarreira>[]).map(
    (p) => ({ formacao: null, ...p }) as PartidaCarreira,
  );

  const compIds = [...new Set((trofeusRes.data ?? []).map((t: { competition_id: string | null }) => t.competition_id).filter(Boolean))] as string[];
  const { data: comps } = compIds.length
    ? await db.from("competitions").select("id, nome").in("id", compIds)
    : { data: [] as { id: string; nome: string }[] };
  const nomeComp = new Map((comps ?? []).map((c: { id: string; nome: string }) => [c.id, c.nome]));
  const nomeSeason = new Map(
    (seasonsRes.data ?? []).map((s: { id: string; nome: string }) => [s.id, s.nome]),
  );

  const m = managerRes.data as {
    id: string;
    nome: string | null;
    sobrenome: string | null;
    nome_usado: string | null;
    nacionalidade: string | null;
    estilo_tatico: string | null;
    foto_url?: string | null;
  } | null;
  const treinador: Treinador = {
    id: m?.id ?? null,
    nome:
      m?.nome_usado?.trim() || [m?.nome, m?.sobrenome].filter(Boolean).join(" ") || "Treinador",
    nacionalidade: m?.nacionalidade ?? null,
    estiloTatico: m?.estilo_tatico ?? null,
    fotoUrl: m?.foto_url ?? null,
  };

  const passagens: Passagem[] = (stintsRes.data ?? []).map(
    (s: {
      id: string;
      status: string;
      motivo_saida: string | null;
      data_inicio: string;
      data_fim: string | null;
      escudo_url: string | null;
      clubs: Relacionado<{ nome: string; escudo_url: string | null }>;
      leagues: Relacionado<{ nome: string }>;
    }) => {
      const clube = um(s.clubs);
      const seasons = (seasonsRes.data ?? []).filter(
        (x: { stint_id: string }) => x.stint_id === s.id,
      ) as { nome: string }[];
      const primeira = seasons[0]?.nome;
      const ultima = seasons[seasons.length - 1]?.nome;
      const periodo =
        primeira && ultima
          ? primeira === ultima
            ? primeira
            : `${primeira} – ${ultima}`
          : `${s.data_inicio.slice(0, 4)} – ${s.data_fim ? s.data_fim.slice(0, 4) : "hoje"}`;
      const doClube = partidas.filter((p) => p.stint_id === s.id);
      const destaques = ((playersRes.data ?? []) as {
        id: string;
        nome: string;
        overall: number;
        posicao_principal: string | null;
        stint_id: string;
      }[])
        .filter((p) => p.stint_id === s.id)
        .sort((a, b) => b.overall - a.overall)
        .slice(0, 3)
        .map((p) => ({ id: p.id, nome: p.nome, overall: p.overall, posicao: p.posicao_principal }));
      const titulos = (trofeusRes.data ?? [])
        .filter((t: { stint_id: string | null }) => t.stint_id === s.id)
        .map(
          (t: { competition_id: string | null; season_id: string | null }) =>
            `${nomeComp.get(t.competition_id ?? "") ?? "Título"}${
              t.season_id && nomeSeason.get(t.season_id) ? ` · ${nomeSeason.get(t.season_id)}` : ""
            }`,
        );
      return {
        id: s.id,
        clubeNome: clube?.nome ?? null,
        escudo: s.escudo_url ?? clube?.escudo_url ?? null,
        ligaNome: um(s.leagues)?.nome ?? null,
        status: s.status,
        motivoSaida: s.motivo_saida,
        periodo,
        resumo: resumir(doClube),
        formacoes: formacoesMaisUsadas(doClube),
        destaques,
        titulos,
      };
    },
  );

  return {
    treinador,
    carreira: resumir(partidas),
    melhorFase: melhorFase(partidas),
    maiorSequenciaVitorias: maiorSequenciaVitorias(partidas),
    formacoes: formacoesMaisUsadas(partidas),
    passagens,
    totalTitulos: passagens.reduce((a, p) => a + p.titulos.length, 0),
  };
}

/** Recorta a foto em quadrado e reduz para 320 px (JPEG), pronta para guardar no banco. */
export function prepararFoto(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const leitor = new FileReader();
    leitor.onerror = () => reject(new Error("Não foi possível ler o arquivo."));
    leitor.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Imagem inválida."));
      img.onload = () => {
        const lado = Math.min(img.width, img.height);
        const tam = 320;
        const canvas = document.createElement("canvas");
        canvas.width = tam;
        canvas.height = tam;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Navegador sem suporte a imagem."));
        ctx.drawImage(
          img,
          (img.width - lado) / 2,
          (img.height - lado) / 2,
          lado,
          lado,
          0,
          0,
          tam,
          tam,
        );
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.src = String(leitor.result);
    };
    leitor.readAsDataURL(file);
  });
}

export async function salvarFotoTreinador(managerId: string, fotoUrl: string | null) {
  const { error } = await db.from("managers").update({ foto_url: fotoUrl }).eq("id", managerId);
  if (error) throw error;
}
