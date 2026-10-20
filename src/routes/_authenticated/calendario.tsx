import { ClubBadge } from "@/components/club-badge";
import { ClubAutocomplete } from "@/components/club-autocomplete";
import { Link, createFileRoute } from "@tanstack/react-router";
import { ativarChegadasPorData, janelaAberta } from "@/lib/transferencias-futuras";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeftRight,
  CalendarCheck,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Plus,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useSaveAtual } from "@/lib/use-save";
import {
  COMPETICOES,
  DIAS_SEMANA,
  FASES_COPA,
  ICONE_COMPETICAO,
  MESES,
  chaveDia,
  ehCopa,
  faixaCompeticao,
} from "@/lib/match-data";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  formatarDia,
  lerDataCarreira,
  partidasAtrasadas,
  salvarDataCarreira,
  somarDias,
} from "@/lib/carreira-data";

export const Route = createFileRoute("/_authenticated/calendario")({
  head: () => ({
    meta: [
      { title: "Calendário | Carreira FC Manager" },
      {
        name: "description",
        content: "Agende partidas da temporada e organize o calendário do seu clube.",
      },
      { property: "og:title", content: "Calendário | Carreira FC Manager" },
      {
        property: "og:description",
        content: "Agende partidas da temporada e organize o calendário do seu clube.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CalendarioPage,
});

/** Verão: 01/07 a 31/08 · Inverno: 01/01 a 31/01. */
function rotuloJanela(dia: string): "verao" | "inverno" {
  return Number(dia.slice(5, 7)) === 1 ? "inverno" : "verao";
}

const ROTULO_JANELA: Record<"verao" | "inverno", string> = {
  verao: "Janela de verão",
  inverno: "Janela de inverno",
};

type Partida = {
  id: string;
  data_hora: string | null;
  competicao: string | null;
  adversario: string | null;
  status: string;
  placar_time: number | null;
  placar_adversario: number | null;
};

function CalendarioPage() {
  const { save, carregando: carregandoSave } = useSaveAtual();
  const [partidas, setPartidas] = useState<Partida[]>([]);
  const [carregando, setCarregando] = useState(true);
  // A temporada começa em 01/07/2026 — o usuário avança os meses conforme o jogo evolui.
  const [mes, setMes] = useState(() => new Date(2026, 6, 1));
  const [diaSelecionado, setDiaSelecionado] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [form, setForm] = useState({
    hora: "16:00",
    competicao: "Liga",
    adversario: "",
    mando: "casa" as "casa" | "fora",
    fase: "",
  });
  const [dataAtual, setDataAtual] = useState("2026-07-01");

  useEffect(() => {
    if (!save) return;
    const salvo = lerDataCarreira(save.id) ?? "2026-07-01";
    setDataAtual(salvo);
    setMes(new Date(`${salvo}T12:00:00`.slice(0, 4) + "-01-01"));
    const d = new Date(`${salvo}T12:00:00`);
    setMes(new Date(d.getFullYear(), d.getMonth(), 1));
  }, [save]);

  function definirDia(novo: string) {
    setDataAtual(novo);
    if (save) salvarDataCarreira(save.id, novo);
    const d = new Date(`${novo}T12:00:00`);
    setMes(new Date(d.getFullYear(), d.getMonth(), 1));
    // Abertura de janela: contratações agendadas para esta data entram no elenco.
    if (save?.stintId) {
      void ativarChegadasPorData(save.id, save.stintId, novo).then((r) => {
        if (r.ativados > 0) toast.success(`Janela aberta! Chegaram ao elenco: ${r.nomes.join(", ")}.`);
      });
    }
  }

  const carregar = useCallback(async (saveId: string, seasonId: string | null, stintId: string) => {
    let q = supabase
      .from("matches")
      .select("id, data_hora, competicao, adversario, status, placar_time, placar_adversario")
      .eq("stint_id", stintId);
    if (seasonId) q = q.eq("season_id", seasonId);
    const { data } = await q.order("data_hora", { ascending: true });
    setPartidas((data ?? []) as Partida[]);
    setCarregando(false);
  }, []);

  useEffect(() => {
    if (!save) {
      if (!carregandoSave) setCarregando(false);
      return;
    }
    void carregar(save.id, save.seasonId, save.stintId ?? "");
  }, [save, carregandoSave, carregar]);

  const porDia = useMemo(() => {
    const mapa = new Map<string, Partida[]>();
    for (const p of partidas) {
      if (!p.data_hora) continue;
      const k = chaveDia(new Date(p.data_hora));
      mapa.set(k, [...(mapa.get(k) ?? []), p]);
    }
    return mapa;
  }, [partidas]);

  const celulas = useMemo(() => {
    const primeiro = new Date(mes.getFullYear(), mes.getMonth(), 1);
    const inicio = new Date(primeiro);
    inicio.setDate(1 - primeiro.getDay());
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(inicio);
      d.setDate(inicio.getDate() + i);
      return d;
    });
  }, [mes]);

  async function salvarPartida() {
    if (!save || !diaSelecionado) return;
    if (!form.adversario.trim()) {
      toast.error("Informe o adversário.");
      return;
    }
    setSalvando(true);
    const dataHora = new Date(`${diaSelecionado}T${form.hora || "00:00"}:00`);
    const { error } = await supabase.from("matches").insert({
      save_id: save.id,
        stint_id: save.stintId,
      season_id: save.seasonId,
      data_hora: dataHora.toISOString(),
      competicao: form.competicao,
      adversario: form.adversario.trim(),
      mando: form.mando,
      fase: ehCopa(form.competicao) && form.fase ? form.fase : null,
      status: "agendada",
    });
    setSalvando(false);
    if (error) {
      toast.error("Não foi possível agendar a partida.");
      return;
    }
    toast.success("Partida agendada!");
    setForm({ hora: "16:00", competicao: "Liga", adversario: "", mando: "casa", fase: "" });
    setDiaSelecionado(null);
    void carregar(save.id, save.seasonId, save.stintId ?? "");
  }

  const atrasadas = useMemo(() => partidasAtrasadas(partidas, dataAtual), [partidas, dataAtual]);

  const partidasDoDia = diaSelecionado ? (porDia.get(diaSelecionado) ?? []) : [];

  return (
    <AppShell titulo="Calendário">
      <div className="pitch-lines min-h-full px-4 py-8 sm:px-8">
        <div className="mx-auto max-w-6xl space-y-6">
          <header className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-gradient-pitch text-4xl">Calendário</h1>
              <p className="text-sm text-muted-foreground">
                {save?.clubeNome ? `${save.clubeNome} · ` : ""}Temporada {save?.temporada ?? "—"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                aria-label="Mês anterior"
                onClick={() => setMes(new Date(mes.getFullYear(), mes.getMonth() - 1, 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="min-w-44 text-center text-lg font-semibold uppercase tracking-wide">
                {MESES[mes.getMonth()]} {mes.getFullYear()}
              </span>
              <Button
                variant="outline"
                size="icon"
                aria-label="Próximo mês"
                onClick={() => setMes(new Date(mes.getFullYear(), mes.getMonth() + 1, 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </header>

          <Card className="hq-card">
            <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
              <div className="flex items-center gap-3">
                <CalendarCheck className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-xs uppercase tracking-widest text-muted-foreground">
                    Dia atual da carreira
                  </p>
                  <p className="font-display text-xl capitalize tracking-wide">
                    {formatarDia(dataAtual)}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  type="date"
                  className="w-44"
                  value={dataAtual}
                  onChange={(e) => e.target.value && definirDia(e.target.value)}
                />
                <Button variant="outline" onClick={() => definirDia(somarDias(dataAtual, 1))}>
                  +1 dia
                </Button>
                <Button variant="outline" onClick={() => definirDia(somarDias(dataAtual, 7))}>
                  +7 dias
                </Button>
              </div>
            </CardContent>
          </Card>

          {atrasadas.length > 0 ? (
            <Card className="border-amber-500/40 bg-amber-500/10">
              <CardContent className="space-y-2 py-4">
                <p className="flex items-center gap-2 font-semibold text-amber-400">
                  <AlertTriangle className="h-4 w-4" /> {atrasadas.length} jogo(s) passaram sem
                  serem fechados
                </p>
                {atrasadas.map((p) => (
                  <p key={p.id} className="text-sm text-muted-foreground">
                    {ICONE_COMPETICAO[p.competicao ?? ""] ?? "⚽"}{" "}
                    <ClubBadge nome={p.adversario} className="align-middle" /> ·{" "}
                    {p.data_hora ? new Date(p.data_hora).toLocaleDateString("pt-BR") : "—"}
                  </p>
                ))}
                <Button asChild size="sm" variant="outline" className="mt-1">
                  <Link to="/partidas">Fechar partidas</Link>
                </Button>
              </CardContent>
            </Card>
          ) : null}

          {carregando ? (
            <Skeleton className="h-[520px] w-full rounded-xl" />
          ) : (
            <Card className="overflow-hidden">
              <CardContent className="p-0">
                <div className="grid grid-cols-7 border-b bg-muted/40">
                  {DIAS_SEMANA.map((d) => (
                    <div
                      key={d}
                      className="py-2 text-center text-xs font-semibold uppercase tracking-widest text-muted-foreground"
                    >
                      {d}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7">
                  {celulas.map((d) => {
                    const k = chaveDia(d);
                    const doMes = d.getMonth() === mes.getMonth();
                    const eHoje = k === dataAtual;
                    const jogos = porDia.get(k) ?? [];
                    return (
                      <button
                        key={k}
                        type="button"
                        onClick={() => setDiaSelecionado(k)}
                        className={`group min-h-24 border-b border-r p-2 text-left transition-colors hover:bg-accent/40 ${
                          doMes ? "" : "opacity-40"
                        }`}
                      >
                        <span
                          className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                            eHoje ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                          }`}
                        >
                          {d.getDate()}
                        </span>
                        <div className="mt-1 space-y-1">
                          {jogos.slice(0, 2).map((j) => (
                            <ChipJogo key={j.id} jogo={j} />
                          ))}
                          {jogos.length > 2 ? (
                            <div className="text-[11px] text-muted-foreground">
                              +{jogos.length - 2}
                            </div>
                          ) : null}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <Dialog open={diaSelecionado !== null} onOpenChange={(o) => !o && setDiaSelecionado(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-primary" /> Adicionar partida
            </DialogTitle>
            <DialogDescription>
              {diaSelecionado
                ? new Date(`${diaSelecionado}T12:00:00`).toLocaleDateString("pt-BR", {
                    weekday: "long",
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  })
                : ""}
            </DialogDescription>
          </DialogHeader>

          {partidasDoDia.length > 0 ? (
            <div className="space-y-1 rounded-lg border p-3 text-sm">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">
                Já agendado neste dia
              </p>
              {partidasDoDia.map((p) => (
                <p key={p.id}>
                  {ICONE_COMPETICAO[p.competicao ?? ""] ?? "⚽"}{" "}
                  <ClubBadge nome={p.adversario} className="align-middle" /> ·{" "}
                  {p.status === "finalizada"
                    ? `${p.placar_time ?? 0} x ${p.placar_adversario ?? 0}`
                    : "agendada"}
                </p>
              ))}
            </div>
          ) : null}

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="hora">Horário</Label>
              <Input
                id="hora"
                type="time"
                value={form.hora}
                onChange={(e) => setForm({ ...form, hora: e.target.value })}
              />
            </div>
            <div className="space-y-2">
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
                      {ICONE_COMPETICAO[c]} {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {ehCopa(form.competicao) ? (
              <div className="space-y-2">
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
            <div className="space-y-2">
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
            <div className="space-y-2">
              <Label htmlFor="adv">Adversário</Label>
              <ClubAutocomplete
                id="adv"
                placeholder="Nome do clube adversário"
                value={form.adversario}
                leagueId={save?.leagueId ?? null}
                onChange={(v) => setForm({ ...form, adversario: v })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setDiaSelecionado(null)}>
              Cancelar
            </Button>
            <Button onClick={() => void salvarPartida()} disabled={salvando}>
              <Plus className="mr-1 h-4 w-4" /> Agendar partida
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

/** Chip de jogo na célula do dia, com faixa da competição e detalhe em hover/toque. */
function ChipJogo({ jogo }: { jogo: Partida }) {
  const [aberto, setAberto] = useState(false);
  const hora = jogo.data_hora
    ? new Date(jogo.data_hora).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
    : null;

  return (
    <Popover open={aberto} onOpenChange={setAberto}>
      <PopoverTrigger asChild>
        <span
          role="button"
          tabIndex={0}
          onMouseEnter={() => setAberto(true)}
          onMouseLeave={() => setAberto(false)}
          onFocus={() => setAberto(true)}
          onBlur={() => setAberto(false)}
          onClick={(e) => {
            e.stopPropagation();
            setAberto((v) => !v);
          }}
          className={`relative flex min-w-0 items-center gap-1 overflow-hidden rounded py-1 pl-2.5 pr-1.5 text-[11px] font-medium ${
            jogo.status === "finalizada"
              ? "bg-muted text-muted-foreground"
              : "bg-primary/15 text-primary"
          }`}
        >
          <span
            aria-hidden
            className={`absolute inset-y-0 left-0 w-1 ${faixaCompeticao(jogo.competicao)}`}
          />
          <ClubBadge
            nome={jogo.adversario}
            tamanho="md"
            className="min-w-0 max-w-full"
            textoClassName="font-semibold"
          />
        </span>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="start"
        className="w-auto max-w-56 space-y-1 p-3 text-xs"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <p className="flex items-center gap-1.5 font-semibold">
          <ClubBadge nome={jogo.adversario} tamanho="md" />
        </p>
        <p className="text-muted-foreground">
          {ICONE_COMPETICAO[jogo.competicao ?? ""] ?? "⚽"} {jogo.competicao ?? "—"}
        </p>
        <p className="text-muted-foreground">{hora ? `Às ${hora}` : "Horário não definido"}</p>
      </PopoverContent>
    </Popover>
  );
}
