import { ClubBadge } from "@/components/club-badge";
import { ClubAutocomplete } from "@/components/club-autocomplete";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, CalendarPlus, ClipboardCheck, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { COMPETICOES, FASES_COPA, ehCopa } from "@/lib/match-data";
import { lerDataCarreira, partidasAtrasadas } from "@/lib/carreira-data";
import { supabase } from "@/integrations/supabase/client";
import { HoverCard, StaggerItem } from "@/components/motion";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { FecharPartidaDialog, type PartidaBase } from "@/components/fechar-partida-dialog";
import { ICONE_COMPETICAO } from "@/lib/match-data";
import { useSaveAtual } from "@/lib/use-save";

export const Route = createFileRoute("/_authenticated/partidas")({
  head: () => ({
    meta: [
      { title: "Partidas | Carreira FC Manager" },
      { name: "description", content: "Registre resultados e estatísticas das partidas do clube." },
      { property: "og:title", content: "Partidas | Carreira FC Manager" },
      {
        property: "og:description",
        content: "Registre resultados e estatísticas das partidas do clube.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PartidasPage,
});

function resultado(p: PartidaBase) {
  const a = p.placar_time ?? 0;
  const b = p.placar_adversario ?? 0;
  if (a > b) return { letra: "V", classe: "bg-emerald-500/15 text-emerald-400" };
  if (a < b) return { letra: "D", classe: "bg-red-500/15 text-red-400" };
  return { letra: "E", classe: "bg-amber-500/15 text-amber-400" };
}

function PartidasPage() {
  const { save, carregando: carregandoSave } = useSaveAtual();
  const [partidas, setPartidas] = useState<PartidaBase[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [selecionada, setSelecionada] = useState<PartidaBase | null>(null);
  const [aberto, setAberto] = useState(false);
  const [formAberto, setFormAberto] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [salvandoForm, setSalvandoForm] = useState(false);
  const [excluindo, setExcluindo] = useState<PartidaBase | null>(null);
  const [form, setForm] = useState({
    dia: "2026-07-01",
    hora: "16:00",
    competicao: "Liga",
    adversario: "",
    mando: "casa" as "casa" | "fora",
    fase: "",
  });

  const [nomesMvp, setNomesMvp] = useState<Record<string, string>>({});

  const carregar = useCallback(async (saveId: string, seasonId: string | null) => {
    let q = supabase.from("matches").select("*").eq("save_id", saveId);
    if (seasonId) q = q.eq("season_id", seasonId);
    const { data } = await q.order("data_hora", { ascending: false });
    const lista = (data ?? []) as PartidaBase[];
    setPartidas(lista);

    const ids = Array.from(
      new Set(lista.map((p) => p.mvp_player_id).filter((x): x is string => Boolean(x))),
    );
    if (ids.length > 0) {
      const { data: jogadores } = await supabase.from("players").select("id, nome").in("id", ids);
      const mapa: Record<string, string> = {};
      for (const j of (jogadores ?? []) as { id: string; nome: string }[]) mapa[j.id] = j.nome;
      setNomesMvp(mapa);
    } else {
      setNomesMvp({});
    }
    setCarregando(false);
  }, []);

  useEffect(() => {
    if (!save) {
      if (!carregandoSave) setCarregando(false);
      return;
    }
    void carregar(save.id, save.seasonId);
  }, [save, carregandoSave, carregar]);

  const dataCarreira = save ? lerDataCarreira(save.id) : null;
  const atrasadas = partidasAtrasadas(partidas, dataCarreira);

  function novaPartida() {
    setEditandoId(null);
    setForm({
      dia: dataCarreira ?? "2026-07-01",
      hora: "16:00",
      competicao: "Liga",
      adversario: "",
      mando: "casa",
      fase: "",
    });
    setFormAberto(true);
  }

  function editarPartida(p: PartidaBase) {
    const d = p.data_hora ? new Date(p.data_hora) : new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    setEditandoId(p.id);
    setForm({
      dia: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
      hora: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
      competicao: p.competicao ?? "Liga",
      adversario: p.adversario ?? "",
      mando: ((p as { mando?: string }).mando as "casa" | "fora") ?? "casa",
      fase: (p as { fase?: string | null }).fase ?? "",
    });
    setFormAberto(true);
  }

  async function salvarForm() {
    if (!save) return;
    if (!form.adversario.trim()) {
      toast.error("Informe o adversário.");
      return;
    }
    setSalvandoForm(true);
    const dataHora = new Date(`${form.dia}T${form.hora || "00:00"}:00`).toISOString();
    const payload = {
      data_hora: dataHora,
      competicao: form.competicao,
      adversario: form.adversario.trim(),
      mando: form.mando,
      fase: ehCopa(form.competicao) && form.fase ? form.fase : null,
    };
    const { error } = editandoId
      ? await supabase.from("matches").update(payload).eq("id", editandoId)
      : await supabase
          .from("matches")
          .insert({ ...payload, save_id: save.id, season_id: save.seasonId, status: "agendada" });
    setSalvandoForm(false);
    if (error) {
      toast.error("Não foi possível salvar a partida.");
      return;
    }
    toast.success(editandoId ? "Partida atualizada!" : "Partida agendada!");
    setFormAberto(false);
    void carregar(save.id, save.seasonId);
  }

  async function excluirPartida() {
    if (!excluindo || !save) return;
    await supabase.from("match_player_stats").delete().eq("match_id", excluindo.id);
    await supabase
      .from("news_feed")
      .update({ relacionado_match_id: null })
      .eq("relacionado_match_id", excluindo.id);
    const { error } = await supabase.from("matches").delete().eq("id", excluindo.id);
    if (error) {
      toast.error("Não foi possível excluir a partida.");
      return;
    }
    toast.success("Partida excluída.");
    setExcluindo(null);
    void carregar(save.id, save.seasonId);
  }

  const agendadas = partidas.filter((p) => p.status !== "finalizada");
  const finalizadas = partidas.filter((p) => p.status === "finalizada");

  function abrir(p: PartidaBase) {
    setSelecionada(p);
    setAberto(true);
  }

  return (
    <AppShell titulo="Partidas">
      <div className="pitch-lines min-h-full px-4 py-8 sm:px-8">
        <div className="mx-auto max-w-4xl space-y-8">
          <header className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-gradient-pitch text-4xl">Partidas</h1>
              <p className="text-sm text-muted-foreground">
                Feche os jogos e alimente as estatísticas do elenco.
              </p>
            </div>
            <div className="flex gap-2">
              <Button asChild variant="outline">
                <Link to="/calendario">
                  <CalendarPlus className="mr-1 h-4 w-4" /> Calendário
                </Link>
              </Button>
              <Button onClick={novaPartida} disabled={!save}>
                <Plus className="mr-1 h-4 w-4" /> Nova partida
              </Button>
            </div>
          </header>

          {atrasadas.length > 0 ? (
            <Card className="border-amber-500/40 bg-amber-500/10">
              <CardContent className="space-y-1 py-4">
                <p className="flex items-center gap-2 font-semibold text-amber-400">
                  <AlertTriangle className="h-4 w-4" /> {atrasadas.length} jogo(s) já passaram da
                  data atual da carreira e continuam abertos
                </p>
                <p className="text-sm text-muted-foreground">
                  Feche os jogos abaixo para manter as estatísticas em dia.
                </p>
              </CardContent>
            </Card>
          ) : null}

          {carregando ? (
            <Skeleton className="h-64 w-full rounded-xl" />
          ) : partidas.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-14 text-center">
                <p className="text-lg font-semibold">Nenhuma partida registrada</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Agende o primeiro jogo pelo calendário para começar o histórico da temporada.
                </p>
                <Button asChild className="mt-5">
                  <Link to="/calendario">Ir para o calendário</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              <section className="space-y-3">
                <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Agendadas ({agendadas.length})
                </h2>
                {agendadas.length === 0 ? (
                  <Card className="border-dashed">
                    <CardContent className="py-8 text-center text-sm text-muted-foreground">
                      Nenhuma partida agendada no momento.
                    </CardContent>
                  </Card>
                ) : (
                  agendadas.map((p, i) => (
                    <StaggerItem key={p.id} index={i}>
                    <HoverCard>
                    <Card>
                      <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
                        <div>
                          <p className="flex flex-wrap items-center gap-1.5 font-semibold">
                            <span>{ICONE_COMPETICAO[p.competicao ?? ""] ?? "⚽"}</span>
                            {(p as { mando?: string }).mando === "fora" ? (
                              <>
                                <ClubBadge nome={p.adversario} />
                                <span>x</span>
                                <ClubBadge nome={save?.clubeNome} escudoUrl={save?.escudo} />
                              </>
                            ) : (
                              <>
                                <ClubBadge nome={save?.clubeNome} escudoUrl={save?.escudo} />
                                <span>x</span>
                                <ClubBadge nome={p.adversario} />
                              </>
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {(p as { mando?: string }).mando === "fora"
                              ? "✈️ Fora"
                              : "🏟️ Casa"}{" "}
                            · {p.competicao ?? "—"}
                            {p.data_hora
                              ? ` · ${new Date(p.data_hora).toLocaleString("pt-BR", {
                                  day: "2-digit",
                                  month: "short",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}`
                              : ""}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button onClick={() => abrir(p)}>
                            <ClipboardCheck className="mr-1 h-4 w-4" /> Fechar partida
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            aria-label="Editar partida"
                            onClick={() => editarPartida(p)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            aria-label="Excluir partida"
                            onClick={() => setExcluindo(p)}
                          >
                            <Trash2 className="h-4 w-4 text-red-400" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                    </HoverCard>
                    </StaggerItem>
                  ))
                )}
              </section>

              <section className="space-y-3">
                <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Finalizadas ({finalizadas.length})
                </h2>
                {finalizadas.length === 0 ? (
                  <Card className="border-dashed">
                    <CardContent className="py-8 text-center text-sm text-muted-foreground">
                      Ainda não há partidas disputadas.
                    </CardContent>
                  </Card>
                ) : (
                  finalizadas.map((p, i) => {
                    const r = resultado(p);
                    return (
                      <StaggerItem key={p.id} index={i}>
                      <HoverCard>
                      <Card>
                        <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
                          <div className="flex items-center gap-3">
                            <span
                              className={`flex h-9 w-9 items-center justify-center rounded-lg text-sm font-bold ${r.classe}`}
                            >
                              {r.letra}
                            </span>
                            <div>
                              <p className="flex flex-wrap items-center gap-1.5 font-semibold">
                                <span>{ICONE_COMPETICAO[p.competicao ?? ""] ?? "⚽"}</span>
                                <ClubBadge nome={save?.clubeNome} escudoUrl={save?.escudo} />
                                <span>
                                  {p.placar_time ?? 0} x {p.placar_adversario ?? 0}
                                </span>
                                <ClubBadge nome={p.adversario} />
                                {p.mvp_player_id && nomesMvp[p.mvp_player_id] ? (
                                  <span className="ml-2 inline-flex items-center rounded-full bg-accent/15 px-2 py-0.5 align-middle text-[11px] font-medium text-accent">
                                    ⭐ MVP: {nomesMvp[p.mvp_player_id]}
                                  </span>
                                ) : null}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {p.competicao ?? "—"}
                                {p.data_hora
                                  ? ` · ${new Date(p.data_hora).toLocaleDateString("pt-BR")}`
                                  : ""}
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button variant="outline" onClick={() => abrir(p)}>
                              <ClipboardCheck className="mr-1 h-4 w-4" /> Reabrir
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              aria-label="Editar partida"
                              onClick={() => editarPartida(p)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              aria-label="Excluir partida"
                              onClick={() => setExcluindo(p)}
                            >
                              <Trash2 className="h-4 w-4 text-red-400" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                      </HoverCard>
                      </StaggerItem>
                    );
                  })
                )}
              </section>
            </>
          )}
        </div>
      </div>

      <Dialog open={formAberto} onOpenChange={setFormAberto}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editandoId ? "Editar partida" : "Nova partida"}</DialogTitle>
            <DialogDescription>
              Defina data, competição e adversário do confronto.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1">
                <Label>Data</Label>
                <Input
                  type="date"
                  value={form.dia}
                  onChange={(e) => setForm({ ...form, dia: e.target.value })}
                />
              </div>
              <div className="grid gap-1">
                <Label>Horário</Label>
                <Input
                  type="time"
                  value={form.hora}
                  onChange={(e) => setForm({ ...form, hora: e.target.value })}
                />
              </div>
            </div>
            <div className="grid gap-1">
              <Label>Competição</Label>
              <Select
                value={form.competicao}
                onValueChange={(v) =>
                  setForm({ ...form, competicao: v, fase: ehCopa(v) ? form.fase : "" })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COMPETICOES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {ehCopa(form.competicao) ? (
              <div className="grid gap-1">
                <Label>Fase da copa</Label>
                <Select value={form.fase} onValueChange={(v) => setForm({ ...form, fase: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a fase" />
                  </SelectTrigger>
                  <SelectContent>
                    {FASES_COPA.map((f) => (
                      <SelectItem key={f} value={f}>
                        {f}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
            <div className="grid gap-1">
              <Label>Mando de campo</Label>
              <div className="grid grid-cols-2 gap-2">
                {(["casa", "fora"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setForm({ ...form, mando: m })}
                    className={
                      "rounded-lg border px-3 py-2 text-sm transition-colors " +
                      (form.mando === m
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:border-primary/50")
                    }
                  >
                    {m === "casa" ? "🏟️ Casa (Home)" : "✈️ Fora (Away)"}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid gap-1">
              <Label>Adversário</Label>
              <ClubAutocomplete
                value={form.adversario}
                leagueId={save?.leagueId ?? null}
                onChange={(v) => setForm({ ...form, adversario: v })}
                placeholder="Nome do clube adversário"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setFormAberto(false)}>
              Cancelar
            </Button>
            <Button onClick={() => void salvarForm()} disabled={salvandoForm}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={excluindo !== null} onOpenChange={(v) => !v && setExcluindo(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Excluir partida</DialogTitle>
            <DialogDescription>
              A partida e as estatísticas individuais dela serão apagadas.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setExcluindo(null)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={() => void excluirPartida()}>
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {save ? (
        <FecharPartidaDialog
          partida={selecionada}
          saveId={save.id}
          clubeNome={save.clubeNome}
          aberto={aberto}
          onOpenChange={setAberto}
          onSalvo={() => void carregar(save.id, save.seasonId)}
        />
      ) : null}
    </AppShell>
  );
}
