import { useEffect, useMemo, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Bandeira } from "@/components/bandeira";
import { OverallCard } from "@/components/overall-card";
import { PlayerEvolution } from "@/components/player-evolution";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { parsePlaystyles } from "@/lib/playstyles";
import { posEn } from "@/lib/posicoes";
import { cn } from "@/lib/utils";

export type EscopoPerfil = "temporada" | "carreira";

type PlayerRow = {
  id: string;
  nome: string;
  nacionalidade: string | null;
  posicao_principal: string | null;
  posicoes_secundarias: unknown;
  overall: number | null;
  valor_mercado: number | null;
  salario: number | null;
  idade: number | null;
  altura: number | null;
  playstyle: string | null;
  status: string | null;
};

type StatRow = {
  id: string;
  gols: number | null;
  assistencias: number | null;
  nota: number | null;
  defesas: number | null;
  chutes: number | null;
  passes: number | null;
  passes_pct: number | null;
  desarmes: number | null;
  clean_sheet: boolean;
  cartao_amarelo: boolean;
  cartao_vermelho: boolean;
  matches: {
    id: string;
    season_id: string | null;
    data_hora: string | null;
    competicao: string | null;
    adversario: string | null;
    placar_time: number | null;
    placar_adversario: number | null;
    mvp_player_id: string | null;
  } | null;
};

const moeda = (v: number | null) =>
  v == null ? "—" : `£ ${new Intl.NumberFormat("pt-BR").format(Number(v))}`;

