import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Bandeira } from "@/components/bandeira";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClubBadge } from "@/components/club-badge";
import { EvolucaoJogador } from "@/components/evolucao-jogador";
import { OverallCard } from "@/components/overall-card";
import { RadarAtributos } from "@/components/radar-atributos";
import { atributosDaLinha, temAtributos } from "@/lib/atributos-jogador";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useEvolucaoJogador } from "@/lib/evolucao-jogador";
import { formatarMoeda, type CodigoMoeda } from "@/lib/moeda";
import { moedaDaPassagem } from "@/lib/moeda-stint";
import { parsePlaystyles } from "@/lib/playstyles";
import { ehGoleiro, posEn } from "@/lib/posicoes";
import { rotuloMotivo } from "@/lib/season";
import { useSaveAtual } from "@/lib/use-save";
import { cn } from "@/lib/utils";

type Escopo = "temporada" | "carreira";

export const Route = createFileRoute("/_authenticated/jogador/$id")({
  validateSearch: (s: Record<string, unknown>): { escopo: Escopo } => ({
    escopo: s["escopo"] === "carreira" ? "carreira" : "temporada",
  }),
  head: () => ({
    meta: [
      { title: "Jogador | Carreira FC Manager" },
      { name: "description", content: "Perfil, evolução e estatísticas do jogador." },
    ],
  }),
  component: JogadorPage,
});

