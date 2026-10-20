import { db } from "@/lib/transferencias-futuras";

export type TipoAvaliacao = "cadastro" | "avaliacao" | "fim_temporada" | "promocao";

export type Avaliacao = {
  id: string;
  player_id: string;
  season_id: string | null;
  idade: number | null;
  overall: number | null;
  potencial: number | null;
  nota: string | null;
  tipo: TipoAvaliacao;
  registrado_em: string;
};

export type JogadorBase = {
  id: string;
  nome: string;
  idade: number | null;
  overall: number | null;
  potencial: number | null;
  criado_em?: string | null;
};

export type NovaAvaliacao = {
  idade: number | null;
  overall: number | null;
  potencial: number | null;
  nota?: string | null;
};

/** Avaliações de vários jogadores, da mais antiga para a mais recente. */
export async function carregarAvaliacoes(playerIds: string[]): Promise<Avaliacao[]> {
  if (playerIds.length === 0) return [];
  const { data } = await db
    .from("player_evaluations")
    .select("*")
    .in("player_id", playerIds)
    .order("registrado_em", { ascending: true });
  return (data ?? []) as Avaliacao[];
}

/** Registra o primeiro ponto de um jogador recém-cadastrado na base. */
export async function registrarCadastro(args: {
  playerId: string;
  saveId: string;
  stintId: string | null;
  seasonId: string | null;
  idade: number | null;
  overall: number | null;
  potencial: number | null;
}) {
  const { error } = await db.from("player_evaluations").insert({
    player_id: args.playerId,
    save_id: args.saveId,
    stint_id: args.stintId,
    season_id: args.seasonId,
    idade: args.idade,
    overall: args.overall,
    potencial: args.potencial,
    tipo: "cadastro",
  });
  if (error) throw error;
}

/**
 * Salva várias avaliações de uma vez: atualiza idade, overall e potencial do jogador
 * e guarda um ponto na evolução. Se o jogador ainda não tinha nenhum ponto, guarda antes
 * os valores antigos como ponto de partida.
 */
export async function registrarAvaliacoes(args: {
  saveId: string;
  stintId: string | null;
  seasonId: string | null;
  itens: { jogador: JogadorBase; novo: NovaAvaliacao }[];
  tipo?: TipoAvaliacao;
}) {
  const { saveId, stintId, seasonId, itens, tipo = "avaliacao" } = args;
  if (itens.length === 0) return;

  const { data: existentes } = await db
    .from("player_evaluations")
    .select("player_id")
    .in(
      "player_id",
      itens.map((i) => i.jogador.id),
    );
  const jaTem = new Set(((existentes ?? []) as { player_id: string }[]).map((e) => e.player_id));

  const linhas: Record<string, unknown>[] = [];
  for (const { jogador, novo } of itens) {
    if (!jaTem.has(jogador.id)) {
      linhas.push({
        player_id: jogador.id,
        save_id: saveId,
        stint_id: stintId,
        season_id: seasonId,
        idade: jogador.idade,
        overall: jogador.overall,
        potencial: jogador.potencial,
        tipo: "cadastro",
        registrado_em: jogador.criado_em ?? new Date(Date.now() - 1000).toISOString(),
      });
    }
    linhas.push({
      player_id: jogador.id,
      save_id: saveId,
      stint_id: stintId,
      season_id: seasonId,
      idade: novo.idade,
      overall: novo.overall,
      potencial: novo.potencial,
      nota: novo.nota?.trim() || null,
      tipo,
    });
  }

  const resultados = await Promise.all(
    itens.map(({ jogador, novo }) =>
      db
        .from("players")
        .update({ idade: novo.idade, overall: novo.overall, potencial: novo.potencial })
        .eq("id", jogador.id),
    ),
  );
  const falha = resultados.find((r) => r.error);
  if (falha?.error) throw falha.error;

  const { error } = await db.from("player_evaluations").insert(linhas);
  if (error) throw error;
}

/** Guarda o retrato do jogador no dia em que sobe para o elenco principal. */
export async function registrarPromocao(args: {
  saveId: string;
  stintId: string | null;
  seasonId: string | null;
  jogador: JogadorBase;
}) {
  const { error } = await db.from("player_evaluations").insert({
    player_id: args.jogador.id,
    save_id: args.saveId,
    stint_id: args.stintId,
    season_id: args.seasonId,
    idade: args.jogador.idade,
    overall: args.jogador.overall,
    potencial: args.jogador.potencial,
    nota: "Promovido ao elenco principal",
    tipo: "promocao",
  });
  if (error) throw error;
}

/** Na virada de temporada: a base envelhece um ano e cada jovem ganha um ponto de partida. */
export async function envelhecerBase(saveId: string, stintId: string, novaSeasonId: string | null) {
  const { data } = await db
    .from("players")
    .select("id, idade, overall, potencial")
    .eq("stint_id", stintId)
    .eq("ativo", true)
    .eq("categoria", "base");
  const jovens = (data ?? []) as { id: string; idade: number | null; overall: number | null; potencial: number | null }[];
  if (jovens.length === 0) return 0;

  await Promise.all(
    jovens
      .filter((j) => j.idade != null)
      .map((j) => db.from("players").update({ idade: (j.idade ?? 0) + 1 }).eq("id", j.id)),
  );
  const { error } = await db.from("player_evaluations").insert(
    jovens.map((j) => ({
      player_id: j.id,
      save_id: saveId,
      stint_id: stintId,
      season_id: novaSeasonId,
      idade: j.idade != null ? j.idade + 1 : null,
      overall: j.overall,
      potencial: j.potencial,
      tipo: "fim_temporada",
      nota: "Nova temporada",
    })),
  );
  if (error) throw error;
  return jovens.length;
}

/** Variação entre as duas últimas avaliações e sinais de alerta. */
export function resumirEvolucao(avals: Avaliacao[]) {
  const ord = [...avals].sort((a, b) => a.registrado_em.localeCompare(b.registrado_em));
  const comOverall = ord.filter((a) => a.overall != null);
  const ultima = comOverall[comOverall.length - 1] ?? null;
  const anterior = comOverall[comOverall.length - 2] ?? null;
  const antes = comOverall[comOverall.length - 3] ?? null;
  const delta = ultima && anterior ? (ultima.overall ?? 0) - (anterior.overall ?? 0) : null;
  const deltaAnterior = anterior && antes ? (anterior.overall ?? 0) - (antes.overall ?? 0) : null;
  return {
    serie: comOverall.map((a) => a.overall as number),
    delta,
    estagnado: delta != null && deltaAnterior != null && delta <= 0 && deltaAnterior <= 0,
    ultimaEm: ord[ord.length - 1]?.registrado_em ?? null,
    promocao: ord.find((a) => a.tipo === "promocao") ?? null,
  };
}

/** O jovem já foi avaliado (ou cadastrado) na temporada informada? */
export function avaliadoNaTemporada(avals: Avaliacao[], seasonId: string | null): boolean {
  if (!seasonId) return true;
  return avals.some(
    (a) =>
      a.season_id === seasonId &&
      (a.tipo === "avaliacao" || a.tipo === "cadastro" || a.tipo === "promocao"),
  );
}
