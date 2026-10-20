import { posEn } from "@/lib/posicoes";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowUpCircle, ClipboardEdit, Sparkles, Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { HoverCard, StaggerItem } from "@/components/motion";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  JogadorFormDialog,
  formParaPayload,
  type JogadorForm,
} from "@/components/jogador-form-dialog";
import { Bandeira } from "@/components/bandeira";
import { Sparkline } from "@/components/overall-card";
import { SetaVariacao } from "@/components/evolucao-jogador";
import { RevisaoBaseDialog } from "@/components/revisao-base-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAbrirJogador } from "@/lib/abrir-jogador";
import {
  avaliadoNaTemporada,
  carregarAvaliacoes,
  registrarCadastro,
  registrarPromocao,
  resumirEvolucao,
  type Avaliacao,
} from "@/lib/base-jogadores";
import { parsePlaystyles } from "@/lib/playstyles";
import { useSaveAtual } from "@/lib/use-save";

export const Route = createFileRoute("/_authenticated/base")({
  head: () => ({
    meta: [
      { title: "Categorias de Base | Carreira FC Manager" },
      { name: "description", content: "Acompanhe a evolução dos jovens da academia do clube." },
      { property: "og:title", content: "Categorias de Base | Carreira FC Manager" },
      {
        property: "og:description",
        content: "Acompanhe a evolução dos jovens da academia do clube.",
      },
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
  criado_em: string | null;
};

type Ordem = "nome" | "overall" | "potencial" | "idade" | "evolucao";

function BasePage() {
  const { save, carregando: carregandoSave } = useSaveAtual();
  const abrirJogador = useAbrirJogador();
  const [jogadores, setJogadores] = useState<Cria[]>([]);
  const [avaliacoes, setAvaliacoes] = useState<Avaliacao[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [adicionando, setAdicionando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [liberando, setLiberando] = useState<Cria | null>(null);
  const [revisando, setRevisando] = useState<Cria[] | null>(null);
  const [ordem, setOrdem] = useState<Ordem>("nome");

  async function carregar(stintId: string) {
    const { data } = await supabase
      .from("players")
      .select(
        "id, nome, nacionalidade, posicao_principal, overall, potencial, idade, status, playstyle, criado_em",
      )
      .eq("stint_id", stintId)
      .eq("ativo", true)
      .eq("categoria", "base")
      .order("nome");
    const lista = (data ?? []) as Cria[];
    setJogadores(lista);
    setAvaliacoes(await carregarAvaliacoes(lista.map((j) => j.id)));
    setCarregando(false);
  }

  useEffect(() => {
    if (!save) {
      if (!carregandoSave) setCarregando(false);
      return;
    }
    void carregar(save.stintId ?? "");
  }, [save, carregandoSave]);

  const porJogador = useMemo(() => {
    const mapa = new Map<string, Avaliacao[]>();
    for (const a of avaliacoes) mapa.set(a.player_id, [...(mapa.get(a.player_id) ?? []), a]);
    return mapa;
  }, [avaliacoes]);

  const pendentes = useMemo(
    () => jogadores.filter((j) => !avaliadoNaTemporada(porJogador.get(j.id) ?? [], save?.seasonId ?? null)),
    [jogadores, porJogador, save?.seasonId],
  );

  const ordenados = useMemo(() => {
    const crescimento = (j: Cria) => {
      const s = resumirEvolucao(porJogador.get(j.id) ?? []).serie;
      return s.length > 1 ? (s[s.length - 1] ?? 0) - (s[0] ?? 0) : 0;
    };
    return [...jogadores].sort((a, b) => {
      switch (ordem) {
        case "overall":
          return (b.overall ?? 0) - (a.overall ?? 0);
        case "potencial":
          return (b.potencial ?? 0) - (a.potencial ?? 0);
        case "idade":
          return (a.idade ?? 99) - (b.idade ?? 99);
        case "evolucao":
          return crescimento(b) - crescimento(a);
        default:
          return a.nome.localeCompare(b.nome, "pt-BR");
      }
    });
  }, [jogadores, ordem, porJogador]);

  async function criar(form: JogadorForm) {
    if (!save) return;
    setSalvando(true);
    const payload = formParaPayload(form);
    const { data, error } = await supabase
      .from("players")
      .insert({
        save_id: save.id,
        stint_id: save.stintId,
        categoria: "base",
        criado_via: "manual",
        ...payload,
      })
      .select("id, idade, overall, potencial")
      .single();
    if (error || !data) {
      setSalvando(false);
      toast.error("Não foi possível cadastrar a joia da base.");
      return;
    }
    try {
      await registrarCadastro({
        playerId: data.id as string,
        saveId: save.id,
        stintId: save.stintId,
        seasonId: save.seasonId,
        idade: data.idade as number | null,
        overall: data.overall as number | null,
        potencial: data.potencial as number | null,
      });
    } catch {
      /* a evolução começa na primeira avaliação */
    }
    setSalvando(false);
    toast.success("Jogador adicionado à base!");
    setAdicionando(false);
    void carregar(save.stintId ?? "");
  }

  async function promover(j: Cria) {
    if (!save) return;
    try {
      await registrarPromocao({
        saveId: save.id,
        stintId: save.stintId,
        seasonId: save.seasonId,
        jogador: j,
      });
    } catch {
      /* o registro da promoção é um extra: a promoção em si segue */
    }
    const { error } = await supabase
      .from("players")
      .update({ categoria: "principal" })
      .eq("id", j.id);
    if (error) {
      toast.error("Não foi possível promover o jogador.");
      return;
    }
    toast.success(`${j.nome} foi promovido ao elenco principal!`);
    void carregar(save.stintId ?? "");
  }

  async function liberar(j: Cria) {
    const { error } = await supabase.from("players").delete().eq("id", j.id);
    setLiberando(null);
    if (error) {
      toast.error("Não foi possível liberar o jogador.");
      return;
    }
    toast.success(`${j.nome} foi liberado da base.`);
    if (save) void carregar(save.stintId ?? "");
  }

  const linhasRevisao = useMemo(
    () => (revisando ?? []).map((j) => ({ ...j, posicao: posEn(j.posicao_principal) ?? null })),
    [revisando],
  );

  return (
    <AppShell titulo="Categorias de Base">
      <div className="min-h-full px-4 py-8 sm:px-8">
        <div className="mx-auto max-w-6xl space-y-6">
          <header className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-gradient-pitch text-4xl">Categorias de base</h1>
              <p className="text-sm text-muted-foreground">
                {jogadores.length} jovem(ns) na academia. Acompanhe a evolução antes de promover.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                onClick={() => setRevisando(jogadores)}
                disabled={!save || jogadores.length === 0}
              >
                <ClipboardEdit className="mr-1 h-4 w-4" /> Revisar base
              </Button>
              <Button onClick={() => setAdicionando(true)} disabled={!save}>
                <UserPlus className="mr-1 h-4 w-4" /> Adicionar jogador
              </Button>
            </div>
          </header>

          {pendentes.length > 0 ? (
            <Card className="border-primary/40">
              <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4 text-sm">
                <span className="text-muted-foreground">
                  {pendentes.length} jovem(ns) ainda sem avaliação nesta temporada. Atualize idade,
                  overall e potencial para acompanhar a evolução.
                </span>
                <Button size="sm" variant="secondary" onClick={() => setRevisando(pendentes)}>
                  Avaliar agora
                </Button>
              </CardContent>
            </Card>
          ) : null}

          {jogadores.length > 1 ? (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Ordenar por</span>
              <Select value={ordem} onValueChange={(v) => setOrdem(v as Ordem)}>
                <SelectTrigger className="w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nome">Nome</SelectItem>
                  <SelectItem value="overall">Overall</SelectItem>
                  <SelectItem value="potencial">Potencial</SelectItem>
                  <SelectItem value="idade">Mais jovens</SelectItem>
                  <SelectItem value="evolucao">Maior evolução</SelectItem>
                </SelectContent>
              </Select>
            </div>
          ) : null}

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
              {ordenados.map((j, i) => {
                const avals = porJogador.get(j.id) ?? [];
                const evo = resumirEvolucao(avals);
                const noTeto = j.overall != null && j.potencial != null && j.overall >= j.potencial - 2;
                const semAvaliacao = !avaliadoNaTemporada(avals, save?.seasonId ?? null);
                const folga = Math.max(0, (j.potencial ?? 0) - (j.overall ?? 0));
                return (
                  <StaggerItem key={j.id} index={i}>
                    <HoverCard className="h-full">
                      <Card className="hq-card h-full">
                        <CardContent className="space-y-3 py-4">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <button
                                type="button"
                                onClick={() => abrirJogador(j.id, "carreira")}
                                className="text-left font-display text-xl leading-tight tracking-wide hover:text-primary"
                              >
                                {j.nome}
                              </button>
                              <p className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                                <span>{posEn(j.posicao_principal) ?? "—"}</span>
                                <span>·</span>
                                <Bandeira pais={j.nacionalidade} />
                                <span>{j.nacionalidade ?? "—"}</span>
                              </p>
                            </div>
                            <div className="text-right">
                              <span className="rounded-lg bg-primary/15 px-2 py-1 font-display text-lg text-primary">
                                {j.overall ?? "—"}
                              </span>
                              <div className="mt-1 flex justify-end">
                                <SetaVariacao delta={evo.delta} />
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="font-display text-3xl leading-none">
                                {j.idade ?? "—"}
                                <span className="ml-1 text-xs font-sans text-muted-foreground">
                                  anos
                                </span>
                              </p>
                            </div>
                            <Sparkline valores={evo.serie} className="h-9 w-28" />
                          </div>

                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                              <span>Potencial</span>
                              <span>
                                {j.potencial ?? "—"}
                                {j.potencial ? (
                                  <Badge variant="secondary" className="ml-1">
                                    +{folga}
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

                          <div className="flex flex-wrap gap-1">
                            {evo.estagnado ? (
                              <Badge className="border-warning/40 bg-warning/15 text-warning" variant="outline">
                                Estagnado
                              </Badge>
                            ) : null}
                            {noTeto ? <Badge variant="outline">No teto</Badge> : null}
                            {semAvaliacao ? <Badge variant="outline">Sem avaliação nesta temporada</Badge> : null}
                            {parsePlaystyles(j.playstyle).map((p) => (
                              <Badge key={p} variant="outline">
                                {p}
                              </Badge>
                            ))}
                          </div>

                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="secondary"
                              className="flex-1"
                              onClick={() => setRevisando([j])}
                            >
                              <ClipboardEdit className="mr-1 h-4 w-4" /> Avaliar
                            </Button>
                            <Button size="sm" className="flex-1" onClick={() => void promover(j)}>
                              <ArrowUpCircle className="mr-1 h-4 w-4" /> Promover
                            </Button>
                            <Button
                              size="icon"
                              variant="outline"
                              aria-label={`Liberar ${j.nome}`}
                              onClick={() => setLiberando(j)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </HoverCard>
                  </StaggerItem>
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

      {save ? (
        <RevisaoBaseDialog
          open={revisando !== null}
          onOpenChange={(v) => !v && setRevisando(null)}
          titulo={revisando?.length === 1 ? `Avaliar ${revisando[0]?.nome}` : "Revisão da base"}
          descricao="Atualize idade, overall e potencial. Só quem mudou é salvo e entra na evolução."
          jogadores={linhasRevisao}
          saveId={save.id}
          stintId={save.stintId}
          seasonId={save.seasonId}
          onSalvo={() => void carregar(save.stintId ?? "")}
        />
      ) : null}

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
