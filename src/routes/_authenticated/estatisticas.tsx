import { ehGoleiro, posEn } from "@/lib/posicoes";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import { Bandeira } from "@/components/bandeira";
import { PlayerEvolution } from "@/components/player-evolution";
import { OverallCard } from "@/components/overall-card";
import { SkeletonLinhasTabela } from "@/components/loading";
import { useIndicadorCarregamento, useSkeletonDelay } from "@/lib/loading-bus";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { POSICOES, STATUS_JOGADOR } from "@/lib/onboarding-data";
import { useSaveAtual } from "@/lib/use-save";

export const Route = createFileRoute("/_authenticated/estatisticas")({
  head: () => ({
    meta: [
      { title: "Estatísticas do Elenco | Carreira FC Manager" },
      { name: "description", content: "Números individuais e coletivos do seu elenco." },
      { property: "og:title", content: "Estatísticas do Elenco | Carreira FC Manager" },
      { property: "og:description", content: "Números individuais e coletivos do seu elenco." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: EstatisticasPage,
});

type Jogador = {
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

type Stat = {
  id: string;
  match_id: string;
  player_id: string | null;
  gols: number | null;
  assistencias: number | null;
  nota: number | null;
  cartao_amarelo: boolean;
  cartao_vermelho: boolean;
  defesas: number | null;
  chutes: number | null;
  passes: number | null;
  passes_pct: number | null;
  desarmes: number | null;
  clean_sheet: boolean;
};

type Partida = {
  id: string;
  data_hora: string | null;
  competicao: string | null;
  adversario: string | null;
  placar_time: number | null;
  placar_adversario: number | null;
  season_id?: string | null;
  mvp_player_id?: string | null;
  status?: string | null;
};

type Linha = Jogador & {
  jogos: number;
  gols: number;
  assist: number;
  notaMedia: number | null;
  amarelos: number;
  vermelhos: number;
  cs: number;
  mvps: number;
  mvpsTemporada: number;
};

const COLUNAS = [
  { key: "nome", label: "Nome", num: false },
  { key: "posicao_principal", label: "Pos", num: false },
  { key: "overall", label: "OVR", num: true },
  { key: "idade", label: "Idade", num: true },
  { key: "jogos", label: "J", num: true },
  { key: "gols", label: "G", num: true },
  { key: "assist", label: "A", num: true },
  { key: "notaMedia", label: "Nota", num: true },
  { key: "amarelos", label: "CA", num: true },
  { key: "vermelhos", label: "CV", num: true },
  { key: "mvps", label: "MVPs", num: true },
  { key: "cs", label: "CS", num: true },
] as const;

type ColKey = (typeof COLUNAS)[number]["key"];

const TODOS = "__todos__";
const GERAL = "__geral__";

function EstatisticasPage() {
  const { save, carregando: carregandoSave } = useSaveAtual();
  const [jogadores, setJogadores] = useState<Jogador[]>([]);
  const [stats, setStats] = useState<Stat[]>([]);
  const [partidas, setPartidas] = useState<Record<string, Partida>>({});
  const [carregando, setCarregando] = useState(true);
  useIndicadorCarregamento(carregando);
  const mostrarSkeleton = useSkeletonDelay(carregando);

  const [fComp, setFComp] = useState(GERAL);
  const [fPos, setFPos] = useState(TODOS);
  const [fStatus, setFStatus] = useState(TODOS);
  const [fNac, setFNac] = useState(TODOS);
  const [ovrMin, setOvrMin] = useState("");
  const [ovrMax, setOvrMax] = useState("");
  const [idadeMin, setIdadeMin] = useState("");
  const [idadeMax, setIdadeMax] = useState("");

  const [ordem, setOrdem] = useState<{ col: ColKey; dir: "asc" | "desc" }>({
    col: "overall",
    dir: "desc",
  });
  const [selecionado, setSelecionado] = useState<Linha | null>(null);

  useEffect(() => {
    if (!save) {
      if (!carregandoSave) setCarregando(false);
      return;
    }
    let ativo = true;
    void (async () => {
      const { data: pls } = await supabase
        .from("players")
        .select("*")
        .eq("save_id", save.id)
        .eq("ativo", true)
        .or("categoria.eq.principal,categoria.is.null");
      const { data: mts } = await supabase
        .from("matches")
        .select(
          "id, data_hora, competicao, adversario, placar_time, placar_adversario, season_id, mvp_player_id, status",
        )
        .eq("save_id", save.id);
      const ids = (mts ?? []).map((m) => m.id as string);
      let sts: Stat[] = [];
      if (ids.length > 0) {
        const { data } = await supabase.from("match_player_stats").select("*").in("match_id", ids);
        sts = (data ?? []) as Stat[];
      }
      if (!ativo) return;
      setJogadores((pls ?? []) as Jogador[]);
      setStats(sts);
      setPartidas(Object.fromEntries((mts ?? []).map((m) => [m.id as string, m as Partida])));
      setCarregando(false);
    })();
    return () => {
      ativo = false;
    };
  }, [save, carregandoSave]);

  const nacionalidades = useMemo(
    () =>
      Array.from(new Set(jogadores.map((j) => j.nacionalidade).filter(Boolean))).sort() as string[],
    [jogadores],
  );

  const contagemMvp = useMemo(() => {
    const total: Record<string, number> = {};
    const temporada: Record<string, number> = {};
    for (const m of Object.values(partidas)) {
      const pid = m.mvp_player_id;
      if (!pid) continue;
      if (fComp !== GERAL && m.competicao !== fComp) continue;
      total[pid] = (total[pid] ?? 0) + 1;
      if (save?.seasonId && m.season_id === save.seasonId) {
        temporada[pid] = (temporada[pid] ?? 0) + 1;
      }
    }
    return { total, temporada };
  }, [partidas, save?.seasonId, fComp]);

  const competicoes = useMemo(() => {
    const set = new Set<string>();
    for (const m of Object.values(partidas)) {
      if (!m.competicao || m.status !== "finalizada") continue;
      if (save?.seasonId && m.season_id !== save.seasonId) continue;
      set.add(m.competicao);
    }
    return [...set].sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [partidas, save?.seasonId]);

  const linhas = useMemo<Linha[]>(() => {
    const porJogador = new Map<string, Stat[]>();
    for (const s of stats) {
      if (!s.player_id) continue;
      if (fComp !== GERAL && partidas[s.match_id]?.competicao !== fComp) continue;
      const arr = porJogador.get(s.player_id) ?? [];
      arr.push(s);
      porJogador.set(s.player_id, arr);
    }
    return jogadores.map((j) => {
      const ss = porJogador.get(j.id) ?? [];
      const notas = ss.map((s) => s.nota).filter((n): n is number => n != null);
      void ehGoleiro;
      return {
        ...j,
        jogos: ss.length,
        gols: ss.reduce((a, s) => a + (s.gols ?? 0), 0),
        assist: ss.reduce((a, s) => a + (s.assistencias ?? 0), 0),
        notaMedia: notas.length ? notas.reduce((a, b) => a + b, 0) / notas.length : null,
        amarelos: ss.filter((s) => s.cartao_amarelo).length,
        vermelhos: ss.filter((s) => s.cartao_vermelho).length,
        cs: ss.filter((s) => s.clean_sheet).length,
        mvps: contagemMvp.total[j.id] ?? 0,
        mvpsTemporada: contagemMvp.temporada[j.id] ?? 0,
      };
    });
  }, [jogadores, stats, contagemMvp, fComp, partidas]);

  const filtradas = useMemo(() => {
    const num = (v: string) => (v.trim() === "" ? null : Number(v));
    const oMin = num(ovrMin);
    const oMax = num(ovrMax);
    const iMin = num(idadeMin);
    const iMax = num(idadeMax);
    const arr = linhas.filter((l) => {
      if (fPos !== TODOS && posEn(l.posicao_principal) !== fPos) return false;
      if (fStatus !== TODOS && l.status !== fStatus) return false;
      if (fNac !== TODOS && l.nacionalidade !== fNac) return false;
      if (oMin != null && (l.overall ?? 0) < oMin) return false;
      if (oMax != null && (l.overall ?? 0) > oMax) return false;
      if (iMin != null && (l.idade ?? 0) < iMin) return false;
      if (iMax != null && (l.idade ?? 0) > iMax) return false;
      return true;
    });
    const { col, dir } = ordem;
    const mult = dir === "asc" ? 1 : -1;
    return [...arr].sort((a, b) => {
      const va = a[col];
      const vb = b[col];
      if (typeof va === "string" || typeof vb === "string") {
        return String(va ?? "").localeCompare(String(vb ?? ""), "pt-BR") * mult;
      }
      return (Number(va ?? -1) - Number(vb ?? -1)) * mult;
    });
  }, [linhas, fPos, fStatus, fNac, ovrMin, ovrMax, idadeMin, idadeMax, ordem]);

  function ordenar(col: ColKey) {
    setOrdem((o) =>
      o.col === col ? { col, dir: o.dir === "asc" ? "desc" : "asc" } : { col, dir: "desc" },
    );
  }

  const historico = useMemo(() => {
    if (!selecionado) return [];
    return stats
      .filter((s) => s.player_id === selecionado.id)
      .map((s) => ({ s, m: partidas[s.match_id] }))
      .sort((a, b) => (b.m?.data_hora ?? "").localeCompare(a.m?.data_hora ?? ""));
  }, [selecionado, stats, partidas]);

  function limpar() {
    setFPos(TODOS);
    setFStatus(TODOS);
    setFNac(TODOS);
    setOvrMin("");
    setOvrMax("");
    setIdadeMin("");
    setIdadeMax("");
  }

  return (
    <AppShell titulo="Estatísticas do Elenco">
      <div className="pitch-lines min-h-full px-4 py-8 sm:px-8">
        <div className="mx-auto max-w-6xl space-y-6">
          <header>
            <h1 className="text-gradient-pitch text-4xl">Estatísticas do elenco</h1>
            <p className="text-sm text-muted-foreground">
              Números acumulados de cada jogador do elenco principal.
            </p>
          </header>

          {competicoes.length > 0 ? (
            <div className="space-y-2">
              <Label>Competição</Label>
              <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
                {[GERAL, ...competicoes].map((c) => {
                  const ativo = fComp === c;
                  return (
                    <button key={c} type="button" onClick={() => setFComp(c)}>
                      <Badge
                        variant={ativo ? "default" : "outline"}
                        className="cursor-pointer whitespace-nowrap px-3 py-1"
                      >
                        {c === GERAL ? "Geral" : c}
                      </Badge>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          <Card>
            <CardContent className="grid gap-4 py-5 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1.5">
                <Label>Posição</Label>
                <Select value={fPos} onValueChange={setFPos}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={TODOS}>Todas</SelectItem>
                    {POSICOES.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={fStatus} onValueChange={setFStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={TODOS}>Todos</SelectItem>
                    {STATUS_JOGADOR.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Nacionalidade</Label>
                <Select value={fNac} onValueChange={setFNac}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={TODOS}>Todas</SelectItem>
                    {nacionalidades.map((n) => (
                      <SelectItem key={n} value={n}>
                        <Bandeira pais={n} comNome />
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label>Overall mín.</Label>
                  <Input
                    inputMode="numeric"
                    value={ovrMin}
                    onChange={(e) => setOvrMin(e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Overall máx.</Label>
                  <Input
                    inputMode="numeric"
                    value={ovrMax}
                    onChange={(e) => setOvrMax(e.target.value)}
                    placeholder="99"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label>Idade mín.</Label>
                  <Input
                    inputMode="numeric"
                    value={idadeMin}
                    onChange={(e) => setIdadeMin(e.target.value)}
                    placeholder="15"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Idade máx.</Label>
                  <Input
                    inputMode="numeric"
                    value={idadeMax}
                    onChange={(e) => setIdadeMax(e.target.value)}
                    placeholder="45"
                  />
                </div>
              </div>
              <div className="flex items-end">
                <Button variant="ghost" onClick={limpar}>
                  Limpar filtros
                </Button>
              </div>
            </CardContent>
          </Card>

          {mostrarSkeleton ? (
            <SkeletonLinhasTabela linhas={10} colunas={11} />
          ) : carregando ? (
            <div className="h-80" />
          ) : filtradas.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-14 text-center">
                <p className="text-lg font-semibold">Nenhum jogador encontrado</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Ajuste os filtros ou cadastre jogadores no elenco principal.
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {COLUNAS.map((c) => (
                        <TableHead
                          key={c.key}
                          className={`cursor-pointer select-none whitespace-nowrap ${c.num ? "text-right" : ""}`}
                          onClick={() => ordenar(c.key)}
                        >
                          <span
                            className={`inline-flex items-center gap-1 ${c.num ? "flex-row-reverse" : ""}`}
                          >
                            {c.label}
                            {ordem.col === c.key ? (
                              ordem.dir === "asc" ? (
                                <ArrowUp className="h-3 w-3 text-primary" />
                              ) : (
                                <ArrowDown className="h-3 w-3 text-primary" />
                              )
                            ) : (
                              <ChevronsUpDown className="h-3 w-3 opacity-30" />
                            )}
                          </span>
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtradas.map((l) => (
                      <TableRow
                        key={l.id}
                        className="cursor-pointer"
                        onClick={() => setSelecionado(l)}
                      >
                        <TableCell className="whitespace-nowrap font-medium">
                          <span className="inline-flex items-center gap-2">
                            <Bandeira pais={l.nacionalidade} />
                            {l.nome}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{posEn(l.posicao_principal) ?? "—"}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {l.overall ?? "—"}
                        </TableCell>
                        <TableCell className="text-right">{l.idade ?? "—"}</TableCell>
                        <TableCell className="text-right">{l.jogos}</TableCell>
                        <TableCell className="text-right">{l.gols}</TableCell>
                        <TableCell className="text-right">{l.assist}</TableCell>
                        <TableCell className="text-right">
                          {l.notaMedia != null ? l.notaMedia.toFixed(2) : "—"}
                        </TableCell>
                        <TableCell className="text-right">{l.amarelos}</TableCell>
                        <TableCell className="text-right">{l.vermelhos}</TableCell>
                        <TableCell className="text-right">{l.mvps}</TableCell>
                        <TableCell className="text-right">{l.cs}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          )}
        </div>
      </div>

      <PlayerProfileSheet
        playerId={selecionado?.id ?? null}
        saveId={save?.id ?? null}
        seasonId={save?.seasonId ?? null}
        escopoInicial="temporada"
        onOpenChange={(o) => !o && setSelecionado(null)}
        extra={
          selecionado ? (
            <Badge className="bg-accent text-accent-foreground">
              🌟 {selecionado.mvps} vez(es) MVP
              {save?.seasonId ? ` · ${selecionado.mvpsTemporada} na temporada` : ""}
            </Badge>
          ) : null
        }
      />
    </AppShell>
  );
}