/** Painel de perfil do jogador reutilizado em Elenco, Estatísticas e Ex-jogadores. */
export function PlayerProfileSheet({
  playerId,
  saveId,
  stintId,
  seasonId,
  escopoInicial = "temporada",
  extra,
  onOpenChange,
}: {
  playerId: string | null;
  saveId: string | null;
  stintId?: string | null;
  seasonId: string | null;
  escopoInicial?: EscopoPerfil;
  extra?: ReactNode;
  onOpenChange: (aberto: boolean) => void;
}) {
  const [jogador, setJogador] = useState<PlayerRow | null>(null);
  const [stats, setStats] = useState<StatRow[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [escopo, setEscopo] = useState<EscopoPerfil>(escopoInicial);

  useEffect(() => {
    if (playerId) setEscopo(escopoInicial);
  }, [playerId, escopoInicial]);

  useEffect(() => {
    if (!playerId || !saveId) {
      setJogador(null);
      setStats([]);
      return;
    }
    let ativo = true;
    setCarregando(true);
    void (async () => {
      const [{ data: p }, { data: s }] = await Promise.all([
        supabase.from("players").select("*").eq("id", playerId).maybeSingle(),
        supabase
          .from("match_player_stats")
          .select(
            "id, gols, assistencias, nota, defesas, chutes, passes, passes_pct, desarmes, clean_sheet, cartao_amarelo, cartao_vermelho, matches!inner(id, stint_id, season_id, data_hora, competicao, adversario, placar_time, placar_adversario, mvp_player_id)",
          )
          .eq("player_id", playerId)
          .eq("matches.stint_id", stintId ?? "00000000-0000-0000-0000-000000000000"),
      ]);
      if (!ativo) return;
      setJogador((p ?? null) as PlayerRow | null);
      setStats((s ?? []) as unknown as StatRow[]);
      setCarregando(false);
    })();
    return () => {
      ativo = false;
    };
  }, [playerId, saveId, stintId]);

  const ordenadas = useMemo(
    () =>
      [...stats].sort((a, b) =>
        (b.matches?.data_hora ?? "").localeCompare(a.matches?.data_hora ?? ""),
      ),
    [stats],
  );

  const doEscopo = useMemo(
    () =>
      escopo === "carreira"
        ? ordenadas
        : ordenadas.filter((s) => !seasonId || s.matches?.season_id === seasonId),
    [ordenadas, escopo, seasonId],
  );

  const agregado = useMemo(() => {
    const notas = doEscopo.map((s) => s.nota).filter((n): n is number => n != null);
    return {
      jogos: doEscopo.length,
      gols: doEscopo.reduce((a, s) => a + (s.gols ?? 0), 0),
      assist: doEscopo.reduce((a, s) => a + (s.assistencias ?? 0), 0),
      nota: notas.length ? (notas.reduce((a, b) => a + b, 0) / notas.length).toFixed(2) : "—",
      amarelos: doEscopo.filter((s) => s.cartao_amarelo).length,
      vermelhos: doEscopo.filter((s) => s.cartao_vermelho).length,
      defesas: doEscopo.reduce((a, s) => a + (s.defesas ?? 0), 0),
      mvps: doEscopo.filter((s) => s.matches?.mvp_player_id === playerId).length,
    };
  }, [doEscopo, playerId]);

  // Fase do jogador: sempre as últimas 5 partidas, independente do escopo.
  const fase = useMemo(() => {
    const ultimas = ordenadas.slice(0, 5);
    const notas = ultimas.map((s) => s.nota).filter((n): n is number => n != null);
    if (notas.length === 0) return null;
    const media = notas.reduce((a, b) => a + b, 0) / notas.length;
    const rotulo =
      media >= 7.5 ? "Em grande fase" : media >= 6.5 ? "Fase regular" : "Fase de baixa";
    const cor =
      media >= 7.5
        ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-500"
        : media >= 6.5
          ? "border-amber-500/40 bg-amber-500/15 text-amber-500"
          : "border-destructive/40 bg-destructive/15 text-destructive";
    return { rotulo, cor, media, jogos: ultimas.length };
  }, [ordenadas]);

  return (
    <Sheet open={!!playerId} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        {carregando && !jogador ? (
          <div className="space-y-3 pt-8">
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : jogador ? (
          <>
            <SheetHeader>
              <SheetTitle className="font-display text-3xl tracking-wide">
                {jogador.nome}
              </SheetTitle>
            </SheetHeader>
            <div className="mt-4 space-y-6">
              <div className="flex flex-wrap gap-2">
                <Badge>{posEn(jogador.posicao_principal) ?? "—"}</Badge>
                {Array.isArray(jogador.posicoes_secundarias)
                  ? (jogador.posicoes_secundarias as string[]).map((p) => (
                      <Badge key={p} variant="secondary">
                        {posEn(p)}
                      </Badge>
                    ))
                  : null}
                {jogador.status ? <Badge variant="outline">{jogador.status}</Badge> : null}
                {fase ? (
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold",
                      fase.cor,
                    )}
                  >
                    {fase.rotulo} · {fase.media.toFixed(2)} ({fase.jogos} jogos)
                  </span>
                ) : null}
              </div>

              {extra}

              <OverallCard playerId={jogador.id} overall={jogador.overall} />

              <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
                {[
                  ["Idade", jogador.idade ?? "—"],
                  ["Altura", jogador.altura ? `${jogador.altura} cm` : "—"],
                  ["Nacionalidade", <Bandeira key="nac" pais={jogador.nacionalidade} comNome />],
                  ["Valor", moeda(jogador.valor_mercado)],
                  ["Salário", moeda(jogador.salario)],
                  ["Playstyles", parsePlaystyles(jogador.playstyle).join(", ") || "—"],
                ].map(([k, v]) => (
                  <div key={String(k)} className="rounded-lg border border-border p-3">
                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                      {k}
                    </p>
                    <p className="mt-1 font-semibold">{v}</p>
                  </div>
                ))}
              </div>

              <div className="space-y-3">
                <div className="inline-flex rounded-lg border border-border p-0.5">
                  {(
                    [
                      ["temporada", "Temporada Atual"],
                      ["carreira", "Carreira no Clube"],
                    ] as const
                  ).map(([valor, rotulo]) => (
                    <button
                      key={valor}
                      type="button"
                      onClick={() => setEscopo(valor)}
                      className={cn(
                        "rounded-md px-3 py-1.5 text-xs font-semibold transition-colors",
                        escopo === valor
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {rotulo}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-3 gap-3 text-center sm:grid-cols-4">
                  {[
                    ["Jogos", agregado.jogos],
                    ["Gols", agregado.gols],
                    ["Assist.", agregado.assist],
                    ["Nota", agregado.nota],
                    ["Amarelos", agregado.amarelos],
                    ["Vermelhos", agregado.vermelhos],
                    ["Defesas", agregado.defesas],
                    ["MVPs", agregado.mvps],
                  ].map(([k, v]) => (
                    <div key={String(k)} className="rounded-lg bg-muted/40 p-3">
                      <p className="font-display text-xl text-primary">{v}</p>
                      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                        {k}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <PlayerEvolution playerId={jogador.id} currentOverall={jogador.overall} />

              <div>
                <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Histórico partida a partida
                  {escopo === "temporada" ? " (temporada atual)" : " (carreira no clube)"}
                </h3>
                {doEscopo.length === 0 ? (
                  <p className="mt-3 rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                    Nenhuma partida registrada neste período.
                  </p>
                ) : (
                  <ul className="mt-3 space-y-2">
                    {doEscopo.map((s) => (
                      <li key={s.id} className="rounded-lg border border-border p-3">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-semibold">
                            vs {s.matches?.adversario ?? "—"}{" "}
                            <span className="text-muted-foreground">
                              {s.matches?.placar_time ?? 0}-{s.matches?.placar_adversario ?? 0}
                            </span>
                          </p>
                          <span className="text-xs text-muted-foreground">
                            {s.matches?.data_hora
                              ? new Date(s.matches.data_hora).toLocaleDateString("pt-BR")
                              : ""}
                          </span>
                        </div>
                        <p className="mt-1 text-xs leading-5 text-muted-foreground">
                          {s.matches?.competicao ?? "—"} · Nota {s.nota ?? "—"} · Gols {s.gols ?? 0}{" "}
                          · Assist. {s.assistencias ?? 0} · Chutes {s.chutes ?? 0} · Passes{" "}
                          {s.passes ?? 0} · Acerto {s.passes_pct ?? 0}% · Desarmes {s.desarmes ?? 0}{" "}
                          · Defesas {s.defesas ?? 0} · Clean sheet {s.clean_sheet ? "Sim" : "Não"}
                          {s.cartao_amarelo ? " · 🟨" : ""}
                          {s.cartao_vermelho ? " · 🟥" : ""}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
