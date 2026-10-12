import { ClubBadge } from "@/components/club-badge";
import { ClubAutocomplete } from "@/components/club-autocomplete";
import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Trophy, Plus, Medal } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { gerarNoticia } from "@/lib/noticias.functions";
import { useSaveAtual } from "@/lib/use-save";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/trofeus")({
  head: () => ({
    meta: [
      { title: "Galeria de Troféus | Carreira FC Manager" },
      { name: "description", content: "Campeões e vices de cada competição da temporada." },
      { property: "og:title", content: "Galeria de Troféus | Carreira FC Manager" },
      {
        property: "og:description",
        content: "Campeões e vices de cada competição da temporada.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TrofeusPage,
});

type Competicao = {
  id: string;
  nome: string;
  escopo: string;
  pais: string | null;
  nivel_liga: number | null;
  restrito_a_niveis: number[] | null;
  registra_vice: boolean;
  condicao_elegibilidade: { requer: string; de: string[] } | null;
};

type Registro = {
  id: string;
  competition_id: string;
  campeao_clube: string;
  vice_clube: string | null;
  e_meu_clube_campeao: boolean;
  e_meu_clube_vice: boolean;
};

const ROTULO_ESCOPO: Record<string, string> = {
  continental: "Continental",
  liga: "Liga",
  copa_nacional: "Copa nacional",
  supercopa: "Supercopa",
};

const ORDEM_ESCOPO = ["continental", "liga", "copa_nacional", "supercopa"];

const norm = (v: string | null | undefined) =>
  (v ?? "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

function TrofeusPage() {
  const { save, carregando: carregandoSave } = useSaveAtual();
  const [competicoes, setCompeticoes] = useState<Competicao[]>([]);
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [clubes, setClubes] = useState<string[]>([]);
  const [carregando, setCarregando] = useState(true);

  const [alvo, setAlvo] = useState<Competicao | null>(null);
  const [campeao, setCampeao] = useState("");
  const [vice, setVice] = useState("");
  const [salvando, setSalvando] = useState(false);

  const carregar = useCallback(async (saveId: string, seasonId: string | null, stintId: string) => {
    let qr = supabase
      .from("trophy_gallery")
      .select("id, competition_id, campeao_clube, vice_clube, e_meu_clube_campeao, e_meu_clube_vice")
      .eq("stint_id", stintId);
    if (seasonId) qr = qr.eq("season_id", seasonId);
    const [{ data: comps }, { data: regs }, { data: cls }] = await Promise.all([
      supabase.from("competitions").select("*").order("nome"),
      qr,
      supabase.from("clubs").select("nome").order("nome"),
    ]);
    setCompeticoes((comps ?? []) as unknown as Competicao[]);
    setRegistros((regs ?? []) as Registro[]);
    setClubes(((cls ?? []) as { nome: string }[]).map((c) => c.nome));
    setCarregando(false);
  }, []);

  useEffect(() => {
    if (!save) {
      if (!carregandoSave) setCarregando(false);
      return;
    }
    void carregar(save.id, save.seasonId, save.stintId ?? "");
  }, [save, carregandoSave, carregar]);

  const registroPorComp = useMemo(
    () => Object.fromEntries(registros.map((r) => [r.competition_id, r])),
    [registros],
  );

  const nomePorComp = useMemo(
    () => Object.fromEntries(competicoes.map((c) => [c.id, c.nome])),
    [competicoes],
  );

  const disponiveis = useMemo(() => {
    if (!save) return [];
    const registradas = new Set(registros.map((r) => norm(nomePorComp[r.competition_id])));
    return competicoes
      .filter((c) => {
        if (c.escopo !== "continental") {
          if (norm(c.pais) !== norm(save.ligaPais)) return false;
        }
        if (Array.isArray(c.restrito_a_niveis) && c.restrito_a_niveis.length > 0) {
          if (!save.ligaNivel || !c.restrito_a_niveis.includes(save.ligaNivel)) return false;
        }
        const cond = c.condicao_elegibilidade;
        if (cond?.de?.length) {
          const cumprida = cond.de.some((nome) => registradas.has(norm(nome)));
          if (!cumprida) return false;
        }
        return true;
      })
      .sort(
        (a, b) =>
          ORDEM_ESCOPO.indexOf(a.escopo) - ORDEM_ESCOPO.indexOf(b.escopo) ||
          (a.nivel_liga ?? 0) - (b.nivel_liga ?? 0) ||
          a.nome.localeCompare(b.nome),
      );
  }, [competicoes, registros, nomePorComp, save]);

  const meusTitulos = registros.filter((r) => r.e_meu_clube_campeao).length;

  function abrir(c: Competicao) {
    const existente = registroPorComp[c.id];
    setAlvo(c);
    setCampeao(existente?.campeao_clube ?? "");
    setVice(existente?.vice_clube ?? "");
  }

  async function salvar() {
    if (!save || !alvo) return;
    if (campeao.trim() === "") {
      toast.error("Informe o campeão.");
      return;
    }
    setSalvando(true);
    const meuCampeao = norm(campeao) === norm(save.clubeNome) && !!save.clubeNome;
    const meuVice = norm(vice) === norm(save.clubeNome) && !!save.clubeNome && vice.trim() !== "";
    const payload = {
      save_id: save.id,
        stint_id: save.stintId,
      season_id: save.seasonId,
      competition_id: alvo.id,
      campeao_clube: campeao.trim(),
      vice_clube: alvo.registra_vice ? vice.trim() || null : null,
      e_meu_clube_campeao: meuCampeao,
      e_meu_clube_vice: meuVice,
    };
    const existente = registroPorComp[alvo.id];
    const { error } = existente
      ? await supabase.from("trophy_gallery").update(payload).eq("id", existente.id)
      : await supabase.from("trophy_gallery").insert(payload);
    setSalvando(false);
    if (error) {
      toast.error("Não foi possível salvar o resultado.");
      return;
    }
    toast.success("Resultado registrado!");
    if (meuCampeao && !existente?.e_meu_clube_campeao) {
      void gerarNoticia({
        data: {
          saveId: save.id,
            stintId: save.stintId,
          tipo: "titulo_conquistado",
          dados: {
            competicao: alvo.nome,
            clube: save.clubeNome,
            temporada: save.seasonNome ?? save.temporada,
            vice: payload.vice_clube,
          },
        },
      }).catch(() => undefined);
    }
    setAlvo(null);
    void carregar(save.id, save.seasonId, save.stintId ?? "");
  }

  return (
    <AppShell titulo="Galeria de Troféus">
      <div className="pitch-lines min-h-full px-4 py-8 sm:px-8">
        <div className="mx-auto max-w-5xl space-y-6">
          <header className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-gradient-pitch text-4xl">Galeria de Troféus</h1>
              <p className="text-sm text-muted-foreground">
                {save?.seasonNome ?? "Temporada atual"} — {meusTitulos} título(s) do clube nesta
                temporada.
              </p>
            </div>
          </header>

          {carregando ? (
            <Skeleton className="h-72 w-full rounded-xl" />
          ) : disponiveis.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-14 text-center">
                <Trophy className="mx-auto h-8 w-8 text-muted-foreground" />
                <p className="mt-3 text-sm text-muted-foreground">
                  Nenhuma competição disponível para o seu clube nesta temporada.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {disponiveis.map((c) => {
                const r = registroPorComp[c.id];
                return (
                  <Card
                    key={c.id}
                    className={cn(
                      "hq-card",
                      r?.e_meu_clube_campeao && "border-amber-400/60 bg-amber-400/5",
                    )}
                  >
                    <CardContent className="space-y-3 py-4">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-display text-xl tracking-wide">{c.nome}</p>
                          <p className="text-xs text-muted-foreground">
                            {ROTULO_ESCOPO[c.escopo] ?? c.escopo}
                            {c.pais ? ` · ${c.pais}` : ""}
                          </p>
                        </div>
                        {r?.e_meu_clube_campeao ? (
                          <Trophy className="h-5 w-5 text-amber-400" />
                        ) : r?.e_meu_clube_vice ? (
                          <Medal className="h-5 w-5 text-slate-400" />
                        ) : null}
                      </div>

                      {r ? (
                        <div className="space-y-1 text-sm">
                          <p>
                            <span className="text-muted-foreground">Campeão:</span>{" "}
                            <ClubBadge nome={r.campeao_clube} className="align-middle font-semibold" />
                            {r.e_meu_clube_campeao ? (
                              <Badge className="ml-2 bg-amber-500/20 text-amber-500">
                                Meu clube
                              </Badge>
                            ) : null}
                          </p>
                          {c.registra_vice ? (
                            <p>
                              <span className="text-muted-foreground">Vice:</span>{" "}
                              <ClubBadge nome={r.vice_clube} className="align-middle" />
                              {r.e_meu_clube_vice ? (
                                <Badge variant="outline" className="ml-2">
                                  Meu clube
                                </Badge>
                              ) : null}
                            </p>
                          ) : null}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">Sem resultado registrado.</p>
                      )}

                      <Button variant={r ? "outline" : "default"} size="sm" onClick={() => abrir(c)}>
                        <Plus className="mr-1 h-4 w-4" />
                        {r ? "Editar resultado" : "Adicionar resultado"}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <datalist id="lista-clubes">
        {clubes.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>

      <Dialog open={alvo !== null} onOpenChange={(v) => !v && setAlvo(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{alvo?.nome}</DialogTitle>
            <DialogDescription>
              Registre o campeão {alvo?.registra_vice ? "e o vice " : ""}desta temporada.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1">
              <Label>Campeão</Label>
              <ClubAutocomplete
                value={campeao}
                onChange={setCampeao}
                placeholder="Nome do clube"
              />
            </div>
            {alvo?.registra_vice ? (
              <div className="grid gap-1">
                <Label>Vice-campeão</Label>
                <ClubAutocomplete
                  value={vice}
                  onChange={setVice}
                  placeholder="Nome do clube"
                />
              </div>
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAlvo(null)}>
              Cancelar
            </Button>
            <Button onClick={() => void salvar()} disabled={salvando}>
              {salvando ? "Salvando…" : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
