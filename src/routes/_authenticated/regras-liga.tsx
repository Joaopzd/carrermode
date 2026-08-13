import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { carregarRegras, type LeagueRules } from "@/lib/league-rules";
import { useSaveAtual } from "@/lib/use-save";

export const Route = createFileRoute("/_authenticated/regras-liga")({
  head: () => ({
    meta: [
      { title: "Regras da Liga | Carreira FC Manager" },
      { name: "description", content: "Configure as zonas de classificação da sua liga." },
      { property: "og:title", content: "Regras da Liga | Carreira FC Manager" },
      {
        property: "og:description",
        content: "Configure as zonas de classificação da sua liga.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RegrasLigaPage,
});

type CampoChave = keyof Pick<
  LeagueRules,
  | "vagas_champions"
  | "vagas_europa_league"
  | "vagas_conference_league"
  | "zona_rebaixamento_direto"
  | "zona_playoff_rebaixamento"
  | "vagas_acesso_direto"
  | "zona_playoff_acesso"
>;

const CAMPOS: { chave: CampoChave; rotulo: string }[] = [
  { chave: "vagas_champions", rotulo: "Vagas Champions League" },
  { chave: "vagas_europa_league", rotulo: "Vagas Europa League" },
  { chave: "vagas_conference_league", rotulo: "Vagas Conference League" },
  { chave: "zona_rebaixamento_direto", rotulo: "Rebaixamento direto (times)" },
  { chave: "zona_playoff_rebaixamento", rotulo: "Playoff de rebaixamento (times)" },
  { chave: "vagas_acesso_direto", rotulo: "Acesso direto (times)" },
  { chave: "zona_playoff_acesso", rotulo: "Playoff de acesso (times)" },
];

const VAZIO = {
  vagas_champions: 0,
  vagas_europa_league: 0,
  vagas_conference_league: 0,
  zona_rebaixamento_direto: 0,
  zona_playoff_rebaixamento: null,
  vagas_acesso_direto: null,
  zona_playoff_acesso: null,
};

function RegrasLigaPage() {
  const { save, carregando: carregandoSave } = useSaveAtual();
  const [regras, setRegras] = useState<Partial<LeagueRules> | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);

  const carregar = useCallback(async (leagueId: string | null) => {
    const r = await carregarRegras(leagueId);
    setRegras(r ?? { ...VAZIO });
    setCarregando(false);
  }, []);

  useEffect(() => {
    if (!save) {
      if (!carregandoSave) setCarregando(false);
      return;
    }
    void carregar(save.leagueId);
  }, [save, carregandoSave, carregar]);

  function definir(chave: CampoChave, valor: string) {
    setRegras((r) => (r ? { ...r, [chave]: valor === "" ? null : Number(valor) } : r));
  }

  async function salvar() {
    if (!save?.leagueId || !regras) return;
    setSalvando(true);
    const payload = {
      league_id: save.leagueId,
      temporada_ref: save.temporada,
      vagas_champions: regras.vagas_champions ?? 0,
      vagas_europa_league: regras.vagas_europa_league ?? 0,
      vagas_conference_league: regras.vagas_conference_league ?? 0,
      zona_rebaixamento_direto: regras.zona_rebaixamento_direto ?? 0,
      zona_playoff_rebaixamento: regras.zona_playoff_rebaixamento ?? null,
      vagas_acesso_direto: regras.vagas_acesso_direto ?? null,
      zona_playoff_acesso: regras.zona_playoff_acesso ?? null,
    };
    const { error } = regras.id
      ? await supabase.from("league_rules").update(payload).eq("id", regras.id)
      : await supabase.from("league_rules").insert(payload);
    setSalvando(false);
    if (error) {
      toast.error("Não foi possível salvar as regras.");
      return;
    }
    toast.success("Regras da liga atualizadas!");
    void carregar(save.leagueId);
  }

  return (
    <AppShell titulo="Regras da Liga">
      <div className="pitch-lines min-h-full px-4 py-8 sm:px-8">
        <div className="mx-auto max-w-2xl space-y-6">
          <header>
            <h1 className="text-gradient-pitch text-4xl">Regras da Liga</h1>
            <p className="text-sm text-muted-foreground">
              {save?.ligaNome ?? "Liga atual"} — zonas usadas para colorir a classificação.
            </p>
          </header>

          {carregando ? (
            <Skeleton className="h-80 w-full rounded-xl" />
          ) : !save?.leagueId ? (
            <Card className="border-dashed">
              <CardContent className="py-14 text-center text-sm text-muted-foreground">
                A save atual não tem liga vinculada.
              </CardContent>
            </Card>
          ) : (
            <Card className="hq-card">
              <CardContent className="grid gap-4 py-6 sm:grid-cols-2">
                {CAMPOS.map((c) => (
                  <div key={c.chave} className="grid gap-1">
                    <Label>{c.rotulo}</Label>
                    <Input
                      type="number"
                      min={0}
                      value={regras?.[c.chave] ?? ""}
                      onChange={(e) => definir(c.chave, e.target.value)}
                    />
                  </div>
                ))}
                <div className="sm:col-span-2">
                  <Button onClick={() => void salvar()} disabled={salvando}>
                    {salvando ? "Salvando…" : "Salvar regras"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </AppShell>
  );
}
