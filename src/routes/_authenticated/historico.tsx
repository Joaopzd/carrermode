import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowDownRight, ArrowUpRight, History, Minus, Save as SaveIcon } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ResumoSeason, Season } from "@/lib/season";
import { useSaveAtual } from "@/lib/use-save";

export const Route = createFileRoute("/_authenticated/historico")({
  head: () => ({
    meta: [
      { title: "Histórico de temporadas | Carreira FC Manager" },
      {
        name: "description",
        content:
          "Veja a trajetória do clube: liga de cada temporada, acessos, rebaixamentos e os líderes da liga.",
      },
      { property: "og:title", content: "Histórico de temporadas | Carreira FC Manager" },
      {
        property: "og:description",
        content: "Trajetória por divisão, desfecho de cada temporada e top 5 da liga.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HistoricoPage,
});

type Categoria = "artilheiro" | "assistente" | "clean_sheet";

const CATEGORIAS: { chave: Categoria; rotulo: string; unidade: string }[] = [
  { chave: "artilheiro", rotulo: "Top 5 artilheiros", unidade: "Gols" },
  { chave: "assistente", rotulo: "Top 5 assistentes", unidade: "Assist." },
  { chave: "clean_sheet", rotulo: "Top 5 clean sheets", unidade: "CS" },
];

type Leader = {
  categoria: Categoria;
  posicao: number;
  jogador: string;
  clube: string;
  valor: string;
};

const vazios = (categoria: Categoria): Leader[] =>
  [1, 2, 3, 4, 5].map((posicao) => ({
    categoria,
    posicao,
    jogador: "",
    clube: "",
    valor: "",
  }));

function HistoricoPage() {
  const { save, carregando: carregandoSave } = useSaveAtual();
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [seasonSel, setSeasonSel] = useState<string>("");
  const [leaders, setLeaders] = useState<Leader[]>([]);
  const [carregandoLeaders, setCarregandoLeaders] = useState(false);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!save) {
      if (!carregandoSave) setCarregando(false);
      return;
    }
    void (async () => {
      const { data } = await supabase
        .from("seasons")
        .select("*")
        .eq("save_id", save.id)
        .order("criado_em", { ascending: true });
      const lista = (data ?? []) as unknown as Season[];
      setSeasons(lista);
      setSeasonSel(save.seasonId ?? lista[lista.length - 1]?.id ?? "");
      setCarregando(false);
    })();
  }, [save, carregandoSave]);

  const carregarLeaders = useCallback(async () => {
    if (!save || !seasonSel) return;
    setCarregandoLeaders(true);
    const { data } = await supabase
      .from("league_leaders")
      .select("categoria, posicao, jogador, clube, valor")
      .eq("save_id", save.id)
      .eq("season_id", seasonSel);
    const base = CATEGORIAS.flatMap((c) => vazios(c.chave));
    for (const row of data ?? []) {
      const alvo = base.find(
        (l) => l.categoria === (row.categoria as Categoria) && l.posicao === row.posicao,
      );
      if (alvo) {
        alvo.jogador = row.jogador ?? "";
        alvo.clube = row.clube ?? "";
        alvo.valor = row.valor != null ? String(row.valor) : "";
      }
    }
    setLeaders(base);
    setCarregandoLeaders(false);
  }, [save, seasonSel]);

  useEffect(() => {
    void carregarLeaders();
  }, [carregarLeaders]);

  function editar(categoria: Categoria, posicao: number, campo: keyof Leader, valor: string) {
    setLeaders((atual) =>
      atual.map((l) =>
        l.categoria === categoria && l.posicao === posicao ? { ...l, [campo]: valor } : l,
      ),
    );
  }

  async function salvar() {
    if (!save || !seasonSel) return;
    setSalvando(true);
    const preenchidos = leaders.filter((l) => l.jogador.trim().length > 0);
    const { error: delErro } = await supabase
      .from("league_leaders")
      .delete()
      .eq("save_id", save.id)
      .eq("season_id", seasonSel);
    if (delErro) {
      setSalvando(false);
      toast.error("Não foi possível salvar os líderes da liga.");
      return;
    }
    if (preenchidos.length > 0) {
      const { error } = await supabase.from("league_leaders").insert(
        preenchidos.map((l) => ({
          save_id: save.id,
          season_id: seasonSel,
          categoria: l.categoria,
          posicao: l.posicao,
          jogador: l.jogador.trim(),
          clube: l.clube.trim() || null,
          valor: l.valor.trim() === "" ? null : Number(l.valor),
        })),
      );
      if (error) {
        setSalvando(false);
        toast.error("Não foi possível salvar os líderes da liga.");
        return;
      }
    }
    setSalvando(false);
    toast.success("Líderes da liga salvos.");
  }

  const linhaDoTempo = useMemo(() => [...seasons].reverse(), [seasons]);

  return (
    <AppShell titulo="Histórico">
      <div className="pitch-lines min-h-full px-4 py-8 sm:px-8">
        <div className="mx-auto max-w-5xl space-y-8">
          <header>
            <h1 className="text-gradient-pitch text-4xl">Histórico</h1>
            <p className="text-sm text-muted-foreground">
              A trajetória do clube temporada a temporada e os líderes da liga.
            </p>
          </header>

          <section className="space-y-3">
            <h2 className="font-display text-xl tracking-wide">Temporadas</h2>
            {carregando ? (
              <Skeleton className="h-48 w-full rounded-xl" />
            ) : linhaDoTempo.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-12 text-center">
                  <History className="mx-auto h-8 w-8 text-muted-foreground" />
                  <p className="mt-3 text-sm text-muted-foreground">
                    Nenhuma temporada registrada ainda.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {linhaDoTempo.map((s) => (
                  <TemporadaLinha
                    key={s.id}
                    season={s}
                    ligaAtual={save?.ligaNome ?? null}
                  />
                ))}
              </div>
            )}
          </section>

          <section className="space-y-3">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="font-display text-xl tracking-wide">Líderes da liga</h2>
                <p className="text-sm text-muted-foreground">
                  Registre o top 5 de gols, assistências e clean sheets da temporada.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Select value={seasonSel} onValueChange={setSeasonSel}>
                  <SelectTrigger className="w-52">
                    <SelectValue placeholder="Temporada" />
                  </SelectTrigger>
                  <SelectContent>
                    {linhaDoTempo.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.nome}
                        {s.status === "ativa" ? " (ativa)" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={() => void salvar()} disabled={salvando || !seasonSel}>
                  <SaveIcon className="mr-2 h-4 w-4" />
                  Salvar
                </Button>
              </div>
            </div>

            {carregandoLeaders ? (
              <Skeleton className="h-64 w-full rounded-xl" />
            ) : (
              <Tabs defaultValue="artilheiro">
                <TabsList className="grid w-full grid-cols-3">
                  {CATEGORIAS.map((c) => (
                    <TabsTrigger key={c.chave} value={c.chave}>
                      {c.rotulo.replace("Top 5 ", "")}
                    </TabsTrigger>
                  ))}
                </TabsList>
                {CATEGORIAS.map((c) => (
                  <TabsContent key={c.chave} value={c.chave} className="mt-4">
                    <Card className="hq-card">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">{c.rotulo}</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {leaders
                          .filter((l) => l.categoria === c.chave)
                          .map((l) => (
                            <div
                              key={`${l.categoria}-${l.posicao}`}
                              className="grid grid-cols-[2rem_1fr] gap-2 sm:grid-cols-[2rem_2fr_2fr_1fr]"
                            >
                              <span className="flex h-9 items-center font-display text-lg text-primary">
                                {l.posicao}
                              </span>
                              <Input
                                value={l.jogador}
                                placeholder="Jogador"
                                onChange={(e) =>
                                  editar(c.chave, l.posicao, "jogador", e.target.value)
                                }
                              />
                              <Input
                                value={l.clube}
                                placeholder="Clube"
                                onChange={(e) => editar(c.chave, l.posicao, "clube", e.target.value)}
                              />
                              <Input
                                value={l.valor}
                                inputMode="numeric"
                                placeholder={c.unidade}
                                onChange={(e) => editar(c.chave, l.posicao, "valor", e.target.value)}
                              />
                            </div>
                          ))}
                      </CardContent>
                    </Card>
                  </TabsContent>
                ))}
              </Tabs>
            )}
          </section>
        </div>
      </div>
    </AppShell>
  );
}

