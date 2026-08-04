import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Loader2, RefreshCw, Save, Target } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { avaliarMetas, type MetaAvaliada } from "@/lib/eventos";
import { useSaveAtual } from "@/lib/use-save";

export const Route = createFileRoute("/_authenticated/metas")({
  head: () => ({
    meta: [
      { title: "Metas da Diretoria | Carreira FC Manager" },
      {
        name: "description",
        content: "Defina posição-alvo, receita de vendas e teto salarial da temporada.",
      },
      { property: "og:title", content: "Metas da Diretoria | Carreira FC Manager" },
      {
        property: "og:description",
        content: "Defina posição-alvo, receita de vendas e teto salarial da temporada.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MetasPage,
});

const TIPOS = [
  {
    tipo: "posicao_alvo",
    rotulo: "Posição-alvo na liga",
    ajuda: "Ex.: 4 — terminar entre os 4 primeiros.",
  },
  {
    tipo: "receita_vendas",
    rotulo: "Meta de receita com vendas",
    ajuda: "Valor total a arrecadar na janela de transferências.",
  },
  {
    tipo: "teto_salarial",
    rotulo: "Teto salarial do elenco",
    ajuda: "Soma máxima dos salários do elenco.",
  },
] as const;

const CORES: Record<string, string> = {
  cumprida: "bg-emerald-500/15 text-emerald-400",
  em_risco: "bg-red-500/15 text-red-400",
  em_andamento: "bg-muted text-muted-foreground",
};

function MetasPage() {
  const { save, carregando: carregandoSave } = useSaveAtual();
  const [valores, setValores] = useState<Record<string, string>>({});
  const [avaliadas, setAvaliadas] = useState<MetaAvaliada[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [checando, setChecando] = useState(false);

  const carregar = useCallback(async (saveId: string) => {
    const { data } = await supabase
      .from("board_objectives")
      .select("id, tipo, meta, status")
      .eq("save_id", saveId);

    const mapa: Record<string, string> = {};
    for (const m of data ?? []) mapa[m.tipo] = m.meta ?? "";
    setValores(mapa);
    setCarregando(false);
  }, []);

  useEffect(() => {
    if (!save) {
      if (!carregandoSave) setCarregando(false);
      return;
    }
    void carregar(save.id);
  }, [save, carregandoSave, carregar]);

  async function salvar() {
    if (!save) return;
    setSalvando(true);
    const { data: existentes } = await supabase
      .from("board_objectives")
      .select("id, tipo")
      .eq("save_id", save.id);

    for (const t of TIPOS) {
      const valor = (valores[t.tipo] ?? "").trim();
      if (!valor) continue;
      const achado = (existentes ?? []).find((e) => e.tipo === t.tipo);
      if (achado) {
        await supabase.from("board_objectives").update({ meta: valor }).eq("id", achado.id);
      } else {
        await supabase.from("board_objectives").insert({
          save_id: save.id,
          season_id: save.seasonId,
          tipo: t.tipo,
          meta: valor,
          temporada: save.temporada,
          status: "em_andamento",
        });
      }
    }
    setSalvando(false);
    toast.success("Metas da diretoria salvas!");
    void carregar(save.id);
  }

  async function checar() {
    if (!save) return;
    setChecando(true);
    try {
      setAvaliadas(await avaliarMetas(save.id));
      toast.success("Metas comparadas com os dados reais.");
    } catch {
      toast.error("Não foi possível avaliar as metas agora.");
    }
    setChecando(false);
  }

  return (
    <AppShell titulo="Metas da Diretoria">
      <div className="pitch-lines min-h-full px-4 py-8 sm:px-8">
        <div className="mx-auto max-w-3xl space-y-6">
          <header>
            <h1 className="text-gradient-pitch text-4xl">Metas da diretoria</h1>
            <p className="text-sm text-muted-foreground">
              Defina os objetivos da temporada. A diretoria se manifesta no feed quando uma meta
              entra em risco ou é cumprida.
            </p>
          </header>

          {carregando ? (
            <Skeleton className="h-64 w-full rounded-xl" />
          ) : !save ? (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center text-sm text-muted-foreground">
                Crie uma carreira para definir as metas.
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="grid gap-4">
                {TIPOS.map((t) => {
                  const av = avaliadas.find((a) => a.tipo === t.tipo);
                  return (
                    <Card key={t.tipo}>
                      <CardContent className="space-y-2 py-4">
                        <div className="flex items-center justify-between gap-2">
                          <Label className="text-xs uppercase tracking-widest text-muted-foreground">
                            {t.rotulo}
                          </Label>
                          {av ? (
                            <Badge variant="secondary" className={CORES[av.status] ?? ""}>
                              {av.cumprida
                                ? "Cumprida"
                                : av.atual === null
                                  ? "Sem dados"
                                  : "Em risco"}
                            </Badge>
                          ) : null}
                        </div>
                        <Input
                          type="number"
                          value={valores[t.tipo] ?? ""}
                          onChange={(e) =>
                            setValores((p) => ({ ...p, [t.tipo]: e.target.value }))
                          }
                        />
                        <p className="text-xs text-muted-foreground">
                          {t.ajuda}
                          {av && av.atual !== null ? ` · Atual: ${av.atual}` : ""}
                        </p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              <div className="flex flex-wrap gap-3">
                <Button onClick={salvar} disabled={salvando}>
                  {salvando ? (
                    <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-1 h-4 w-4" />
                  )}
                  Salvar metas
                </Button>
                <Button variant="outline" onClick={checar} disabled={checando}>
                  {checando ? (
                    <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-1 h-4 w-4" />
                  )}
                  Comparar com a realidade
                </Button>
              </div>

              <Card className="border-dashed">
                <CardContent className="flex gap-3 py-4 text-xs text-muted-foreground">
                  <Target className="h-4 w-4 shrink-0" />
                  A posição atual vem da última rodada sincronizada na Classificação; a receita
                  soma as transferências de saída e a folha soma os salários do elenco.
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </AppShell>
  );
}
