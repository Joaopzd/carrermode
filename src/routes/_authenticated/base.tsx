import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowUpCircle, Sparkles, Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
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
import { Skeleton } from "@/components/ui/skeleton";
import {
  JogadorFormDialog,
  formParaPayload,
  type JogadorForm,
} from "@/components/jogador-form-dialog";
import { Bandeira } from "@/components/bandeira";
import { supabase } from "@/integrations/supabase/client";
import { useSaveAtual } from "@/lib/use-save";

export const Route = createFileRoute("/_authenticated/base")({
  head: () => ({
    meta: [
      { title: "Categorias de Base | Carreira FC Manager" },
      { name: "description", content: "Promoções e joias da academia do clube." },
      { property: "og:title", content: "Categorias de Base | Carreira FC Manager" },
      { property: "og:description", content: "Promoções e joias da academia do clube." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: BasePage,
});

type Cria = {
  id: string;
  nome: string;
  nacionalidade: string | null;
  posicao_principal: string | null;
  overall: number | null;
  potencial: number | null;
  idade: number | null;
  status: string | null;
  playstyle: string | null;
};

function BasePage() {
  const { save, carregando: carregandoSave } = useSaveAtual();
  const [jogadores, setJogadores] = useState<Cria[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [adicionando, setAdicionando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [liberando, setLiberando] = useState<Cria | null>(null);

  async function carregar(saveId: string) {
    const { data } = await supabase
      .from("players")
      .select(
        "id, nome, nacionalidade, posicao_principal, overall, potencial, idade, status, playstyle",
      )
      .eq("save_id", saveId)
      .eq("ativo", true)
      .eq("categoria", "base")
      .order("nome");
    setJogadores((data ?? []) as Cria[]);
    setCarregando(false);
  }

  useEffect(() => {
    if (!save) {
      if (!carregandoSave) setCarregando(false);
      return;
    }
    void carregar(save.id);
  }, [save, carregandoSave]);

  async function criar(form: JogadorForm) {
    if (!save) return;
    setSalvando(true);
    const { error } = await supabase.from("players").insert({
      save_id: save.id,
      categoria: "base",
      criado_via: "manual",
      ...formParaPayload(form),
    });
    setSalvando(false);
    if (error) {
      toast.error("Não foi possível cadastrar a joia da base.");
      return;
    }
    toast.success("Jogador adicionado à base!");
    setAdicionando(false);
    void carregar(save.id);
  }

  async function promover(j: Cria) {
    const { error } = await supabase
      .from("players")
      .update({ categoria: "principal" })
      .eq("id", j.id);
    if (error) {
      toast.error("Não foi possível promover o jogador.");
      return;
    }
    toast.success(`${j.nome} foi promovido ao elenco principal!`);
    if (save) void carregar(save.id);
  }

  async function liberar(j: Cria) {
    const { error } = await supabase.from("players").delete().eq("id", j.id);
    setLiberando(null);
    if (error) {
      toast.error("Não foi possível liberar o jogador.");
      return;
    }
    toast.success(`${j.nome} foi liberado da base.`);
    if (save) void carregar(save.id);
  }

  return (
    <AppShell titulo="Categorias de Base">
      <div className="pitch-lines min-h-full px-4 py-8 sm:px-8">
        <div className="mx-auto max-w-6xl space-y-6">
          <header className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-gradient-pitch text-4xl">Categorias de base</h1>
              <p className="text-sm text-muted-foreground">
                {jogadores.length} jovem(ns) na academia. Promova ao elenco ou libere.
              </p>
            </div>
            <Button onClick={() => setAdicionando(true)} disabled={!save}>
              <UserPlus className="mr-1 h-4 w-4" /> Adicionar jogador
            </Button>
          </header>

          {carregando ? (
            <Skeleton className="h-72 w-full rounded-xl" />
          ) : jogadores.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-14 text-center">
                <Sparkles className="mx-auto h-8 w-8 text-muted-foreground" />
                <p className="mt-3 text-sm text-muted-foreground">
                  Nenhuma joia cadastrada ainda. Adicione os garotos da academia.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {jogadores.map((j) => {
                const evolucao = Math.max(0, (j.potencial ?? 0) - (j.overall ?? 0));
                return (
                  <Card key={j.id} className="hq-card">
                    <CardContent className="space-y-3 py-4">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-display text-xl leading-tight tracking-wide">
                            {j.nome}
                          </p>
                          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <span>{j.posicao_principal ?? "—"}</span>
                            <span>·</span>
                            <Bandeira pais={j.nacionalidade} />
                            <span>{j.nacionalidade ?? "—"}</span>
                            <span>· {j.idade ?? "—"} anos</span>
                          </p>
                        </div>
                        <span className="rounded-lg bg-primary/15 px-2 py-1 font-display text-lg text-primary">
                          {j.overall ?? "—"}
                        </span>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>Potencial</span>
                          <span>
                            {j.potencial ?? "—"}{" "}
                            {j.potencial ? (
                              <Badge variant="secondary" className="ml-1">
                                +{evolucao}
                              </Badge>
                            ) : null}
                          </span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full bg-primary/40"
                            style={{ width: `${Math.min(100, j.potencial ?? 0)}%` }}
                          >
                            <div
                              className="h-full bg-primary"
                              style={{
                                width: j.potencial
                                  ? `${Math.min(100, ((j.overall ?? 0) / j.potencial) * 100)}%`
                                  : "0%",
                              }}
                            />
                          </div>
                        </div>
                      </div>

                      {j.playstyle ? <Badge variant="outline">{j.playstyle}</Badge> : null}

                      <div className="flex gap-2">
                        <Button size="sm" className="flex-1" onClick={() => void promover(j)}>
                          <ArrowUpCircle className="mr-1 h-4 w-4" /> Promover
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          onClick={() => setLiberando(j)}
                        >
                          <Trash2 className="mr-1 h-4 w-4" /> Liberar
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <JogadorFormDialog
        open={adicionando}
        onOpenChange={setAdicionando}
        titulo="Adicionar jogador à base"
        descricao="Cadastre o jovem e defina até onde ele pode evoluir na aba Potencial."
        mostrarPotencial
        salvando={salvando}
        textoConfirmar="Adicionar à base"
        onConfirmar={criar}
      />

      <AlertDialog open={liberando !== null} onOpenChange={(v) => !v && setLiberando(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Liberar {liberando?.nome}?</AlertDialogTitle>
            <AlertDialogDescription>
              O jogador será excluído da categoria de base e não irá para o elenco principal.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => liberando && void liberar(liberando)}>
              Liberar jogador
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}
