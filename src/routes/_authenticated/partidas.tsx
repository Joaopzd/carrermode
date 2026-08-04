import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { CalendarPlus, ClipboardCheck, Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
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

  const carregar = useCallback(async (saveId: string, seasonId: string | null) => {
    let q = supabase.from("matches").select("*").eq("save_id", saveId);
    if (seasonId) q = q.eq("season_id", seasonId);
    const { data } = await q.order("data_hora", { ascending: false });
    setPartidas((data ?? []) as PartidaBase[]);
    setCarregando(false);
  }, []);

  useEffect(() => {
    if (!save) {
      if (!carregandoSave) setCarregando(false);
      return;
    }
    void carregar(save.id, save.seasonId);
  }, [save, carregandoSave, carregar]);

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
            <Button asChild variant="outline">
              <Link to="/calendario">
                <CalendarPlus className="mr-1 h-4 w-4" /> Agendar no calendário
              </Link>
            </Button>
          </header>

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
                  agendadas.map((p) => (
                    <Card key={p.id}>
                      <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
                        <div>
                          <p className="font-semibold">
                            {ICONE_COMPETICAO[p.competicao ?? ""] ?? "⚽"}{" "}
                            {save?.clubeNome ?? "Meu clube"} x {p.adversario}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {p.competicao ?? "—"}
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
                        <Button onClick={() => abrir(p)}>
                          <ClipboardCheck className="mr-1 h-4 w-4" /> Fechar partida
                        </Button>
                      </CardContent>
                    </Card>
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
                  finalizadas.map((p) => {
                    const r = resultado(p);
                    return (
                      <Card key={p.id}>
                        <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
                          <div className="flex items-center gap-3">
                            <span
                              className={`flex h-9 w-9 items-center justify-center rounded-lg text-sm font-bold ${r.classe}`}
                            >
                              {r.letra}
                            </span>
                            <div>
                              <p className="font-semibold">
                                {ICONE_COMPETICAO[p.competicao ?? ""] ?? "⚽"}{" "}
                                {save?.clubeNome ?? "Meu clube"} {p.placar_time ?? 0} x{" "}
                                {p.placar_adversario ?? 0} {p.adversario}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {p.competicao ?? "—"}
                                {p.data_hora
                                  ? ` · ${new Date(p.data_hora).toLocaleDateString("pt-BR")}`
                                  : ""}
                              </p>
                            </div>
                          </div>
                          <Button variant="outline" onClick={() => abrir(p)}>
                            <Pencil className="mr-1 h-4 w-4" /> Reabrir e editar
                          </Button>
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </section>
            </>
          )}
        </div>
      </div>

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