type PlayerRow = {
  id: string;
  nome: string;
  stint_id: string | null;
  nacionalidade: string | null;
  posicao_principal: string | null;
  posicoes_secundarias: unknown;
  overall: number | null;
  potencial: number | null;
  valor_mercado: number | null;
  salario: number | null;
  idade: number | null;
  altura: number | null;
  playstyle: string | null;
  status: string | null;
  categoria: string | null;
  ativo: boolean;
  motivo_saida: string | null;
  data_saida: string | null;
  clube_destino: string | null;
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

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <Card className="glow-panel">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold uppercase tracking-[0.06em]">
          {titulo}
        </CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function JogadorPage() {
  const { id } = Route.useParams();
  const { escopo: escopoInicial } = Route.useSearch();
  const { save } = useSaveAtual();
  const [jogador, setJogador] = useState<PlayerRow | null>(null);
  const [stats, setStats] = useState<StatRow[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [naoEncontrado, setNaoEncontrado] = useState(false);
  const [escopo, setEscopo] = useState<Escopo>(escopoInicial);
  const [codigoMoeda, setCodigoMoeda] = useState<CodigoMoeda>("EUR");
  const { pontos } = useEvolucaoJogador(id);
  const moeda = (v: number | null) => formatarMoeda(v, codigoMoeda);

  useEffect(() => {
    let ativo = true;
    setCarregando(true);
    void (async () => {
      const { data: p } = await supabase.from("players").select("*").eq("id", id).maybeSingle();
      if (!ativo) return;
      if (!p) {
        setNaoEncontrado(true);
        setCarregando(false);
        return;
      }
      const row = p as unknown as PlayerRow;
      const stintDoJogador = row.stint_id ?? "00000000-0000-0000-0000-000000000000";
      const [{ data: s }, codigo] = await Promise.all([
        supabase
          .from("match_player_stats")
          .select(
            "id, gols, assistencias, nota, defesas, chutes, passes, passes_pct, desarmes, clean_sheet, cartao_amarelo, cartao_vermelho, matches!inner(id, stint_id, season_id, data_hora, competicao, adversario, placar_time, placar_adversario, mvp_player_id)",
          )
          .eq("player_id", id)
          .eq("matches.stint_id", stintDoJogador),
        row.stint_id ? moedaDaPassagem(row.stint_id) : Promise.resolve<CodigoMoeda>("EUR"),
      ]);
      if (!ativo) return;
      setCodigoMoeda(codigo);
      setJogador(row);
      setStats((s ?? []) as unknown as StatRow[]);
      setCarregando(false);
    })();
    return () => {
      ativo = false;
    };
  }, [id]);

  // A temporada atual só faz sentido para jogadores da passagem em andamento.
  const mesmaPassagem = !!save && jogador?.stint_id === save.stintId;
  const escopoEfetivo: Escopo = mesmaPassagem ? escopo : "carreira";

  const ordenadas = useMemo(
    () =>
      [...stats].sort((a, b) =>
        (b.matches?.data_hora ?? "").localeCompare(a.matches?.data_hora ?? ""),
      ),
    [stats],
  );
  const doEscopo = useMemo(
    () =>
      escopoEfetivo === "carreira"
        ? ordenadas
        : ordenadas.filter((s) => !save?.seasonId || s.matches?.season_id === save.seasonId),
    [ordenadas, escopoEfetivo, save?.seasonId],
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
      mvps: doEscopo.filter((s) => s.matches?.mvp_player_id === id).length,
    };
  }, [doEscopo, id]);

  const fase = useMemo(() => {
    const notas = ordenadas
      .slice(0, 5)
      .map((s) => s.nota)
      .filter((n): n is number => n != null);
    if (notas.length === 0) return null;
    const media = notas.reduce((a, b) => a + b, 0) / notas.length;
    return {
      rotulo: media >= 7.5 ? "Em grande fase" : media >= 6.5 ? "Fase regular" : "Fase de baixa",
      cor:
        media >= 7.5
          ? "border-success/40 bg-success/15 text-success"
          : media >= 6.5
            ? "border-warning/40 bg-warning/15 text-warning"
            : "border-destructive/40 bg-destructive/15 text-destructive",
      media,
      jogos: Math.min(5, notas.length),
    };
  }, [ordenadas]);

  const promocao = pontos.find((p) => p.tipo === "promocao") ?? null;

  function voltar() {
    if (window.history.length > 1) window.history.back();
    else window.location.assign("/elenco");
  }

  return (
    <AppShell titulo="Jogador">
      <div className="min-h-full px-4 py-6 sm:px-8">
        <div className="mx-auto max-w-6xl space-y-6">
          <Button variant="ghost" size="sm" onClick={voltar}>
            <ArrowLeft className="mr-1 h-4 w-4" /> Voltar
          </Button>

          {carregando ? (
            <Skeleton className="h-96 w-full rounded-xl" />
          ) : naoEncontrado || !jogador ? (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center text-sm text-muted-foreground">
                Jogador não encontrado.
              </CardContent>
            </Card>
          ) : (
            <>
              <section className="glow-panel rounded-xl p-5">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="min-w-0">
                    <h1 className="break-words font-display text-4xl leading-tight sm:text-5xl">
                      {jogador.nome}
                    </h1>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <Badge>{posEn(jogador.posicao_principal) ?? "—"}</Badge>
                      {Array.isArray(jogador.posicoes_secundarias)
                        ? (jogador.posicoes_secundarias as string[]).map((p) => (
                            <Badge key={p} variant="secondary">
                              {posEn(p)}
                            </Badge>
                          ))
                        : null}
                      {jogador.categoria === "base" ? <Badge variant="outline">Base</Badge> : null}
                      {jogador.status ? <Badge variant="outline">{jogador.status}</Badge> : null}
                      {!jogador.ativo ? <Badge variant="outline">Ex-jogador</Badge> : null}
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
                  </div>
                  <OverallCard
                    playerId={jogador.id}
                    overall={jogador.overall}
                    className="min-w-60"
                  />
                </div>
              </section>

              <div className="grid gap-6 lg:grid-cols-3">
                <div className="space-y-6">
                  <Secao titulo="Atributos">
                    {temAtributos(atributosDaLinha(jogador as unknown as Record<string, unknown>)) ? (
                      <RadarAtributos
                        atributos={atributosDaLinha(jogador as unknown as Record<string, unknown>)}
                        overall={jogador.overall}
                        goleiro={ehGoleiro(jogador.posicao_principal)}
                      />
                    ) : (
                      <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                        Sem atributos cadastrados. Edite o jogador no Elenco para adicioná-los.
                      </p>
                    )}
                  </Secao>

                  <Secao titulo="Dados">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      {[
                        ["Idade", jogador.idade ?? "—"],
                        ["Altura", jogador.altura ? `${jogador.altura} cm` : "—"],
                        ["Potencial", jogador.potencial ?? "—"],
                        ["Valor", moeda(jogador.valor_mercado)],
                        ["Salário", moeda(jogador.salario)],
                        [
                          "Nacionalidade",
                          <Bandeira key="nac" pais={jogador.nacionalidade} comNome />,
                        ],
                      ].map(([k, v]) => (
                        <div key={String(k)} className="rounded-lg border border-border p-3">
                          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                            {k}
                          </p>
                          <p className="mt-1 font-semibold">{v}</p>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3">
                      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                        Playstyles
                      </p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {parsePlaystyles(jogador.playstyle).length > 0 ? (
                          parsePlaystyles(jogador.playstyle).map((p) => (
                            <Badge key={p} variant="outline">
                              {p}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </div>
                    </div>
                  </Secao>

                  {promocao ? (
                    <Secao titulo="Promoção ao elenco">
                      <p className="text-sm">
                        Subiu da base em{" "}
                        <span className="font-semibold">
                          {new Date(promocao.quando).toLocaleDateString("pt-BR")}
                        </span>
                        , com {promocao.idade ?? "—"} anos, overall {promocao.overall ?? "—"} e
                        potencial {promocao.potencial ?? "—"}.
                      </p>
                    </Secao>
                  ) : null}

                  {!jogador.ativo ? (
                    <Secao titulo="Saída do clube">
                      <div className="space-y-1 text-sm">
                        <p>{rotuloMotivo(jogador.motivo_saida)}</p>
                        {jogador.data_saida ? (
                          <p className="text-muted-foreground">
                            Em {new Date(jogador.data_saida).toLocaleDateString("pt-BR")}
                          </p>
                        ) : null}
                        {jogador.clube_destino ? (
                          <p className="flex items-center gap-2 text-muted-foreground">
                            Destino: <ClubBadge nome={jogador.clube_destino} />
                          </p>
                        ) : null}
                      </div>
                    </Secao>
                  ) : null}
                </div>

                <div className="space-y-6 lg:col-span-2">
                  <Secao titulo="Evolução">
                    <EvolucaoJogador playerId={jogador.id} />
                  </Secao>

                  <Secao titulo="Estatísticas">
                    <div className="space-y-3">
                      {mesmaPassagem ? (
                        <div className="inline-flex rounded-lg border border-border p-0.5">
                          {(
                            [
                              ["temporada", "Temporada atual"],
                              ["carreira", "Carreira no clube"],
                            ] as const
                          ).map(([valor, rotulo]) => (
                            <button
                              key={valor}
                              type="button"
                              onClick={() => setEscopo(valor)}
                              className={cn(
                                "rounded-md px-3 py-1.5 text-xs font-semibold transition-colors",
                                escopoEfetivo === valor
                                  ? "bg-primary text-primary-foreground"
                                  : "text-muted-foreground hover:text-foreground",
                              )}
                            >
                              {rotulo}
                            </button>
                          ))}
                        </div>
                      ) : null}
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
                  </Secao>

                  <Secao
                    titulo={`Partida a partida · ${escopoEfetivo === "temporada" ? "temporada atual" : "carreira no clube"}`}
                  >
                    {doEscopo.length === 0 ? (
                      <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                        Nenhuma partida registrada neste período.
                      </p>
                    ) : (
                      <ul className="space-y-2">
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
                              {s.matches?.competicao ?? "—"} · Nota {s.nota ?? "—"} · Gols{" "}
                              {s.gols ?? 0} · Assist. {s.assistencias ?? 0} · Chutes {s.chutes ?? 0}{" "}
                              · Passes {s.passes ?? 0} · Acerto {s.passes_pct ?? 0}% · Desarmes{" "}
                              {s.desarmes ?? 0} · Defesas {s.defesas ?? 0} · Clean sheet{" "}
                              {s.clean_sheet ? "Sim" : "Não"}
                              {s.cartao_amarelo ? " · 🟨" : ""}
                              {s.cartao_vermelho ? " · 🟥" : ""}
                            </p>
                          </li>
                        ))}
                      </ul>
                    )}
                  </Secao>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </AppShell>
  );
}
