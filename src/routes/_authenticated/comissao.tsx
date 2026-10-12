import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Dices, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { CARGOS_STAFF, nomeAleatorio } from "@/lib/onboarding-data";
import { useSaveAtual } from "@/lib/use-save";

export const Route = createFileRoute("/_authenticated/comissao")({
  head: () => ({
    meta: [
      { title: "Comissão Técnica | Carreira FC Manager" },
      { name: "description", content: "Gerencie e edite os nomes da sua comissão técnica." },
      { property: "og:title", content: "Comissão Técnica | Carreira FC Manager" },
      {
        property: "og:description",
        content: "Gerencie e edite os nomes da sua comissão técnica.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ComissaoPage,
});

type LinhaStaff = { id: string | null; cargo: string; nome: string };

function ComissaoPage() {
  const { save, carregando: carregandoSave } = useSaveAtual();
  const [linhas, setLinhas] = useState<LinhaStaff[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!save) {
      if (!carregandoSave) setCarregando(false);
      return;
    }
    void (async () => {
      const { data } = await supabase
        .from("staff")
        .select("id, cargo, nome")
        .eq("stint_id", save.stintId ?? "");
      const existentes = (data ?? []) as Array<{ id: string; cargo: string; nome: string }>;
      setLinhas(
        CARGOS_STAFF.map((cargo) => {
          const achado = existentes.find((e) => e.cargo === cargo);
          return { id: achado?.id ?? null, cargo, nome: achado?.nome ?? "" };
        }),
      );
      setCarregando(false);
    })();
  }, [save, carregandoSave]);

  function set(cargo: string, nome: string) {
    setLinhas((prev) => prev.map((l) => (l.cargo === cargo ? { ...l, nome } : l)));
  }

  async function salvar() {
    if (!save) return;
    setSalvando(true);
    for (const l of linhas) {
      const nome = l.nome.trim();
      if (!nome) continue;
      if (l.id) {
        await supabase.from("staff").update({ nome }).eq("id", l.id);
      } else {
        const { data } = await supabase
          .from("staff")
          .insert({ save_id: save.id,
        stint_id: save.stintId, cargo: l.cargo, nome })
          .select("id")
          .single();
        if (data) l.id = data.id;
      }
    }
    setSalvando(false);
    toast.success("Comissão técnica atualizada!");
  }

  return (
    <AppShell titulo="Comissão Técnica">
      <div className="pitch-lines min-h-full px-4 py-8 sm:px-8">
        <div className="mx-auto max-w-3xl space-y-6">
          <header>
            <h1 className="text-gradient-pitch text-4xl">Comissão técnica</h1>
            <p className="text-sm text-muted-foreground">
              Sua equipe de bastidores. Troque qualquer nome quando quiser.
            </p>
          </header>

          {carregando ? (
            <Skeleton className="h-72 w-full rounded-xl" />
          ) : !save ? (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center text-sm text-muted-foreground">
                Crie uma carreira para gerenciar a comissão técnica.
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="grid gap-4">
                {linhas.map((l) => (
                  <Card key={l.cargo}>
                    <CardContent className="space-y-2 py-4">
                      <Label className="text-xs uppercase tracking-widest text-muted-foreground">
                        {l.cargo}
                      </Label>
                      <div className="flex gap-2">
                        <Input
                          value={l.nome}
                          placeholder="Nome do profissional"
                          onChange={(e) => set(l.cargo, e.target.value)}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => set(l.cargo, nomeAleatorio())}
                        >
                          <Dices className="mr-1 h-4 w-4" /> Gerar
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <Button onClick={salvar} disabled={salvando} className="w-full sm:w-auto">
                {salvando ? (
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-1 h-4 w-4" />
                )}
                Salvar alterações
              </Button>
            </>
          )}
        </div>
      </div>
    </AppShell>
  );
}
