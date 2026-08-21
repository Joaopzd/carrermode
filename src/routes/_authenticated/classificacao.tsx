import { ClubBadge } from "@/components/club-badge";
import { ClubAutocomplete } from "@/components/club-autocomplete";
import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { SkeletonLinhasTabela } from "@/components/loading";
import { useIndicadorCarregamento, useSkeletonDelay } from "@/lib/loading-bus";
import { TabSlide } from "@/components/motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useSaveAtual } from "@/lib/use-save";
import { carregarRegras, zonaDaPosicao, type LeagueRules } from "@/lib/league-rules";
import { cn } from "@/lib/utils";
import { ehCopa, ordemFase, ICONE_COMPETICAO } from "@/lib/match-data";

export const Route = createFileRoute("/_authenticated/classificacao")({
  head: () => ({
    meta: [
      { title: "Classificação | Carreira FC Manager" },
      { name: "description", content: "Tabela da liga atualizada por rodada." },
      { property: "og:title", content: "Classificação | Carreira FC Manager" },
      { property: "og:description", content: "Tabela da liga atualizada por rodada." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ClassificacaoPage,
});

type Snapshot = {
  id: string;
  rodada: number | null;
  time: string;
  pontos: number;
  jogos: number;
  vitorias: number;
  empates: number;
  derrotas: number;
  gols_pro: number;
  gols_contra: number;
  saldo: number;
  posicao: number | null;
};

type PartidaResumo = {
  competicao: string | null;
  fase: string | null;
  status: string;
  placar_time: number | null;
  placar_adversario: number | null;
  data_hora: string | null;
};

type ResumoCopa = {
  competicao: string;
  jogos: number;
  v: number;
  e: number;
  d: number;
  gp: number;
  gc: number;
  faseAtual: string | null;
  proximaFase: string | null;
};

function resumirCopas(partidas: PartidaResumo[]): ResumoCopa[] {
  const mapa = new Map<string, ResumoCopa>();
  for (const m of partidas) {
    const comp = m.competicao ?? "";
    if (!ehCopa(comp)) continue;
    let r = mapa.get(comp);
    if (!r) {
      r = {
        competicao: comp,
        jogos: 0,
        v: 0,
        e: 0,
        d: 0,
        gp: 0,
        gc: 0,
        faseAtual: null,
        proximaFase: null,
      };
      mapa.set(comp, r);
    }
    if (m.status === "finalizada") {
      const a = m.placar_time ?? 0;
      const b = m.placar_adversario ?? 0;
      r.jogos += 1;
      r.gp += a;
      r.gc += b;
      if (a > b) r.v += 1;
      else if (a < b) r.d += 1;
      else r.e += 1;
      if (ordemFase(m.fase) > ordemFase(r.faseAtual)) r.faseAtual = m.fase ?? r.faseAtual;
    } else if (m.status === "agendada") {
      if (ordemFase(m.fase) > ordemFase(r.proximaFase)) r.proximaFase = m.fase ?? r.proximaFase;
    }
  }
  return [...mapa.values()].sort((a, b) => a.competicao.localeCompare(b.competicao));
}

type LinhaForm = {
  time: string;
  pontos: string;
  vitorias: string;
  empates: string;
  derrotas: string;
  gols_pro: string;
  gols_contra: string;
};

const linhaVazia = (): LinhaForm => ({
  time: "",
  pontos: "",
  vitorias: "",
  empates: "",
  derrotas: "",
  gols_pro: "",
  gols_contra: "",
});

function n(v: string) {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}

function ClassificacaoPage() {
  const { save, carregando: carregandoSave } = useSaveAtual();
  const [campanha, setCampanha] = useState({
    jogos: 0,
    v: 0,
    e: 0,
    d: 0,
    gp: 0,
    gc: 0,
  });
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [copas, setCopas] = useState<ResumoCopa[]>([]);
  const [carregando, setCarregando] = useState(true);
  useIndicadorCarregamento(carregando);
  const mostrarSkeleton = useSkeletonDelay(carregando);
  const [aberto, setAberto] = useState(false);
  const [rodada, setRodada] = useState("1");
  const [linhas, setLinhas] = useState<LinhaForm[]>([linhaVazia()]);
  const [salvando, setSalvando] = useState(false);
  const [regras, setRegras] = useState<LeagueRules | null>(null);

  const carregar = useCallback(
    async (saveId: string, seasonId: string | null, leagueId: string | null) => {
    void carregarRegras(leagueId).then(setRegras);
    let qm = supabase
      .from("matches")
      .select("competicao, fase, status, placar_time, placar_adversario, data_hora")
      .eq("save_id", saveId);
    if (seasonId) qm = qm.eq("season_id", seasonId);
    const { data: mts } = await qm;
    const todas = (mts ?? []) as PartidaResumo[];
    const acc = { jogos: 0, v: 0, e: 0, d: 0, gp: 0, gc: 0 };
    for (const m of todas) {
      if (m.competicao !== "Liga" || m.status !== "finalizada") continue;
      const a = m.placar_time ?? 0;
      const b = m.placar_adversario ?? 0;
      acc.jogos += 1;
      acc.gp += a;
      acc.gc += b;
      if (a > b) acc.v += 1;
      else if (a < b) acc.d += 1;
      else acc.e += 1;
    }
    setCampanha(acc);
    setCopas(resumirCopas(todas));

    let qs = supabase.from("standings_snapshot").select("*").eq("save_id", saveId);
    if (seasonId) qs = qs.eq("season_id", seasonId);
    const { data: snaps } = await qs.order("rodada", { ascending: false });
    setSnapshots((snaps ?? []) as Snapshot[]);
    setCarregando(false);
    },
    [],
  );

  useEffect(() => {
    if (!save) {
      if (!carregandoSave) setCarregando(false);
      return;
    }
    void carregar(save.id, save.seasonId, save.leagueId);
  }, [save, carregandoSave, carregar]);

  const ultimaRodada = useMemo(() => {
    const rs = snapshots.map((s) => s.rodada ?? 0);
    return rs.length ? Math.max(...rs) : null;
  }, [snapshots]);

  const tabelaOficial = useMemo(() => {
    if (ultimaRodada == null) return [];
    return snapshots
      .filter((s) => (s.rodada ?? 0) === ultimaRodada)
      .sort(
        (a, b) =>
          (a.posicao ?? 99) - (b.posicao ?? 99) ||
          b.pontos - a.pontos ||
          b.saldo - a.saldo ||
          b.gols_pro - a.gols_pro,
      );
  }, [snapshots, ultimaRodada]);

  const pontos = campanha.v * 3 + campanha.e;

  const minhaPosicao = useMemo(() => {
    if (!save?.clubeNome) return null;
    const idx = tabelaOficial.findIndex(
      (s) => s.time.toLowerCase() === save.clubeNome!.toLowerCase(),
    );
    return idx >= 0 ? (tabelaOficial[idx]!.posicao ?? idx + 1) : null;
  }, [tabelaOficial, save]);

  const zonaCampanha = useMemo(
    () =>
      minhaPosicao ? zonaDaPosicao(minhaPosicao, tabelaOficial.length, regras) : null,
    [minhaPosicao, tabelaOficial.length, regras],
  );

  function abrirSync() {
    const proxima = (ultimaRodada ?? 0) + 1;
    setRodada(String(proxima));
    const base =
      tabelaOficial.length > 0
        ? tabelaOficial.map((s) => ({
            time: s.time,
            pontos: String(s.pontos),
            vitorias: String(s.vitorias),
            empates: String(s.empates),
            derrotas: String(s.derrotas),
            gols_pro: String(s.gols_pro),
            gols_contra: String(s.gols_contra),
          }))
        : [linhaVazia()];
    setLinhas(base);
    setAberto(true);
  }

  function atualizar(i: number, campo: keyof LinhaForm, valor: string) {
    setLinhas((ls) => ls.map((l, idx) => (idx === i ? { ...l, [campo]: valor } : l)));
  }

  async function salvar() {
    if (!save) return;
    const validas = linhas.filter((l) => l.time.trim() !== "");
    if (validas.length === 0) {
      toast.error("Informe ao menos um time.");
      return;
    }
    setSalvando(true);
    const rod = n(rodada);
    const ordenadas = [...validas].sort((a, b) => {
      const pa = n(a.pontos);
      const pb = n(b.pontos);
      const sa = n(a.gols_pro) - n(a.gols_contra);
      const sb = n(b.gols_pro) - n(b.gols_contra);
      return pb - pa || sb - sa || n(b.gols_pro) - n(a.gols_pro);
    });

    let del = supabase
      .from("standings_snapshot")
      .delete()
      .eq("save_id", save.id)
      .eq("rodada", rod);
    if (save.seasonId) del = del.eq("season_id", save.seasonId);
    await del;

    const { error } = await supabase.from("standings_snapshot").insert(
      ordenadas.map((l, i) => ({
        save_id: save.id,
        season_id: save.seasonId,
        rodada: rod,
        time: l.time.trim(),
        pontos: n(l.pontos),
        jogos: n(l.vitorias) + n(l.empates) + n(l.derrotas),
        vitorias: n(l.vitorias),
        empates: n(l.empates),
        derrotas: n(l.derrotas),
        gols_pro: n(l.gols_pro),
        gols_contra: n(l.gols_contra),
        saldo: n(l.gols_pro) - n(l.gols_contra),
        posicao: i + 1,
      })),
    );
    setSalvando(false);
    if (error) {
      toast.error("Não foi possível sincronizar a rodada.");
      return;
    }
    toast.success(`Rodada ${rod} sincronizada.`);
    setAberto(false);
    void carregar(save.id, save.seasonId, save.leagueId);
  }

  return (
    <AppShell titulo="Classificação">
      <div className="pitch-lines min-h-full px-4 py-8 sm:px-8">
        <div className="mx-auto max-w-5xl space-y-6">
          <header>
            <h1 className="text-gradient-pitch text-4xl">Classificação</h1>
            <p className="text-sm text-muted-foreground">
              Sua campanha na Liga e a tabela completa sincronizada rodada a rodada.
            </p>
          </header>

          {mostrarSkeleton ? (
            <SkeletonLinhasTabela linhas={12} colunas={9} />
          ) : carregando ? (
            <div className="h-72" />
          ) : (
            <Tabs defaultValue={ultimaRodada != null ? "tabela" : "campanha"}>
              <TabsList>
                <TabsTrigger value="campanha">Minha Campanha</TabsTrigger>
                <TabsTrigger value="tabela">Tabela da Liga</TabsTrigger>
              </TabsList>

              <TabsContent value="campanha" className="mt-4">
                <TabSlide chave="campanha" className="space-y-4">
                {minhaPosicao ? (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">
                      Posição atual: {minhaPosicao}º
                    </span>
                    {zonaCampanha ? (
                      <Badge variant="outline" className={zonaCampanha.badge}>
                        {zonaCampanha.rotulo}
                      </Badge>
                    ) : (
                      <Badge variant="outline">Zona neutra</Badge>
                    )}
                  </div>
                ) : null}
                {ultimaRodada == null ? (
                  <p className="rounded-lg border border-dashed border-border p-3 text-xs text-muted-foreground">
                    Posição estimada, baseada apenas nos seus jogos.
                  </p>
                ) : null}
                {campanha.jogos === 0 ? (
                  <Card className="border-dashed">
                    <CardContent className="py-14 text-center">
                      <p className="text-lg font-semibold">Nenhum jogo de Liga finalizado</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Feche partidas da competição “Liga” para ver sua campanha aqui.
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      {[
                        ["Pontos", pontos],
                        ["Jogos", campanha.jogos],
                        ["Saldo", campanha.gp - campanha.gc],
                        [
                          "Aproveitamento",
                          `${Math.round((pontos / (campanha.jogos * 3)) * 100)}%`,
                        ],
                      ].map(([k, v]) => (
                        <Card key={String(k)}>
                          <CardContent className="py-5 text-center">
                            <p className="font-display text-3xl text-primary">{v}</p>
                            <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
                              {k}
                            </p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                    <Card className="overflow-hidden">
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Time</TableHead>
                              <TableHead className="text-right">P</TableHead>
                              <TableHead className="text-right">J</TableHead>
                              <TableHead className="text-right">V</TableHead>
                              <TableHead className="text-right">E</TableHead>
                              <TableHead className="text-right">D</TableHead>
                              <TableHead className="text-right">GP</TableHead>
                              <TableHead className="text-right">GC</TableHead>
                              <TableHead className="text-right">SG</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            <TableRow>
                              <TableCell className="font-semibold">
                                {save?.clubeNome ?? "Meu clube"}
                              </TableCell>
                              <TableCell className="text-right font-bold">{pontos}</TableCell>
                              <TableCell className="text-right">{campanha.jogos}</TableCell>
                              <TableCell className="text-right">{campanha.v}</TableCell>
                              <TableCell className="text-right">{campanha.e}</TableCell>
                              <TableCell className="text-right">{campanha.d}</TableCell>
                              <TableCell className="text-right">{campanha.gp}</TableCell>
                              <TableCell className="text-right">{campanha.gc}</TableCell>
                              <TableCell className="text-right">
                                {campanha.gp - campanha.gc}
                              </TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </div>
                    </Card>
                  </>
                )}

                {copas.length > 0 ? (
                  <div className="space-y-3">
                    <h2 className="font-display text-2xl">Desempenho em copas</h2>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {copas.map((c) => (
                        <Card key={c.competicao}>
                          <CardContent className="space-y-2 py-4">
                            <div className="flex items-center justify-between gap-2">
                              <p className="font-semibold">
                                <span className="mr-1">{ICONE_COMPETICAO[c.competicao] ?? "🏆"}</span>
                                {c.competicao}
                              </p>
                              <Badge variant={c.proximaFase ? "default" : "secondary"}>
                                {c.proximaFase
                                  ? `Próxima: ${c.proximaFase}`
                                  : c.faseAtual
                                    ? `Fase: ${c.faseAtual}`
                                    : "Sem fase definida"}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {c.jogos} jogo{c.jogos === 1 ? "" : "s"} · {c.v}V {c.e}E {c.d}D ·{" "}
                              {c.gp}:{c.gc} ({c.gp - c.gc >= 0 ? "+" : ""}
                              {c.gp - c.gc})
                            </p>
                            {c.faseAtual ? (
                              <p className="text-xs text-muted-foreground">
                                Última fase disputada: {c.faseAtual}
                              </p>
                            ) : null}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                ) : null}
                </TabSlide>
              </TabsContent>

              <TabsContent value="tabela" className="mt-4">
                <TabSlide chave="tabela" className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Última rodada sincronizada:</span>
                    <Badge variant={ultimaRodada != null ? "default" : "secondary"}>
                      {ultimaRodada != null ? `Rodada ${ultimaRodada}` : "Nenhuma"}
                    </Badge>
                  </div>
                  <Button onClick={abrirSync}>
                    <RefreshCw className="mr-1 h-4 w-4" /> Sincronizar nova rodada
                  </Button>
                </div>

                {tabelaOficial.length === 0 ? (
                  <Card className="border-dashed">
                    <CardContent className="py-14 text-center">
                      <p className="text-lg font-semibold">Tabela ainda não sincronizada</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Enquanto isso, a aba “Minha Campanha” mostra a posição estimada com base
                        apenas nos seus jogos.
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="overflow-hidden">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-10">#</TableHead>
                            <TableHead>Time</TableHead>
                            <TableHead className="text-right">P</TableHead>
                            <TableHead className="text-right">J</TableHead>
                            <TableHead className="text-right">V</TableHead>
                            <TableHead className="text-right">E</TableHead>
                            <TableHead className="text-right">D</TableHead>
                            <TableHead className="text-right">GP</TableHead>
                            <TableHead className="text-right">GC</TableHead>
                            <TableHead className="text-right">SG</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {tabelaOficial.map((s, i) => {
                            const meu =
                              save?.clubeNome &&
                              s.time.toLowerCase() === save.clubeNome.toLowerCase();
                            const zona = zonaDaPosicao(
                              s.posicao ?? i + 1,
                              tabelaOficial.length,
                              regras,
                            );
                            return (
                              <TableRow
                                key={s.id}
                                title={zona?.rotulo}
                                className={cn(zona?.linha, meu && "bg-primary/10 font-semibold")}
                              >
                                <TableCell className="text-muted-foreground">
                                  {s.posicao ?? i + 1}
                                </TableCell>
                                <TableCell className="font-medium">
                                  <ClubBadge nome={s.time} />
                                </TableCell>
                                <TableCell className="text-right font-bold">{s.pontos}</TableCell>
                                <TableCell className="text-right">{s.jogos}</TableCell>
                                <TableCell className="text-right">{s.vitorias}</TableCell>
                                <TableCell className="text-right">{s.empates}</TableCell>
                                <TableCell className="text-right">{s.derrotas}</TableCell>
                                <TableCell className="text-right">{s.gols_pro}</TableCell>
                                <TableCell className="text-right">{s.gols_contra}</TableCell>
                                <TableCell className="text-right">{s.saldo}</TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </Card>
                )}
                </TabSlide>
              </TabsContent>
            </Tabs>
          )}
        </div>
      </div>

      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Sincronizar rodada</DialogTitle>
            <DialogDescription>
              Preencha uma linha por time. A posição é calculada por pontos, saldo e gols pró.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="w-32 space-y-1.5">
              <Label>Rodada</Label>
              <Input inputMode="numeric" value={rodada} onChange={(e) => setRodada(e.target.value)} />
            </div>

            <div className="space-y-2">
              <div className="hidden grid-cols-[1fr_repeat(6,3.5rem)_2rem] gap-2 px-1 text-[11px] uppercase tracking-wider text-muted-foreground sm:grid">
                <span>Time</span>
                <span>P</span>
                <span>V</span>
                <span>E</span>
                <span>D</span>
                <span>GP</span>
                <span>GC</span>
                <span />
              </div>
              {linhas.map((l, i) => (
                <div
                  key={i}
                  className="grid grid-cols-2 gap-2 sm:grid-cols-[1fr_repeat(6,3.5rem)_2rem]"
                >
                  <ClubAutocomplete
                    placeholder="Time"
                    value={l.time}
                    leagueId={save?.leagueId ?? null}
                    onChange={(v) => atualizar(i, "time", v)}
                  />
                  {(["pontos", "vitorias", "empates", "derrotas", "gols_pro", "gols_contra"] as const).map(
                    (campo) => (
                      <Input
                        key={campo}
                        inputMode="numeric"
                        placeholder="0"
                        value={l[campo]}
                        onChange={(e) => atualizar(i, campo, e.target.value)}
                      />
                    ),
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setLinhas((ls) => ls.filter((_, idx) => idx !== i))}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button variant="outline" onClick={() => setLinhas((ls) => [...ls, linhaVazia()])}>
                <Plus className="mr-1 h-4 w-4" /> Adicionar time
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setAberto(false)}>
              Cancelar
            </Button>
            <Button onClick={() => void salvar()} disabled={salvando}>
              {salvando ? "Salvando…" : "Salvar rodada"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
