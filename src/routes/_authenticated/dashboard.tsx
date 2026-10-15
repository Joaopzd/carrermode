import { ClubBadge } from "@/components/club-badge";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Award,
  Banknote,
  CalendarClock,
  Flag,
  ImagePlus,
  ListOrdered,
  Loader2,
  Star,
  Target,
  Trophy,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { garantirStintAtiva } from "@/lib/stint";
import { formatarMoedaCompacta, moedaDoPais, type CodigoMoeda } from "@/lib/moeda";
import { contarMvps } from "@/lib/mvp";
import { encerrarTemporada, garantirSeasonAtiva, type TransicaoLiga } from "@/lib/season";
import { ajusteFinanceiroParcelado } from "@/lib/transferencias-futuras";
import { calcularCaixa } from "@/lib/financas";
import { cn } from "@/lib/utils";
import { AppShell } from "@/components/app-shell";
import { CountUp, HoverCard, StaggerItem } from "@/components/motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Label } from "@/components/ui/label";
import { SkeletonDashboard } from "@/components/loading";
import { useIndicadorCarregamento, useSkeletonDelay } from "@/lib/loading-bus";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Central do clube | Carreira FC Manager" },
      {
        name: "description",
        content:
          "Resumo da carreira: overall, forma, classificação, próximos jogos e objetivos da diretoria.",
      },
      { property: "og:title", content: "Central do clube | Carreira FC Manager" },
      {
        property: "og:description",
        content: "Acompanhe elenco, calendário, resultados e metas do seu modo carreira.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

type Jogo = {
  id: string;
  adversario: string | null;
  placar_time: number | null;
  placar_adversario: number | null;
  competicao: string | null;
  data_hora: string | null;
  mando: string | null;
};

type LinhaTabela = {
  time: string;
  posicao: number | null;
  pontos: number | null;
  jogos: number | null;
};

type Objetivo = {
  tipo: string;
  rotulo: string;
  progresso: number;
  estado: "ok" | "risco" | "neutro";
  texto: string;
};

type Resumo = {
  saveId: string;
  stintId: string;
  seasonId: string | null;
  seasonNome: string | null;
  clubeNome: string | null;
  escudo: string | null;
  ligaNome: string | null;
  temporada: string;
  moeda: CodigoMoeda;
  manager: { nome_usado: string | null; nome: string; estilo_tatico: string | null } | null;
  overallEquipe: number | null;
  /** Caixa atual (orçamento inicial + vendas − compras); nulo se o orçamento não foi definido. */
  caixa: number | null;
  variacaoCaixa: number;
  valorTotal: number;
  artilheiro: { nome: string; gols: number } | null;
  melhorNota: { nome: string; nota: number } | null;
  maisMvp: { nome: string; vezes: number } | null;
  trofeus: number;
  proximos: Jogo[];
  /** Do mais antigo para o mais recente. */
  ultimos: Jogo[];
  tabela: { linhas: LinhaTabela[]; minhaPosicao: number | null };
  objetivos: Objetivo[];
};

const normalizar = (v: string | null | undefined) =>
  (v ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();

const ROTULO_OBJETIVO: Record<string, string> = {
  posicao_alvo: "Posição-alvo na liga",
  receita_vendas: "Receita com vendas",
  teto_salarial: "Teto salarial do elenco",
};

const rotuloMando = (m: string | null) =>
  !m ? null : /casa|home/i.test(m) ? "Casa" : /fora|away/i.test(m) ? "Fora" : m;

function Dashboard() {
  const navigate = useNavigate();
  const [carregando, setCarregando] = useState(true);
  useIndicadorCarregamento(carregando);
  const mostrarSkeleton = useSkeletonDelay(carregando);
  const [resumo, setResumo] = useState<Resumo | null>(null);
  const [editandoEscudo, setEditandoEscudo] = useState(false);
  const [urlEscudo, setUrlEscudo] = useState("");
  const [salvandoEscudo, setSalvandoEscudo] = useState(false);
  const [confirmandoEncerrar, setConfirmandoEncerrar] = useState(false);
  const [encerrando, setEncerrando] = useState(false);
  const [transicao, setTransicao] = useState<
    (TransicaoLiga & { novaTemporada: string | null }) | null
  >(null);

  async function confirmarEncerrarTemporada() {
    if (!resumo?.seasonId) return;
    setEncerrando(true);
    try {
      const { nova, transicao: t } = await encerrarTemporada(resumo.saveId, resumo.seasonId, resumo.stintId);
      setConfirmandoEncerrar(false);
      setTransicao({ ...t, novaTemporada: nova?.nome ?? null });
    } catch {
      toast.error("Não foi possível encerrar a temporada.");
    } finally {
      setEncerrando(false);
    }
  }

  async function carregarArquivoEscudo(file: File) {
    if (file.size > 2 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 2 MB.");
      return;
    }
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("erro"));
      reader.readAsDataURL(file);
    }).catch(() => null);
    if (!dataUrl) {
      toast.error("Não foi possível ler o arquivo.");
      return;
    }
    if (file.type === "image/svg+xml") {
      setUrlEscudo(dataUrl);
      return;
    }
    const img = new Image();
    img.onload = () => {
      const max = 256;
      const escala = Math.min(1, max / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * escala);
      canvas.height = Math.round(img.height * escala);
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        setUrlEscudo(dataUrl);
        return;
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      setUrlEscudo(canvas.toDataURL("image/png"));
    };
    img.onerror = () => toast.error("Arquivo de imagem inválido.");
    img.src = dataUrl;
  }

  async function salvarEscudo() {
    if (!resumo) return;
    setSalvandoEscudo(true);
    const valor = urlEscudo.trim() || null;
    const { error } = await supabase
      .from("stints")
      .update({ escudo_url: valor })
      .eq("id", resumo.stintId);
    setSalvandoEscudo(false);
    if (error) {
      toast.error("Não foi possível salvar a logo do clube.");
      return;
    }
    setResumo((r) => (r ? { ...r, escudo: valor } : r));
    setEditandoEscudo(false);
    toast.success("Logo do clube atualizada!");
  }

  useEffect(() => {
    void (async () => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) return;

      const { data: save } = await supabase
        .from("saves")
        .select("id, temporada")
        .eq("user_id", userId)
        .order("criado_em", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!save) {
        navigate({ to: "/onboarding" });
        return;
      }

      const saveId = save.id as string;

      const stint = await garantirStintAtiva(saveId);
      if (!stint) { navigate({ to: "/mudar-clube" }); return; }
      const stintId = stint.id;
      const { data: identidade } = await supabase.from("stints")
        .select("clubs(nome, escudo_url, pais), leagues(nome, pais)").eq("id", stintId).single();
      const season = await garantirSeasonAtiva(saveId, (save.temporada as string) || "Temporada 1", stintId);
      const seasonId = season?.id ?? null;
      const porSeason = <T,>(q: T): T => (seasonId ? (q as never as { eq: (a: string, b: string) => T }).eq("season_id", seasonId) : q);

      const [managerRes, playersRes, proximosRes, finalizadasRes, standingsRes, objetivosRes] =
        await Promise.all([
          supabase
            .from("managers")
            .select("nome, nome_usado, estilo_tatico")
            .eq("save_id", saveId)
            .maybeSingle(),
          supabase
            .from("players")
            .select("id, nome, overall, valor_mercado, salario")
            .eq("stint_id", stintId)
            .eq("ativo", true),
          porSeason(
            supabase
              .from("matches")
              .select("id, data_hora, adversario, competicao, mando, placar_time, placar_adversario")
              .eq("stint_id", stintId)
              .eq("status", "agendada"),
          )
            .order("data_hora", { ascending: true })
            .limit(3),
          porSeason(
            supabase
              .from("matches")
              .select("id, data_hora, adversario, competicao, mando, placar_time, placar_adversario")
              .eq("stint_id", stintId)
              .eq("status", "finalizada"),
          )
            .order("data_hora", { ascending: false })
            .limit(5),
          porSeason(
            supabase
              .from("standings_snapshot")
              .select("time, posicao, pontos, jogos, rodada")
              .eq("stint_id", stintId),
          )
            .order("rodada", { ascending: false })
            .limit(400),
          supabase.from("board_objectives").select("tipo, meta").eq("stint_id", stintId),
        ]);

      const players = playersRes.data ?? [];
      const overalls = players
        .map((p) => p.overall)
        .filter((o): o is number => o != null)
        .sort((a, b) => b - a)
        .slice(0, 18);
      const valorTotal = players.reduce((acc, p) => acc + Number(p.valor_mercado ?? 0), 0);
      const folha = players.reduce((acc, p) => acc + Number(p.salario ?? 0), 0);

      let artilheiro: Resumo["artilheiro"] = null;
      let melhorNota: Resumo["melhorNota"] = null;
      if (players.length > 0) {
        const ids = players.map((p) => p.id);
        const { data: jogosTemporada } = await porSeason(supabase.from("matches").select("id").eq("stint_id", stintId).eq("status", "finalizada"));
        const matchIds = (jogosTemporada ?? []).map((m) => m.id);
        const { data: stats } = await supabase
          .from("match_player_stats")
          .select("player_id, gols, nota")
          .in("player_id", ids).in("match_id", matchIds);

        const porJogador = new Map<string, { gols: number; notas: number[] }>();
        for (const s of stats ?? []) {
          if (!s.player_id) continue;
          const atual = porJogador.get(s.player_id) ?? { gols: 0, notas: [] };
          atual.gols += s.gols ?? 0;
          if (s.nota != null) atual.notas.push(Number(s.nota));
          porJogador.set(s.player_id, atual);
        }
        const nomePor = new Map(players.map((p) => [p.id, p.nome]));
        for (const [pid, v] of porJogador) {
          const nome = nomePor.get(pid) ?? "—";
          if (v.gols > 0 && (!artilheiro || v.gols > artilheiro.gols)) {
            artilheiro = { nome, gols: v.gols };
          }
          if (v.notas.length > 0) {
            const media = v.notas.reduce((a, b) => a + b, 0) / v.notas.length;
            if (!melhorNota || media > melhorNota.nota) melhorNota = { nome, nota: media };
          }
        }
      }

      const mvpMapa = await contarMvps(saveId, seasonId, stintId);
      let maisMvp: Resumo["maisMvp"] = null;
      if (Object.keys(mvpMapa).length > 0) {
        const nomePorId = new Map(players.map((p) => [p.id, p.nome]));
        const faltando = Object.keys(mvpMapa).filter((id) => !nomePorId.has(id));
        if (faltando.length > 0) {
          const { data: extras } = await supabase
            .from("players")
            .select("id, nome")
            .in("id", faltando);
          for (const e of (extras ?? []) as { id: string; nome: string }[]) {
            nomePorId.set(e.id, e.nome);
          }
        }
        for (const [pid, vezes] of Object.entries(mvpMapa)) {
          if (!maisMvp || vezes > maisMvp.vezes) {
            maisMvp = { nome: nomePorId.get(pid) ?? "—", vezes };
          }
        }
      }

      const { count: trofeusCount } = await supabase
        .from("trophy_gallery")
        .select("id", { count: "exact", head: true })
        .eq("stint_id", stintId)
        .eq("e_meu_clube_campeao", true);

      const clube = identidade?.clubs;
      const liga = identidade?.leagues;
      const moeda = moedaDoPais(clube?.pais ?? liga?.pais);

      const financas = seasonId ? await calcularCaixa(stintId, seasonId) : null;

      // Classificação: última rodada sincronizada, janela de 5 times ao redor do meu.
      const todas = standingsRes.data ?? [];
      const ultimaRodada = todas[0]?.rodada ?? null;
      const linhasTabela: LinhaTabela[] = todas
        .filter((l) => l.rodada === ultimaRodada)
        .map((l) => ({ time: l.time, posicao: l.posicao, pontos: l.pontos, jogos: l.jogos }))
        .sort((a, b) => (a.posicao ?? 99) - (b.posicao ?? 99));
      const idxMeu = linhasTabela.findIndex((l) => normalizar(l.time) === normalizar(clube?.nome));
      const minhaPosicao = idxMeu >= 0 ? (linhasTabela[idxMeu]?.posicao ?? idxMeu + 1) : null;
      const inicioJanela =
        idxMeu >= 0 ? Math.max(0, Math.min(idxMeu - 2, linhasTabela.length - 5)) : 0;
      const janelaTabela = linhasTabela.slice(inicioJanela, inicioJanela + 5);

      // Objetivos da diretoria e o quanto já foi cumprido (sem gerar notícias nem chamar IA).
      const fmt = (v: number) => formatarMoedaCompacta(v, moeda);
      const objetivos: Objetivo[] = [];
      for (const o of objetivosRes.data ?? []) {
        const meta = Number(o.meta);
        if (!Number.isFinite(meta) || meta <= 0) continue;
        const rotulo = ROTULO_OBJETIVO[o.tipo] ?? o.tipo;
        if (o.tipo === "posicao_alvo") {
          if (minhaPosicao == null) {
            objetivos.push({ tipo: o.tipo, rotulo, progresso: 0, estado: "neutro", texto: `Alvo ${meta}º · sem classificação` });
          } else {
            const ok = minhaPosicao <= meta;
            objetivos.push({
              tipo: o.tipo,
              rotulo,
              progresso: ok ? 100 : Math.max(5, Math.min(100, (meta / minhaPosicao) * 100)),
              estado: ok ? "ok" : "risco",
              texto: `${minhaPosicao}º · alvo ${meta}º`,
            });
          }
        } else if (o.tipo === "receita_vendas") {
          const { data: vendas } = await porSeason(
            supabase.from("transfers").select("valor").eq("stint_id", stintId).eq("tipo", "saida"),
          );
          let atual = (vendas ?? []).reduce((a, t) => a + Number(t.valor ?? 0), 0);
          if (seasonId) atual += (await ajusteFinanceiroParcelado(stintId, seasonId)).saidas;
          objetivos.push({
            tipo: o.tipo,
            rotulo,
            progresso: Math.max(0, Math.min(100, (atual / meta) * 100)),
            estado: atual >= meta ? "ok" : "neutro",
            texto: `${fmt(atual)} / ${fmt(meta)}`,
          });
        } else if (o.tipo === "teto_salarial") {
          objetivos.push({
            tipo: o.tipo,
            rotulo,
            progresso: Math.max(0, Math.min(100, (folha / meta) * 100)),
            estado: folha <= meta ? "ok" : "risco",
            texto: `${fmt(folha)} / ${fmt(meta)}`,
          });
        }
      }

      setResumo({
        saveId,
        stintId,
        seasonId,
        seasonNome: season?.nome ?? null,
        clubeNome: clube?.nome ?? null,
        escudo: (stint.escudo_url ?? clube?.escudo_url) ?? null,

        ligaNome: liga?.nome ?? null,
        temporada: season?.nome ?? (save.temporada as string),
        moeda,
        manager: managerRes.data ?? null,
        overallEquipe:
          overalls.length > 0
            ? Math.round(overalls.reduce((a, b) => a + b, 0) / overalls.length)
            : null,
        caixa: financas?.caixa ?? null,
        variacaoCaixa: (financas?.receitas ?? 0) - (financas?.gastos ?? 0),
        valorTotal,
        trofeus: trofeusCount ?? 0,
        artilheiro,
        melhorNota,
        maisMvp,
        proximos: (proximosRes.data ?? []) as Jogo[],
        ultimos: [...((finalizadasRes.data ?? []) as Jogo[])].reverse(),
        tabela: { linhas: janelaTabela, minhaPosicao },
        objetivos,
      });
      setCarregando(false);
    })();
  }, [navigate]);

  return (
    <AppShell titulo="Central do clube">
      <div className="min-h-full px-4 py-6 sm:px-8">
        <div className="mx-auto max-w-6xl space-y-6">
          {carregando || !resumo ? (
            mostrarSkeleton || !resumo ? <SkeletonDashboard /> : <div className="h-96" />
          ) : (
            <>
              {/* Card principal: identidade, overall da equipe e forma */}
              <section className="glow-panel rounded-xl p-5">
                <div className="flex flex-wrap items-center gap-x-8 gap-y-5">
                  <div className="flex min-w-0 flex-1 items-center gap-4">
                    <div className="group relative shrink-0">
                      {resumo.escudo ? (
                        <img
                          src={resumo.escudo}
                          alt={`Escudo do ${resumo.clubeNome ?? "clube"}`}
                          className="h-16 w-16 object-contain"
                        />
                      ) : (
                        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted font-display text-2xl">
                          {(resumo.clubeNome ?? "FC").slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <Button
                        size="icon"
                        variant="secondary"
                        aria-label="Alterar logo do clube"
                        className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full shadow"
                        onClick={() => {
                          setUrlEscudo(resumo.escudo ?? "");
                          setEditandoEscudo(true);
                        }}
                      >
                        <ImagePlus className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <div className="min-w-0">
                      <h1 className="break-words font-display text-3xl leading-tight tracking-wide text-foreground sm:text-4xl">
                        {resumo.clubeNome ?? "Clube a definir"}
                      </h1>
                      <p className="break-words text-sm font-medium text-foreground/70">
                        {resumo.ligaNome ?? "Liga"}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {resumo.manager?.nome_usado ?? resumo.manager?.nome ?? "Treinador"}
                        {resumo.manager?.estilo_tatico ? ` · ${resumo.manager.estilo_tatico}` : ""}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
                    <div>
                      <p className="text-[0.7rem] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                        Overall da equipe
                      </p>
                      <p className="font-display text-5xl leading-none text-primary">
                        {resumo.overallEquipe != null ? (
                          <CountUp valor={resumo.overallEquipe} decimais={0} />
                        ) : (
                          "—"
                        )}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">Média dos 18 melhores</p>
                    </div>

                    <div>
                      <p className="text-[0.7rem] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                        Caixa disponível
                      </p>
                      {resumo.caixa != null ? (
                        <>
                          <p className="font-display text-4xl leading-none">
                            {resumo.caixa < 0 ? "−" : ""}
                            {formatarMoedaCompacta(Math.abs(resumo.caixa), resumo.moeda)}
                          </p>
                          <p
                            className={cn(
                              "mt-1 text-xs",
                              resumo.variacaoCaixa > 0 && "text-success",
                              resumo.variacaoCaixa < 0 && "text-destructive",
                              resumo.variacaoCaixa === 0 && "text-muted-foreground",
                            )}
                          >
                            {resumo.variacaoCaixa > 0 ? "+" : resumo.variacaoCaixa < 0 ? "−" : ""}
                            {formatarMoedaCompacta(Math.abs(resumo.variacaoCaixa), resumo.moeda)} na
                            temporada
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="font-display text-3xl leading-none text-muted-foreground">—</p>
                          <Link
                            to="/configuracoes"
                            className="mt-1 block text-xs text-primary hover:underline"
                          >
                            Definir orçamento
                          </Link>
                        </>
                      )}
                    </div>

                    <div>
                      <p className="text-[0.7rem] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                        Forma · últimos 5
                      </p>
                      <TooltipProvider delayDuration={100}>
                        <div className="mt-1.5 flex gap-1.5">
                          {Array.from({ length: 5 }).map((_, i) => {
                            const jogo = resumo.ultimos[i - (5 - resumo.ultimos.length)];
                            if (!jogo) {
                              return (
                                <span
                                  key={i}
                                  className="flex h-8 w-8 items-center justify-center rounded-md border border-dashed border-border text-xs text-muted-foreground"
                                >
                                  –
                                </span>
                              );
                            }
                            const gp = jogo.placar_time ?? 0;
                            const gc = jogo.placar_adversario ?? 0;
                            const r = gp > gc ? "V" : gp === gc ? "E" : "D";
                            const cor =
                              r === "V"
                                ? "bg-success text-success-foreground"
                                : r === "E"
                                  ? "bg-warning text-warning-foreground"
                                  : "bg-destructive text-destructive-foreground";
                            return (
                              <Tooltip key={jogo.id}>
                                <TooltipTrigger asChild>
                                  <span
                                    className={cn(
                                      "flex h-8 w-8 cursor-default items-center justify-center rounded-md font-display text-lg",
                                      cor,
                                    )}
                                  >
                                    {r}
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent side="bottom" className="px-2 py-1 text-xs">
                                  {gp} × {gc} · {jogo.adversario ?? "Adversário"}
                                </TooltipContent>
                              </Tooltip>
                            );
                          })}
                        </div>
                      </TooltipProvider>
                    </div>
                  </div>

                  <div className="flex flex-col items-start gap-2 sm:items-end">
                    <span className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground">
                      {/^temporada\b/i.test(resumo.temporada) ? resumo.temporada : `Temporada ${resumo.temporada}`}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!resumo.seasonId}
                      onClick={() => setConfirmandoEncerrar(true)}
                    >
                      <Flag className="mr-1 h-3.5 w-3.5" /> Encerrar temporada
                    </Button>
                  </div>
                </div>
              </section>

              {/* Mini tabela + próximos 3 jogos */}
              <section className="grid gap-4 lg:grid-cols-2">
                <Card className="glow-panel">
                  <CardHeader className="flex-row items-center gap-2 pb-2">
                    <ListOrdered className="h-4 w-4 text-primary" />
                    <CardTitle className="text-base font-semibold uppercase tracking-[0.06em]">
                      Classificação
                    </CardTitle>
                    <Link
                      to="/classificacao"
                      className="ml-auto text-xs text-muted-foreground hover:text-foreground"
                    >
                      Ver tabela completa
                    </Link>
                  </CardHeader>
                  <CardContent>
                    {resumo.tabela.linhas.length > 0 ? (
                      <div>
                        <div className="flex items-center gap-3 px-2 pb-1 text-[0.65rem] uppercase tracking-widest text-muted-foreground">
                          <span className="w-5 text-right">#</span>
                          <span className="flex-1">Clube</span>
                          <span className="w-8 text-right">J</span>
                          <span className="w-8 text-right">Pts</span>
                        </div>
                        <ul className="space-y-0.5">
                          {resumo.tabela.linhas.map((l) => {
                            const minha =
                              normalizar(l.time) === normalizar(resumo.clubeNome);
                            return (
                              <li
                                key={l.time}
                                className={cn(
                                  "flex items-center gap-3 rounded-md px-2 py-1.5 text-sm",
                                  minha && "bg-primary/10 ring-1 ring-primary/40",
                                )}
                              >
                                <span className="w-5 text-right tabular-nums text-muted-foreground">
                                  {l.posicao ?? "–"}
                                </span>
                                <ClubBadge nome={l.time} className="flex-1" />
                                <span className="w-8 text-right tabular-nums text-muted-foreground">
                                  {l.jogos ?? 0}
                                </span>
                                <span className="w-8 text-right font-semibold tabular-nums">
                                  {l.pontos ?? 0}
                                </span>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    ) : (
                      <Vazio texto="Sem classificação sincronizada. Registre a tabela da liga em Classificação para vê-la aqui." />
                    )}
                  </CardContent>
                </Card>

                <Card className="glow-panel">
                  <CardHeader className="flex-row items-center gap-2 pb-2">
                    <CalendarClock className="h-4 w-4 text-primary" />
                    <CardTitle className="text-base font-semibold uppercase tracking-[0.06em]">
                      Próximos jogos
                    </CardTitle>
                    <Link
                      to="/calendario"
                      className="ml-auto text-xs text-muted-foreground hover:text-foreground"
                    >
                      Calendário
                    </Link>
                  </CardHeader>
                  <CardContent>
                    {resumo.proximos.length > 0 ? (
                      <ul className="divide-y divide-border">
                        {resumo.proximos.map((j, i) => {
                          const mando = rotuloMando(j.mando);
                          return (
                            <StaggerItem key={j.id} index={i}>
                              <li className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                                <div className="min-w-0 flex-1">
                                  <div className="font-display text-xl break-words">
                                    <ClubBadge nome={j.adversario ?? "Adversário a definir"} tamanho="md" />
                                  </div>
                                  <p className="text-xs text-muted-foreground">
                                    {j.competicao ?? "Competição"} ·{" "}
                                    {j.data_hora
                                      ? new Date(j.data_hora).toLocaleString("pt-BR", {
                                          day: "2-digit",
                                          month: "2-digit",
                                          hour: "2-digit",
                                          minute: "2-digit",
                                        })
                                      : "data a definir"}
                                  </p>
                                </div>
                                {mando ? (
                                  <span className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">
                                    {mando}
                                  </span>
                                ) : null}
                              </li>
                            </StaggerItem>
                          );
                        })}
                      </ul>
                    ) : (
                      <Vazio texto="Nenhuma partida agendada. Cadastre o calendário para ver os próximos confrontos aqui." />
                    )}
                  </CardContent>
                </Card>
              </section>

              {/* Objetivos da diretoria */}
              <section>
                <Card className="glow-panel">
                  <CardHeader className="flex-row items-center gap-2 pb-2">
                    <Target className="h-4 w-4 text-primary" />
                    <CardTitle className="text-base font-semibold uppercase tracking-[0.06em]">
                      Objetivos da diretoria
                    </CardTitle>
                    <Link
                      to="/metas"
                      className="ml-auto text-xs text-muted-foreground hover:text-foreground"
                    >
                      Editar metas
                    </Link>
                  </CardHeader>
                  <CardContent>
                    {resumo.objetivos.length > 0 ? (
                      <ul className="grid gap-4 sm:grid-cols-3">
                        {resumo.objetivos.map((o) => (
                          <li key={o.tipo} className="space-y-1.5">
                            <div className="flex items-baseline justify-between gap-2">
                              <span className="text-xs font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                                {o.rotulo}
                              </span>
                              <span
                                className={cn(
                                  "text-xs font-medium",
                                  o.estado === "ok" && "text-success",
                                  o.estado === "risco" && "text-destructive",
                                  o.estado === "neutro" && "text-muted-foreground",
                                )}
                              >
                                {o.estado === "ok" ? "No caminho" : o.estado === "risco" ? "Em risco" : "Em andamento"}
                              </span>
                            </div>
                            <div className="h-2 overflow-hidden rounded-full bg-muted">
                              <div
                                className={cn(
                                  "h-full rounded-full transition-all duration-500",
                                  o.estado === "ok" && "bg-success",
                                  o.estado === "risco" && "bg-destructive",
                                  o.estado === "neutro" && "bg-primary",
                                )}
                                style={{ width: `${o.progresso}%` }}
                              />
                            </div>
                            <p className="text-sm tabular-nums">{o.texto}</p>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <Vazio texto="A diretoria ainda não definiu objetivos. Cadastre as metas da temporada em Metas da Diretoria." />
                    )}
                  </CardContent>
                </Card>
              </section>

              {/* Estatísticas do elenco */}
              <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                <ResumoCard
                  icone={<Banknote className="h-4 w-4" />}
                  rotulo="Valor do elenco"
                  valor={formatarMoedaCompacta(resumo.valorTotal, resumo.moeda)}
                  detalhe="Soma de valor de mercado"
                />
                <ResumoCard
                  icone={<Trophy className="h-4 w-4" />}
                  rotulo="Artilheiro"
                  valor={resumo.artilheiro?.nome ?? "—"}
                  detalhe={
                    resumo.artilheiro ? `${resumo.artilheiro.gols} gol(s)` : "Sem gols registrados"
                  }
                />
                <ResumoCard
                  icone={<Award className="h-4 w-4" />}
                  rotulo="Melhor nota média"
                  valor={resumo.melhorNota?.nome ?? "—"}
                  detalhe={
                    resumo.melhorNota
                      ? resumo.melhorNota.nota.toFixed(2)
                      : "Sem notas registradas"
                  }
                />
                <ResumoCard
                  icone={<Star className="h-4 w-4 text-gold" />}
                  rotulo="Mais vezes MVP"
                  valor={resumo.maisMvp?.nome ?? "—"}
                  detalhe={
                    resumo.maisMvp
                      ? `${resumo.maisMvp.vezes} MVP(s) na temporada`
                      : "Nenhum MVP registrado"
                  }
                />
                <ResumoCard
                  icone={<Trophy className="h-4 w-4 text-gold" />}
                  rotulo="Troféus"
                  numero={resumo.trofeus}
                  detalhe="Títulos do clube na carreira"
                />
              </section>
            </>
          )}
        </div>
      </div>

      <Dialog open={confirmandoEncerrar} onOpenChange={setConfirmandoEncerrar}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Encerrar {resumo?.seasonNome ?? "temporada"}?</DialogTitle>
            <DialogDescription>
              Vamos calcular o resumo da temporada (posição final, artilheiro e saldo de
              transferências), ler a classificação final para definir acesso, rebaixamento ou
              classificação continental, arquivar a temporada e abrir a próxima já na divisão
              correta.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmandoEncerrar(false)}>
              Cancelar
            </Button>
            <Button onClick={() => void confirmarEncerrarTemporada()} disabled={encerrando}>
              {encerrando ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
              Encerrar e iniciar nova
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={transicao !== null} onOpenChange={() => window.location.reload()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {transicao?.movimento === "acesso"
                ? "🎉 Acesso conquistado!"
                : transicao?.movimento === "rebaixamento"
                  ? "⬇️ Rebaixamento confirmado"
                  : "🏁 Temporada encerrada"}
            </DialogTitle>
            <DialogDescription>
              Nova temporada: {transicao?.novaTemporada ?? "criada"}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 text-sm">
            <p>
              Posição final:{" "}
              <span className="font-semibold">
                {transicao?.posicao ? `${transicao.posicao}º` : "não informada"}
              </span>
              {transicao?.zona ? ` · ${transicao.zona}` : ""}
            </p>
            <p>
              Divisão:{" "}
              <span className="font-semibold">
                {transicao?.ligaNova
                  ? `${transicao.ligaAnterior ?? "—"} → ${transicao.ligaNova}`
                  : (transicao?.ligaAnterior ?? "—")}
              </span>
            </p>
            {transicao && transicao.competicoes.length > 0 ? (
              <p>
                Classificado para:{" "}
                <span className="font-semibold">{transicao.competicoes.join(", ")}</span>
              </p>
            ) : null}
            {!transicao?.posicao ? (
              <p className="text-xs text-muted-foreground">
                Registre a tabela da liga em Classificação para que o sistema identifique
                automaticamente acesso, rebaixamento e vagas continentais.
              </p>
            ) : null}
          </div>
          <DialogFooter>
            <Button onClick={() => window.location.reload()}>Começar nova temporada</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editandoEscudo} onOpenChange={setEditandoEscudo}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Logo do clube</DialogTitle>
            <DialogDescription>
              Escolha uma imagem do seu computador para usar como escudo do clube.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1">
              <Label>Arquivo de imagem</Label>
              <Input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void carregarArquivoEscudo(file);
                }}
              />
              <p className="text-xs text-muted-foreground">
                PNG, JPG, WEBP ou SVG (até 2 MB). A imagem é redimensionada automaticamente.
              </p>
            </div>
            {urlEscudo.trim() ? (
              <div className="flex items-center gap-3 rounded-lg border border-border p-3">
                <img
                  src={urlEscudo.trim()}
                  alt="Pré-visualização da logo"
                  className="h-14 w-14 object-contain"
                />
                <span className="text-xs text-muted-foreground">Pré-visualização</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-auto"
                  onClick={() => setUrlEscudo("")}
                >
                  Remover
                </Button>
              </div>
            ) : null}
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditandoEscudo(false)}>
              Cancelar
            </Button>
            <Button onClick={() => void salvarEscudo()} disabled={salvandoEscudo}>
              {salvandoEscudo ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
              Salvar logo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}


function ResumoCard({
  icone,
  rotulo,
  valor,
  numero,
  decimais = 0,
  detalhe,
}: {
  icone: React.ReactNode;
  rotulo: string;
  valor?: string;
  numero?: number | null;
  decimais?: number;
  detalhe: string;
}) {
  return (
    <HoverCard className="h-full">
      <Card className="glow-panel h-full">
        <CardContent className="pt-6">
          <p className="flex items-start gap-2 text-[0.7rem] font-semibold uppercase leading-snug tracking-[0.08em] text-muted-foreground">
            <span className="mt-0.5 shrink-0 text-primary">{icone}</span>
            <span className="break-words">{rotulo}</span>
          </p>
          <p className="mt-2 break-words text-xl font-bold leading-tight text-foreground">
            {numero != null ? (
              <CountUp valor={numero} decimais={decimais} />
            ) : (
              (valor ?? "—")
            )}
          </p>
          <p className="mt-1 break-words text-xs font-medium leading-snug text-muted-foreground">
            {detalhe}
          </p>
        </CardContent>
      </Card>
    </HoverCard>
  );
}

function Vazio({ texto }: { texto: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
      {texto}
    </div>
  );
}
