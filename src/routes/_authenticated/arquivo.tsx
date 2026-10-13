import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Archive, Pencil, Trophy } from "lucide-react";
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
import { formatarMoeda, type CodigoMoeda } from "@/lib/moeda";
import { moedaDaPassagem } from "@/lib/moeda-stint";
import { ClubBadge } from "@/components/club-badge";
import { ConfirmarEdicaoArquivada } from "@/components/confirmar-edicao-arquivada";
import { TransferEditDialog, type TransferEditavel } from "@/components/transfer-edit-dialog";
import { TrofeuEditDialog, type TrofeuEditavel } from "@/components/trofeu-edit-dialog";
import { FecharPartidaDialog, type PartidaBase } from "@/components/fechar-partida-dialog";

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
type Transfer = TransferEditavel & { editado_apos_arquivamento?: boolean };
type Trofeu = TrofeuEditavel & { editado_apos_arquivamento?: boolean };

/** Ação de edição pendente da confirmação de "registro arquivado". */
type Pendente =
  | { tipo: "partida"; partida: PartidaBase }
  | { tipo: "transferencia"; transferencia: Transfer }
  | { tipo: "trofeu"; trofeu: Trofeu };

function ArquivoPage() { return <ArquivoPassagem />; }

export function ArquivoPassagem({ stintId, clubeNome }: { stintId?: string; clubeNome?: string | null }) {
  const { save, carregando: carregandoSave } = useSaveAtual();
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [codigoMoeda, setCodigoMoeda] = useState<CodigoMoeda>("EUR");
  const [carregando, setCarregando] = useState(true);
  const [aberta, setAberta] = useState<Season | null>(null);
  const [partidas, setPartidas] = useState<PartidaBase[]>([]);
  const [standings, setStandings] = useState<Linha[]>([]);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [trofeus, setTrofeus] = useState<Trofeu[]>([]);
  const [carregandoDetalhe, setCarregandoDetalhe] = useState(false);

  const [pendente, setPendente] = useState<Pendente | null>(null);
  const [editandoPartida, setEditandoPartida] = useState<PartidaBase | null>(null);
  const [partidaAberta, setPartidaAberta] = useState(false);
  const [editandoTransfer, setEditandoTransfer] = useState<Transfer | null>(null);
  const [editandoTrofeu, setEditandoTrofeu] = useState<Trofeu | null>(null);

  useEffect(() => {
    if (!save) {
      if (!carregandoSave) setCarregando(false);
      return;
    }
    let ativo = true;
    void (async () => {
      const passagemId = stintId ?? save.stintId;
      if (!passagemId) { setCarregando(false); return; }
      setCarregando(true);
      const [{ data }, codigo] = await Promise.all([supabase
        .from("seasons")
        .select("*")
        .eq("stint_id", passagemId)
        .eq("status", "encerrada")
        .order("criado_em", { ascending: false }), moedaDaPassagem(passagemId)]);
      if (!ativo) return;
      setCodigoMoeda(codigo);
      setSeasons((data ?? []) as unknown as Season[]);
      setCarregando(false);
    })();
    return () => { ativo = false; };
  }, [save, carregandoSave, stintId]);

  async function carregarDetalhe(s: Season) {
    setCarregandoDetalhe(true);
    const [{ data: m }, { data: st }, { data: t }, { data: g }] = await Promise.all([
      supabase.from("matches").select("*").eq("season_id", s.id).order("data_hora"),
      supabase
        .from("standings_snapshot")
        .select("*")
        .eq("season_id", s.id)
        .order("rodada", { ascending: false }),
      supabase
        .from("transfers")
        .select(
          "id, tipo, modalidade, clube_contraparte, valor, duracao_emprestimo, janela, data, editado_apos_arquivamento",
        )
        .eq("season_id", s.id)
        .order("data", { ascending: false }),
      supabase
        .from("trophy_gallery")
        .select(
          "id, campeao_clube, vice_clube, editado_apos_arquivamento, competitions(nome, registra_vice)",
        )
        .eq("season_id", s.id),
    ]);
    setPartidas((m ?? []) as unknown as PartidaBase[]);
    setStandings((st ?? []) as Linha[]);
    setTransfers((t ?? []) as unknown as Transfer[]);
    setTrofeus(
      ((g ?? []) as unknown as Array<
        Trofeu & { competitions: { nome: string; registra_vice: boolean } | null }
      >).map((row) => ({
        id: row.id,
        campeao_clube: row.campeao_clube,
        vice_clube: row.vice_clube,
        editado_apos_arquivamento: row.editado_apos_arquivamento ?? false,
        competicao_nome: row.competitions?.nome ?? "Competição",
        registra_vice: row.competitions?.registra_vice ?? false,
      })),
    );
    setCarregandoDetalhe(false);
  }

  async function abrir(s: Season) {
    setAberta(s);
    await carregarDetalhe(s);
  }

  function confirmarPendente() {
    if (!pendente) return;
    if (pendente.tipo === "partida") {
      setEditandoPartida(pendente.partida);
      setPartidaAberta(true);
    } else if (pendente.tipo === "transferencia") {
      setEditandoTransfer(pendente.transferencia);
    } else {
      setEditandoTrofeu(pendente.trofeu);
    }
    setPendente(null);
  }

  const ultimaRodada = useMemo(() => standings[0]?.rodada ?? null, [standings]);
  const tabelaFinal = useMemo(
    () => standings.filter((l) => l.rodada === ultimaRodada),
    [standings, ultimaRodada],
  );

  if (aberta) {
    const r = (aberta.resumo ?? {}) as ResumoSeason;
    const recarregar = () => void carregarDetalhe(aberta);
    return (
      <AppShell titulo="Arquivo de temporadas">
        <div className="pitch-lines min-h-full px-4 py-8 sm:px-8">
          <div className="mx-auto max-w-5xl space-y-6">
            <header className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 className="text-gradient-pitch text-4xl">{aberta.nome}</h1>
                <p className="text-sm text-muted-foreground">
                  Temporada encerrada · edite apenas para corrigir erros de digitação
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
                    formatarMoeda(r.saldo_transferencias, codigoMoeda),
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
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="partidas">Partidas</TabsTrigger>
                  <TabsTrigger value="classificacao">Classificação</TabsTrigger>
                  <TabsTrigger value="transferencias">Transferências</TabsTrigger>
                  <TabsTrigger value="trofeus">Troféus</TabsTrigger>
                </TabsList>

                <TabsContent value="partidas" className="mt-4 space-y-2">
                  {partidas.length === 0 ? (
                    <Vazio texto="Nenhuma partida registrada nesta temporada." />
                  ) : (
                    partidas.map((p) => (
                      <Card key={p.id}>
                        <CardContent className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                          <span className="font-medium">
                            {clubeNome ?? save?.clubeNome ?? "Meu clube"} {p.placar_time ?? "-"} x{" "}
                            {p.placar_adversario ?? "-"} {p.adversario}
                          </span>
                          <span className="flex items-center gap-2 text-xs text-muted-foreground">
                            {p.competicao ?? "—"}
                            {p.data_hora
                              ? ` · ${new Date(p.data_hora).toLocaleDateString("pt-BR")}`
                              : ""}
                            <SeloEditado
                              marcado={
                                (p as { editado_apos_arquivamento?: boolean })
                                  .editado_apos_arquivamento
                              }
                            />
                            <BotaoEditar
                              rotulo="Editar partida"
                              onClick={() => setPendente({ tipo: "partida", partida: p })}
                            />
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
                            {formatarMoeda(t.valor, codigoMoeda)}
                            <SeloEditado marcado={t.editado_apos_arquivamento} />
                            <BotaoEditar
                              rotulo="Editar transferência"
                              onClick={() =>
                                setPendente({ tipo: "transferencia", transferencia: t })
                              }
                            />
                          </span>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </TabsContent>

                <TabsContent value="trofeus" className="mt-4 space-y-2">
                  {trofeus.length === 0 ? (
                    <Vazio texto="Nenhum resultado de competição registrado nesta temporada." />
                  ) : (
                    trofeus.map((g) => (
                      <Card key={g.id}>
                        <CardContent className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                          <span className="flex items-center gap-2">
                            <Trophy className="h-4 w-4 text-primary" />
                            <span className="font-medium">{g.competicao_nome}</span>
                            <span className="flex items-center gap-1.5 text-muted-foreground">
                              🏆 <ClubBadge nome={g.campeao_clube} className="align-middle" />
                              {g.registra_vice && g.vice_clube ? (
                                <>
                                  · 🥈 <ClubBadge nome={g.vice_clube} className="align-middle" />
                                </>
                              ) : null}
                            </span>
                          </span>
                          <span className="flex items-center gap-2">
                            <SeloEditado marcado={g.editado_apos_arquivamento} />
                            <BotaoEditar
                              rotulo="Editar resultado"
                              onClick={() => setPendente({ tipo: "trofeu", trofeu: g })}
                            />
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

        <ConfirmarEdicaoArquivada
          aberto={pendente !== null}
          seasonNome={aberta.nome}
          onOpenChange={(v) => !v && setPendente(null)}
          onConfirmar={confirmarPendente}
        />

        {save ? (
          <FecharPartidaDialog
            partida={editandoPartida}
            saveId={save.id}
            clubeNome={clubeNome ?? save.clubeNome}
            stintId={stintId ?? save.stintId}
            aberto={partidaAberta}
            marcarEditadoAposArquivamento
            onOpenChange={(v) => {
              setPartidaAberta(v);
              if (!v) setEditandoPartida(null);
            }}
            onSalvo={recarregar}
          />
        ) : null}

        <TransferEditDialog
          transferencia={editandoTransfer}
          marcarEditadoAposArquivamento
          descricao="Correção pontual de uma negociação de temporada encerrada."
          onOpenChange={(v) => !v && setEditandoTransfer(null)}
          onSalvo={recarregar}
        />

        <TrofeuEditDialog
          registro={editandoTrofeu}
          clubeNome={clubeNome ?? save?.clubeNome ?? null}
          marcarEditadoAposArquivamento
          onOpenChange={(v) => !v && setEditandoTrofeu(null)}
          onSalvo={recarregar}
        />
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
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => void abrir(s)}
                    className="text-left"
                  >
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

function BotaoEditar({ rotulo, onClick }: { rotulo: string; onClick: () => void }) {
  return (
    <Button size="icon" variant="ghost" aria-label={rotulo} onClick={onClick}>
      <Pencil className="h-4 w-4" />
    </Button>
  );
}

function SeloEditado({ marcado }: { marcado?: boolean | undefined }) {
  if (!marcado) return null;
  return (
    <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
      Corrigido
    </Badge>
  );
}

function Vazio({ texto }: { texto: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
      {texto}
    </div>
  );
}
