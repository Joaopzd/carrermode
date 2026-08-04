import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Plus } from "lucide-react";
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
import { COMPETICOES, DIAS_SEMANA, ICONE_COMPETICAO, MESES, chaveDia } from "@/lib/match-data";

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
  const hoje = new Date();
  // A temporada começa em 01/07/2026 — o usuário avança os meses conforme o jogo evolui.
  const [mes, setMes] = useState(() => new Date(2026, 6, 1));
  const [diaSelecionado, setDiaSelecionado] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [form, setForm] = useState({ hora: "16:00", competicao: "Liga", adversario: "" });

  const carregar = useCallback(async (saveId: string, seasonId: string | null) => {
    let q = supabase
      .from("matches")
      .select("id, data_hora, competicao, adversario, status, placar_time, placar_adversario")
      .eq("save_id", saveId);
    if (seasonId) q = q.eq("season_id", seasonId);
    const { data } = await q
      .order("data_hora", { ascending: true });
    setPartidas((data ?? []) as Partida[]);
    setCarregando(false);
  }, []);

  useEffect(() => {
    if (!save) {
      if (!carregandoSave) setCarregando(false);
      return;
    }
    void carregar(save.id, save.seasonId);
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
      season_id: save.seasonId,
      data_hora: dataHora.toISOString(),
      competicao: form.competicao,
      adversario: form.adversario.trim(),
      status: "agendada",
    });
    setSalvando(false);
    if (error) {
      toast.error("Não foi possível agendar a partida.");
      return;
    }
    toast.success("Partida agendada!");
    setForm({ hora: "16:00", competicao: "Liga", adversario: "" });
    setDiaSelecionado(null);
    void carregar(save.id, save.seasonId);
  }

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
                    const eHoje = k === chaveDia(new Date());
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
                            <div
                              key={j.id}
                              className={`truncate rounded px-1.5 py-0.5 text-[11px] font-medium ${
                                j.status === "finalizada"
                                  ? "bg-muted text-muted-foreground"
                                  : "bg-primary/15 text-primary"
                              }`}
                            >
                              {ICONE_COMPETICAO[j.competicao ?? ""] ?? "⚽"} {j.adversario}
                            </div>
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
                  {ICONE_COMPETICAO[p.competicao ?? ""] ?? "⚽"} {p.adversario} ·{" "}
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
                onValueChange={(v) => setForm({ ...form, competicao: v })}
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
            <div className="space-y-2">
              <Label htmlFor="adv">Adversário</Label>
              <Input
                id="adv"
                placeholder="Nome do clube adversário"
                value={form.adversario}
                onChange={(e) => setForm({ ...form, adversario: e.target.value })}
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
