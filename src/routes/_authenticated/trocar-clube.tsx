import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { ClubBadge } from "@/components/club-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useSaveAtual } from "@/lib/use-save";

export const Route = createFileRoute("/_authenticated/trocar-clube")({
  head: () => ({
    meta: [
      { title: "Trocar clube | Carreira FC Manager" },
      {
        name: "description",
        content: "Mude a liga e o clube da sua carreira sem perder elenco, partidas e histórico.",
      },
      { property: "og:title", content: "Trocar clube | Carreira FC Manager" },
      {
        property: "og:description",
        content: "Troque de clube mantendo elenco, partidas e histórico intactos.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TrocarClubePage,
});

type Liga = { id: string; nome: string; pais: string; nivel: number };
type Clube = { id: string; nome: string; escudo_url: string | null };

function TrocarClubePage() {
  const navigate = useNavigate();
  const { save, carregando } = useSaveAtual();
  const [ligas, setLigas] = useState<Liga[]>([]);
  const [clubes, setClubes] = useState<Clube[]>([]);
  const [ligaId, setLigaId] = useState<string | null>(null);
  const [clubeId, setClubeId] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState(false);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    void (async () => {
      const { data } = await supabase
        .from("leagues")
        .select("id, nome, pais, nivel")
        .order("pais")
        .order("nivel");
      setLigas((data as Liga[]) ?? []);
    })();
  }, []);

  useEffect(() => {
    if (save?.leagueId && !ligaId) setLigaId(save.leagueId);
  }, [save, ligaId]);

  useEffect(() => {
    if (!ligaId) return;
    void (async () => {
      const { data } = await supabase
        .from("clubs")
        .select("id, nome, escudo_url")
        .eq("league_id", ligaId)
        .order("nome");
      setClubes((data as Clube[]) ?? []);
    })();
  }, [ligaId]);

  const clube = useMemo(() => clubes.find((c) => c.id === clubeId) ?? null, [clubes, clubeId]);
  const liga = useMemo(() => ligas.find((l) => l.id === ligaId) ?? null, [ligas, ligaId]);

  async function confirmar() {
    if (!save || !ligaId || !clubeId) return;
    setSalvando(true);
    const { error } = await supabase
      .from("saves")
      .update({ league_id: ligaId, club_id: clubeId })
      .eq("id", save.id);
    setSalvando(false);
    setConfirmando(false);
    if (error) {
      toast.error("Não foi possível trocar de clube.");
      return;
    }
    toast.success(`Agora você comanda o ${clube?.nome ?? "novo clube"}.`);
    void navigate({ to: "/dashboard" });
  }

  return (
    <AppShell titulo="Trocar Clube">
      <div className="pitch-lines min-h-full px-4 py-8 sm:px-8">
        <div className="mx-auto max-w-4xl space-y-6">
          <header>
            <h1 className="text-gradient-pitch text-4xl">Trocar Clube</h1>
            <p className="text-sm text-muted-foreground">
              Clube atual:{" "}
              <ClubBadge nome={save?.clubeNome} escudoUrl={save?.escudo} className="align-middle" />
            </p>
          </header>

          <Card className="border-amber-500/40 bg-amber-500/10">
            <CardContent className="flex gap-2 py-4 text-sm text-amber-500">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                Trocar de clube altera apenas a liga e o clube da save. Elenco, partidas,
                transferências, temporadas, comissão técnica e todo o histórico permanecem
                intactos.
              </span>
            </CardContent>
          </Card>

          {carregando ? null : !save ? (
            <Card className="border-dashed">
              <CardContent className="py-14 text-center text-sm text-muted-foreground">
                Nenhuma save encontrada.
              </CardContent>
            </Card>
          ) : (
            <>
              <section className="space-y-3">
                <h2 className="font-display text-2xl tracking-wide">1. Escolha a liga</h2>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {ligas.map((l) => (
                    <button
                      key={l.id}
                      type="button"
                      onClick={() => {
                        setLigaId(l.id);
                        setClubeId(null);
                      }}
                      className={`rounded-lg border bg-card p-4 text-left transition-all hover:-translate-y-0.5 hover:border-primary ${
                        ligaId === l.id ? "glow-panel border-primary" : "border-border"
                      }`}
                    >
                      <span className="block font-display text-2xl leading-none">{l.nome}</span>
                      <span className="mt-2 block text-xs uppercase tracking-widest text-muted-foreground">
                        {l.pais} · Divisão {l.nivel}
                      </span>
                    </button>
                  ))}
                </div>
              </section>

              <section className="space-y-3">
                <h2 className="font-display text-2xl tracking-wide">2. Escolha o clube</h2>
                <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {clubes.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setClubeId(c.id)}
                      className={`flex flex-col items-center gap-3 rounded-lg border bg-card p-4 transition-all hover:-translate-y-0.5 hover:border-primary ${
                        clubeId === c.id ? "glow-panel border-primary" : "border-border"
                      }`}
                    >
                      <ClubBadge nome={c.nome} escudoUrl={c.escudo_url} tamanho="lg" semNome />
                      <span className="text-center text-sm font-medium">{c.nome}</span>
                    </button>
                  ))}
                  {ligaId && clubes.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhum clube nesta liga.</p>
                  ) : null}
                </div>
              </section>

              <div className="flex justify-end">
                <Button disabled={!clubeId} onClick={() => setConfirmando(true)}>
                  Confirmar troca
                </Button>
              </div>
            </>
          )}
        </div>
      </div>

      <AlertDialog open={confirmando} onOpenChange={setConfirmando}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Trocar para {clube?.nome ?? "novo clube"}?</AlertDialogTitle>
            <AlertDialogDescription>
              A save passará a ser da {liga?.nome ?? "liga selecionada"} com o clube{" "}
              {clube?.nome ?? "selecionado"}. Nenhum jogador, partida, transferência, temporada ou
              registro de comissão será alterado ou apagado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction disabled={salvando} onClick={() => void confirmar()}>
              {salvando ? "Salvando…" : "Confirmar troca"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}