function TemporadaLinha({ season, ligaAtual }: { season: Season; ligaAtual: string | null }) {
  const r = (season.resumo ?? {}) as ResumoSeason;
  const ativa = season.status === "ativa";
  const liga = ativa ? ligaAtual : (r.liga_anterior ?? null);
  const movimento = r.movimento ?? "permanencia";

  const desfecho = ativa
    ? { rotulo: "Em andamento", classe: "bg-muted text-muted-foreground", Icone: Minus }
    : movimento === "acesso"
      ? {
          rotulo: `Acesso${r.liga_nova ? ` → ${r.liga_nova}` : ""}`,
          classe: "bg-emerald-500/15 text-emerald-500 border-emerald-500/40",
          Icone: ArrowUpRight,
        }
      : movimento === "rebaixamento"
        ? {
            rotulo: `Rebaixamento${r.liga_nova ? ` → ${r.liga_nova}` : ""}`,
            classe: "bg-red-500/15 text-red-500 border-red-500/40",
            Icone: ArrowDownRight,
          }
        : {
            rotulo: r.zona_final ?? "Permanência",
            classe: "bg-sky-500/15 text-sky-500 border-sky-500/40",
            Icone: Minus,
          };

  return (
    <Card className="hq-card">
      <CardContent className="flex flex-wrap items-center justify-between gap-4 py-4">
        <div className="min-w-0">
          <p className="font-display text-2xl tracking-wide">{season.nome}</p>
          <p className="text-sm text-muted-foreground">
            {liga ?? "Liga não informada"}
            {r.posicao_final ? ` · ${r.posicao_final}º lugar` : ""}
            {r.pontos != null ? ` · ${r.pontos} pts` : ""}
          </p>
          {r.competicoes_classificado?.length ? (
            <p className="mt-1 text-xs text-muted-foreground">
              Classificado para: {r.competicoes_classificado.join(", ")}
            </p>
          ) : null}
        </div>
        <Badge variant="outline" className={`gap-1 ${desfecho.classe}`}>
          <desfecho.Icone className="h-3.5 w-3.5" />
          {desfecho.rotulo}
        </Badge>
      </CardContent>
    </Card>
  );
}
