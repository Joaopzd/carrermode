import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Archive, Pencil, Trophy } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ResumoSeason, Season } from "@/lib/season";
import { useSaveAtual } from "@/lib/use-save";
import { ClubBadge } from "@/components/club-badge";
import { ClubAutocomplete } from "@/components/club-autocomplete";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/arquivo")({
  head: () => ({
    meta: [
      { title: "Arquivo de temporadas | Carreira FC Manager" },
      {
        name: "description",
        content: "Consulte o histórico das temporadas encerradas da sua carreira no clube.",
      },
      { property: "og:title", content: "Arquivo de temporadas | Carreira FC Manager" },
      {
        property: "og:description",
        content: "Resumos, partidas, classificação e transferências de temporadas encerradas.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ArquivoPage,
});

type Partida = {
  id: string;
  data_hora: string | null;
  competicao: string | null;
  adversario: string | null;
  placar_time: number | null;
  placar_adversario: number | null;
  status: string;
};
type Linha = {
  id: string;
  rodada: number | null;
  posicao: number | null;
  time: string;
  pontos: number;
  jogos: number;
  vitorias: number;
  empates: number;
  derrotas: number;
  gols_pro: number;
  gols_contra: number;
  saldo: number;
};
type Transfer = {
  id: string;
  tipo: string;
  modalidade: string | null;
  clube_contraparte: string | null;
  valor: number | null;
  data: string;
};

function ArquivoPage() {
  const { save, carregando: carregandoSave } = useSaveAtual();
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [aberta, setAberta] = useState<Season | null>(null);
  const [partidas, setPartidas] = useState<Partida[]>([]);
  const [standings, setStandings] = useState<Linha[]>([]);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [carregandoDetalhe, setCarregandoDetalhe] = useState(false);
  const [editando, setEditando] = useState<Transfer | null>(null);
  const [clubeEdit, setClubeEdit] = useState("");
  const [salvandoClube, setSalvandoClube] = useState(false);

  async function salvarClubeTransfer() {
    if (!editando) return;
    const nome = clubeEdit.trim();
    if (!nome) {
      toast.error("Informe o clube da negociação.");
      return;
    }
    setSalvandoClube(true);
    const { error } = await supabase
      .from("transfers")
      .update({ clube_contraparte: nome })
      .eq("id", editando.id);
    setSalvandoClube(false);
    if (error) {
      toast.error("Não foi possível atualizar o clube.");
      return;
    }
    setTransfers((lista) =>
      lista.map((t) => (t.id === editando.id ? { ...t, clube_contraparte: nome } : t)),
    );
    toast.success("Clube da negociação atualizado.");
    setEditando(null);
  }

  useEffect(() => {
    if (!save) {
      if (!carregandoSave) setCarregando(false);
      return;
    }
    void (async () => {
      const { data } = await supabase
        .from("seasons")
        .select("*")
        .eq("save_id", save.id)
        .eq("status", "encerrada")
        .order("criado_em", { ascending: false });
      setSeasons((data ?? []) as unknown as Season[]);
      setCarregando(false);
    })();
  }, [save, carregandoSave]);

  async function abrir(s: Season) {
    setAberta(s);
    setCarregandoDetalhe(true);
    const [{ data: m }, { data: st }, { data: t }] = await Promise.all([
      supabase
        .from("matches")
        .select("id, data_hora, competicao, adversario, placar_time, placar_adversario, status")
        .eq("season_id", s.id)
        .order("data_hora", { ascending: true }),
      supabase
        .from("standings_snapshot")
        .select("*")
        .eq("season_id", s.id)
        .order("rodada", { ascending: false }),
      supabase
        .from("transfers")
        .select("id, tipo, modalidade, clube_contraparte, valor, data")
        .eq("season_id", s.id)
        .order("data", { ascending: false }),
    ]);
    setPartidas((m ?? []) as Partida[]);
    setStandings((st ?? []) as Linha[]);
    setTransfers((t ?? []) as Transfer[]);
    setCarregandoDetalhe(false);
  }

  const ultimaRodada = useMemo(() => standings[0]?.rodada ?? null, [standings]);
  const tabelaFinal = useMemo(
    () => standings.filter((l) => l.rodada === ultimaRodada),
    [standings, ultimaRodada],
  );

  if (aberta) {
    const r = (aberta.resumo ?? {}) as ResumoSeason;
    return (
      <AppShell titulo="Arquivo de temporadas">
        <div className="pitch-lines min-h-full px-4 py-8 sm:px-8">
          <div className="mx-auto max-w-5xl space-y-6">
            <header className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 className="text-gradient-pitch text-4xl">{aberta.nome}</h1>
                <p className="text-sm text-muted-foreground">
                  Temporada encerrada · somente leitura
                </p>
              </div>
              <Button variant="outline" onClick={() => setAberta(null)}>
                Voltar ao arquivo
              </Button>
            </header>

            <Card className="glow-panel">
              <CardContent className="grid gap-4 py-5 sm:grid-cols-3 lg:grid-cols-4">
                {[
                  ["Posição final", r.posicao_final ?? "—"],
                  ["Pontos", r.pontos ?? "—"],
                  ["Campanha", `${r.vitorias ?? 0}V ${r.empates ?? 0}E ${r.derrotas ?? 0}D`],
                  ["Gols", `${r.gols_pro ?? 0} : ${r.gols_contra ?? 0}`],
                  [
                    "Artilheiro",
                    r.artilheiro ? `${r.artilheiro.nome} (${r.artilheiro.gols})` : "—",
                  ],
                  [
                    "Desfecho",
                    r.movimento === "acesso"
                      ? `Acesso${r.liga_nova ? ` → ${r.liga_nova}` : ""}`
                      : r.movimento === "rebaixamento"
                        ? `Rebaixamento${r.liga_nova ? ` → ${r.liga_nova}` : ""}`
                        : (r.zona_final ?? "Permanência"),
                  ],
                  [
                    "Classificado para",
                    r.competicoes_classificado?.length
                      ? r.competicoes_classificado.join(", ")
                      : "—",
                  ],
                  [
                    "Saldo de transferências",
                    r.saldo_transferencias != null
                      ? Number(r.saldo_transferencias).toLocaleString("pt-BR")
                      : "—",
                  ],
                ].map(([rot, val]) => (
                  <div key={String(rot)}>
                    <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
                      {rot}
                    </p>
                    <p className="truncate font-display text-2xl">{val}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            {carregandoDetalhe ? (
              <Skeleton className="h-64 w-full rounded-xl" />
            ) : (
              <Tabs defaultValue="partidas">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="partidas">Partidas</TabsTrigger>
                  <TabsTrigger value="classificacao">Classificação</TabsTrigger>
                  <TabsTrigger value="transferencias">Transferências</TabsTrigger>
                </TabsList>

                <TabsContent value="partidas" className="mt-4 space-y-2">
                  {partidas.length === 0 ? (
                    <Vazio texto="Nenhuma partida registrada nesta temporada." />
                  ) : (
                    partidas.map((p) => (
                      <Card key={p.id}>
                        <CardContent className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                          <span className="font-medium">
                            {save?.clubeNome ?? "Meu clube"} {p.placar_time ?? "-"} x{" "}
                            {p.placar_adversario ?? "-"} {p.adversario}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {p.competicao ?? "—"}
                            {p.data_hora
                              ? ` · ${new Date(p.data_hora).toLocaleDateString("pt-BR")}`
                              : ""}
                          </span>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </TabsContent>

                <TabsContent value="classificacao" className="mt-4">
                  {tabelaFinal.length === 0 ? (
                    <Vazio texto="Nenhuma tabela sincronizada nesta temporada." />
                  ) : (
                    <Card className="overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>#</TableHead>
                            <TableHead>Time</TableHead>
                            <TableHead className="text-right">P</TableHead>
                            <TableHead className="text-right">J</TableHead>
                            <TableHead className="text-right">V/E/D</TableHead>
                            <TableHead className="text-right">SG</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {tabelaFinal.map((l) => (
                            <TableRow key={l.id}>
                              <TableCell>{l.posicao ?? "—"}</TableCell>
                              <TableCell className="font-medium">{l.time}</TableCell>
                              <TableCell className="text-right">{l.pontos}</TableCell>
                              <TableCell className="text-right">{l.jogos}</TableCell>
                              <TableCell className="text-right">
                                {l.vitorias}/{l.empates}/{l.derrotas}
                              </TableCell>
                              <TableCell className="text-right">{l.saldo}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </Card>
                  )}
                </TabsContent>

                <TabsContent value="transferencias" className="mt-4 space-y-2">
                  {transfers.length === 0 ? (
                    <Vazio texto="Nenhuma transferência nesta temporada." />
                  ) : (
                    transfers.map((t) => (
                      <Card key={t.id}>
                        <CardContent className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                          <span className="flex items-center gap-2">
                            <Badge variant={t.tipo === "entrada" ? "default" : "secondary"}>
                              {t.tipo === "entrada" ? "Entrada" : "Saída"}
                            </Badge>
                            <span className="flex items-center gap-1.5 text-muted-foreground">
                              {t.modalidade ?? "—"} ·{" "}
                              <ClubBadge nome={t.clube_contraparte} className="align-middle" />
                            </span>
                          </span>
                          <span className="flex items-center gap-2 font-medium">
                            {t.valor != null ? Number(t.valor).toLocaleString("pt-BR") : "—"}
                            <Button
                              size="icon"
                              variant="ghost"
                              aria-label="Editar clube da negociação"
                              onClick={() => {
                                setEditando(t);
                                setClubeEdit(t.clube_contraparte ?? "");
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </span>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </TabsContent>
              </Tabs>
            )}
          </div>
        </div>

        <Dialog open={editando !== null} onOpenChange={(o) => !o && setEditando(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Editar clube da negociação</DialogTitle>
              <DialogDescription>
                Nesta temporada arquivada só é possível corrigir o clube envolvido na transferência.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Label htmlFor="clube-transfer">Clube</Label>
              <ClubAutocomplete
                id="clube-transfer"
                placeholder="Nome do clube"
                value={clubeEdit}
                leagueId={save?.leagueId ?? null}
                onChange={setClubeEdit}
              />
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setEditando(null)}>
                Cancelar
              </Button>
              <Button onClick={() => void salvarClubeTransfer()} disabled={salvandoClube}>
                Salvar clube
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </AppShell>
    );
  }

  return (
    <AppShell titulo="Arquivo de temporadas">
      <div className="pitch-lines min-h-full px-4 py-8 sm:px-8">
        <div className="mx-auto max-w-4xl space-y-6">
          <header>
            <h1 className="text-gradient-pitch text-4xl">Arquivo de temporadas</h1>
            <p className="text-sm text-muted-foreground">
              Reveja a história do clube temporada a temporada.
            </p>
          </header>

          {carregando ? (
            <Skeleton className="h-48 w-full rounded-xl" />
          ) : seasons.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-14 text-center">
                <Archive className="mx-auto h-8 w-8 text-muted-foreground" />
                <p className="mt-3 text-lg font-semibold">Nenhuma temporada encerrada</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Use o botão "Encerrar temporada" no dashboard para arquivar a temporada atual.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {seasons.map((s) => {
                const r = (s.resumo ?? {}) as ResumoSeason;
                return (
                  <button key={s.id} type="button" onClick={() => void abrir(s)} className="text-left">
                    <Card className="hq-card h-full transition-colors hover:border-primary/60">
                      <CardContent className="space-y-2 py-4">
                        <p className="font-display text-2xl tracking-wide">{s.nome}</p>
                        <p className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Trophy className="h-4 w-4 text-primary" />
                          {r.posicao_final ? `${r.posicao_final}º lugar` : "Posição não informada"}
                          {r.pontos != null ? ` · ${r.pontos} pts` : ""}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {r.artilheiro
                            ? `Artilheiro: ${r.artilheiro.nome} (${r.artilheiro.gols})`
                            : "Sem artilheiro registrado"}
                        </p>
                      </CardContent>
                    </Card>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}

function Vazio({ texto }: { texto: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
      {texto}
    </div>
  );
}
