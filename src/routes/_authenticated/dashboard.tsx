import { ClubBadge } from "@/components/club-badge";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Award,
  Banknote,
  CalendarClock,
  Flag,
  Gavel,
  HeartPulse,
  Megaphone,
  Newspaper,
  Repeat,
  ImagePlus,
  Loader2,
  Sprout,
  Star,
  Trophy,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { contarMvps } from "@/lib/mvp";
import { encerrarTemporada, garantirSeasonAtiva, type TransicaoLiga } from "@/lib/season";
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
          "Resumo da carreira: elenco, próximo jogo, últimos resultados e notícias do clube.",
      },
      { property: "og:title", content: "Central do clube | Carreira FC Manager" },
      {
        property: "og:description",
        content: "Acompanhe elenco, calendário, resultados e notícias do seu modo carreira.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

type Resumo = {
  saveId: string;
  seasonId: string | null;
  seasonNome: string | null;
  clubeNome: string | null;
  escudo: string | null;
  ligaNome: string | null;
  temporada: string;
  manager: { nome_usado: string | null; nome: string; estilo_tatico: string | null } | null;
  overallMedio: number | null;
  valorTotal: number;
  artilheiro: { nome: string; gols: number } | null;
  melhorNota: { nome: string; nota: number } | null;
  maisMvp: { nome: string; vezes: number } | null;
  trofeus: number;
  proximo: {
    data_hora: string | null;
    adversario: string | null;
    competicao: string | null;
  } | null;
  ultimos: {
    id: string;
    adversario: string | null;
    placar_time: number | null;
    placar_adversario: number | null;
  }[];
  noticias: { id: string; tipo: string; titulo: string; corpo: string | null }[];
};

const ICONE_NOTICIA: Record<string, typeof Newspaper> = {
  resultado: Trophy,
  transferencia: Repeat,
  torcida: Megaphone,
  diretoria: Gavel,
  lesao: HeartPulse,
  base: Sprout,
};

function moeda(v: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0,
  }).format(v);
}

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
      const { nova, transicao: t } = await encerrarTemporada(resumo.saveId, resumo.seasonId);
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
      .from("saves")
      .update({ escudo_url: valor })
      .eq("id", resumo.saveId);
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
        .select("id, temporada, escudo_url, clubs(nome, escudo_url), leagues(nome)")
        .eq("user_id", userId)
        .order("criado_em", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!save) {
        navigate({ to: "/onboarding" });
        return;
      }

      const saveId = save.id as string;

      const season = await garantirSeasonAtiva(saveId, (save.temporada as string) || "Temporada 1");
      const seasonId = season?.id ?? null;
      const porSeason = <T,>(q: T): T => (seasonId ? (q as never as { eq: (a: string, b: string) => T }).eq("season_id", seasonId) : q);

      const [managerRes, playersRes, matchesRes, finalizadasRes, newsRes] = await Promise.all([
        supabase
          .from("managers")
          .select("nome, nome_usado, estilo_tatico")
          .eq("save_id", saveId)
          .maybeSingle(),
        supabase
          .from("players")
          .select("id, nome, overall, valor_mercado")
          .eq("save_id", saveId)
          .eq("ativo", true),
        porSeason(
          supabase
            .from("matches")
            .select("data_hora, adversario, competicao")
            .eq("save_id", saveId)
            .eq("status", "agendada"),
        )
          .order("data_hora", { ascending: true })
          .limit(1)
          .maybeSingle(),
        porSeason(
          supabase
            .from("matches")
            .select("id, adversario, placar_time, placar_adversario")
            .eq("save_id", saveId)
            .eq("status", "finalizada"),
        )
          .order("data_hora", { ascending: false })
          .limit(5),
        porSeason(
          supabase.from("news_feed").select("id, tipo, titulo, corpo").eq("save_id", saveId),
        )
          .order("gerado_em", { ascending: false })
          .limit(5),
      ]);

      const players = playersRes.data ?? [];
      const overalls = players.map((p) => p.overall).filter((o): o is number => o != null);
      const valorTotal = players.reduce((acc, p) => acc + Number(p.valor_mercado ?? 0), 0);

      let artilheiro: Resumo["artilheiro"] = null;
      let melhorNota: Resumo["melhorNota"] = null;
      if (players.length > 0) {
        const ids = players.map((p) => p.id);
        const { data: stats } = await supabase
          .from("match_player_stats")
          .select("player_id, gols, nota")
          .in("player_id", ids);

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

      const mvpMapa = await contarMvps(saveId, seasonId);
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
        .eq("save_id", saveId)
        .eq("e_meu_clube_campeao", true);

      const clube = (save as { clubs: { nome: string; escudo_url: string | null } | null }).clubs;
      const liga = (save as { leagues: { nome: string } | null }).leagues;

      setResumo({
        saveId,
        seasonId,
        seasonNome: season?.nome ?? null,
        clubeNome: clube?.nome ?? null,
        escudo: ((save as { escudo_url: string | null }).escudo_url ?? clube?.escudo_url) ?? null,

        ligaNome: liga?.nome ?? null,
        temporada: save.temporada as string,
        manager: managerRes.data ?? null,
        overallMedio:
          overalls.length > 0
            ? Math.round(overalls.reduce((a, b) => a + b, 0) / overalls.length)
            : null,
        valorTotal,
        trofeus: trofeusCount ?? 0,
        artilheiro,
        melhorNota,
        maisMvp,
        proximo: matchesRes.data ?? null,
        ultimos: finalizadasRes.data ?? [],
        noticias: newsRes.data ?? [],
      });
      setCarregando(false);
    })();
  }, [navigate]);

  return (
    <AppShell titulo="Central do clube">
      <div className="pitch-lines min-h-full px-4 py-6 sm:px-8">
        <div className="mx-auto max-w-6xl space-y-6">
          {carregando || !resumo ? (
            mostrarSkeleton || !resumo ? <SkeletonDashboard /> : <div className="h-96" />
          ) : (
            <>
              <section className="glow-panel flex flex-wrap items-center gap-4 rounded-xl border border-border bg-card p-5">
                <div className="group relative">
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
                <div className="min-w-0 flex-1">
                  <h1 className="font-display text-3xl leading-tight tracking-wide text-foreground break-words sm:text-4xl">
                    {resumo.clubeNome ?? "Clube a definir"}
                  </h1>
                  <p className="text-sm font-medium text-foreground/70 break-words">
                    {resumo.ligaNome ?? "Liga"} · Temporada {resumo.temporada}
                  </p>
                </div>
                <div className="ml-auto flex flex-col items-start gap-2 sm:items-end sm:text-right">
                  <p className="font-display text-lg tracking-wide break-words">
                    {resumo.manager?.nome_usado ?? resumo.manager?.nome ?? "Treinador"}
                  </p>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">
                    {resumo.manager?.estilo_tatico ?? "Estilo a definir"}
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground">
                      {resumo.seasonNome ?? "Temporada ativa"}
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

              <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                <ResumoCard
                  icone={<Star className="h-4 w-4" />}
                  rotulo="Overall médio"
                  {...(resumo.overallMedio != null
                    ? { numero: resumo.overallMedio }
                    : { valor: "—" })}
                  detalhe="Elenco cadastrado"
                />
                <ResumoCard
                  icone={<Banknote className="h-4 w-4" />}
                  rotulo="Valor do elenco"
                  valor={moeda(resumo.valorTotal)}
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
                  icone={<Star className="h-4 w-4 text-accent" />}
                  rotulo="Mais vezes MVP"
                  valor={resumo.maisMvp?.nome ?? "—"}
                  detalhe={
                    resumo.maisMvp
                      ? `${resumo.maisMvp.vezes} MVP(s) na temporada`
                      : "Nenhum MVP registrado"
                  }
                />
                <ResumoCard
                  icone={<Trophy className="h-4 w-4 text-amber-400" />}
                  rotulo="Troféus"
                  numero={resumo.trofeus}
                  detalhe="Títulos do clube na carreira"
                />
              </section>

              <section className="grid gap-4 lg:grid-cols-2">
                <Card>
                  <CardHeader className="flex-row items-center gap-2 pb-2">
                    <CalendarClock className="h-4 w-4 text-primary" />
                    <CardTitle className="text-base font-semibold uppercase tracking-[0.06em]">
                      Próximo jogo
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {resumo.proximo ? (
                      <div className="space-y-1">
                        <div className="font-display text-2xl break-words">
                          <ClubBadge nome={resumo.proximo.adversario ?? "Adversário a definir"} tamanho="md" />
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {resumo.proximo.competicao ?? "Competição"} ·{" "}
                          {resumo.proximo.data_hora
                            ? new Date(resumo.proximo.data_hora).toLocaleString("pt-BR")
                            : "data a definir"}
                        </p>
                      </div>
                    ) : (
                      <Vazio texto="Nenhuma partida agendada. Cadastre o calendário para ver o próximo confronto aqui." />
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-semibold uppercase tracking-[0.06em]">
                      Últimos 5 resultados
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {resumo.ultimos.length > 0 ? (
                      <ul className="space-y-2">
                        {resumo.ultimos.map((m, i) => {
                          const gp = m.placar_time ?? 0;
                          const gc = m.placar_adversario ?? 0;
                          const r = gp > gc ? "V" : gp === gc ? "E" : "D";
                          const cor =
                            r === "V"
                              ? "bg-primary text-primary-foreground"
                              : r === "E"
                                ? "bg-accent text-accent-foreground"
                                : "bg-destructive text-destructive-foreground";
                          return (
                            <StaggerItem key={m.id} index={i}>
                            <li className="flex items-center gap-3 text-sm">
                              <span
                                className={`flex h-7 w-7 items-center justify-center rounded-md font-display text-base ${cor}`}
                              >
                                {r}
                              </span>
                              <ClubBadge nome={m.adversario} className="flex-1" />
                              <span className="font-semibold tabular-nums">
                                {gp} × {gc}
                              </span>
                            </li>
                            </StaggerItem>
                          );
                        })}
                      </ul>
                    ) : (
                      <Vazio texto="Nenhuma partida finalizada ainda. Os resultados aparecem aqui após o primeiro jogo." />
                    )}
                  </CardContent>
                </Card>
              </section>

              <section>
                <Card>
                  <CardHeader className="flex-row items-center gap-2 pb-2">
                    <Newspaper className="h-4 w-4 text-primary" />
                    <CardTitle className="text-base font-semibold uppercase tracking-[0.06em]">
                      Feed de notícias
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {resumo.noticias.length > 0 ? (
                      <ul className="divide-y divide-border">
                        {resumo.noticias.map((n, i) => {
                          const Icone = ICONE_NOTICIA[n.tipo] ?? Newspaper;
                          return (
                            <StaggerItem key={n.id} index={i}>
                            <li className="flex gap-3 py-3 first:pt-0 last:pb-0">
                              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-primary">
                                <Icone className="h-4 w-4" />
                              </span>
                              <div className="min-w-0">
                                <p className="font-semibold">{n.titulo}</p>
                                {n.corpo && (
                                  <p className="text-sm text-muted-foreground">{n.corpo}</p>
                                )}
                              </div>
                            </li>
                            </StaggerItem>
                          );
                        })}
                      </ul>
                    ) : (
                      <Vazio texto="A sala de imprensa está calma. Notícias de resultados, transferências, torcida e diretoria aparecem aqui." />
                    )}
                  </CardContent>
                </Card>
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
