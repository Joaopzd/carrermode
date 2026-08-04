import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Award,
  Banknote,
  CalendarClock,
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
import { AppShell } from "@/components/app-shell";
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
import { Skeleton } from "@/components/ui/skeleton";

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
  clubeNome: string | null;
  escudo: string | null;
  ligaNome: string | null;
  temporada: string;
  manager: { nome_usado: string | null; nome: string; estilo_tatico: string | null } | null;
  overallMedio: number | null;
  valorTotal: number;
  artilheiro: { nome: string; gols: number } | null;
  melhorNota: { nome: string; nota: number } | null;
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
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(v);
}

function Dashboard() {
  const navigate = useNavigate();
  const [carregando, setCarregando] = useState(true);
  const [resumo, setResumo] = useState<Resumo | null>(null);
  const [editandoEscudo, setEditandoEscudo] = useState(false);
  const [urlEscudo, setUrlEscudo] = useState("");
  const [salvandoEscudo, setSalvandoEscudo] = useState(false);

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

      const [managerRes, playersRes, matchesRes, finalizadasRes, newsRes] = await Promise.all([
        supabase
          .from("managers")
          .select("nome, nome_usado, estilo_tatico")
          .eq("save_id", saveId)
          .maybeSingle(),
        supabase.from("players").select("id, nome, overall, valor_mercado").eq("save_id", saveId),
        supabase
          .from("matches")
          .select("data_hora, adversario, competicao")
          .eq("save_id", saveId)
          .eq("status", "agendada")
          .order("data_hora", { ascending: true })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("matches")
          .select("id, adversario, placar_time, placar_adversario")
          .eq("save_id", saveId)
          .eq("status", "finalizada")
          .order("data_hora", { ascending: false })
          .limit(5),
        supabase
          .from("news_feed")
          .select("id, tipo, titulo, corpo")
          .eq("save_id", saveId)
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

      const clube = (save as { clubs: { nome: string; escudo_url: string | null } | null }).clubs;
      const liga = (save as { leagues: { nome: string } | null }).leagues;

      setResumo({
        saveId,
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
        artilheiro,
        melhorNota,
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
            <div className="space-y-4">
              <Skeleton className="h-28 w-full" />
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[0, 1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-28 w-full" />
                ))}
              </div>
            </div>
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
                <div className="min-w-0">

                  <h1 className="text-gradient-pitch text-3xl sm:text-4xl">
                    {resumo.clubeNome ?? "Clube a definir"}
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    {resumo.ligaNome ?? "Liga"} · Temporada {resumo.temporada}
                  </p>
                </div>
                <div className="ml-auto text-right">
                  <p className="font-display text-xl tracking-wide">
                    {resumo.manager?.nome_usado ?? resumo.manager?.nome ?? "Treinador"}
                  </p>
                  <p className="text-xs uppercase tracking-[0.2em] text-primary">
                    {resumo.manager?.estilo_tatico ?? "Estilo a definir"}
                  </p>
                </div>
              </section>

              <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <ResumoCard
                  icone={<Star className="h-4 w-4" />}
                  rotulo="Overall médio"
                  valor={resumo.overallMedio != null ? String(resumo.overallMedio) : "—"}
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
              </section>

              <section className="grid gap-4 lg:grid-cols-2">
                <Card>
                  <CardHeader className="flex-row items-center gap-2 pb-2">
                    <CalendarClock className="h-4 w-4 text-primary" />
                    <CardTitle className="text-base uppercase tracking-wide">
                      Próximo jogo
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {resumo.proximo ? (
                      <div className="space-y-1">
                        <p className="font-display text-3xl">
                          {resumo.proximo.adversario ?? "Adversário a definir"}
                        </p>
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
                    <CardTitle className="text-base uppercase tracking-wide">
                      Últimos 5 resultados
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {resumo.ultimos.length > 0 ? (
                      <ul className="space-y-2">
                        {resumo.ultimos.map((m) => {
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
                            <li key={m.id} className="flex items-center gap-3 text-sm">
                              <span
                                className={`flex h-7 w-7 items-center justify-center rounded-md font-display text-base ${cor}`}
                              >
                                {r}
                              </span>
                              <span className="flex-1 truncate">{m.adversario ?? "—"}</span>
                              <span className="font-semibold tabular-nums">
                                {gp} × {gc}
                              </span>
                            </li>
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
                    <CardTitle className="text-base uppercase tracking-wide">
                      Feed de notícias
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {resumo.noticias.length > 0 ? (
                      <ul className="divide-y divide-border">
                        {resumo.noticias.map((n) => {
                          const Icone = ICONE_NOTICIA[n.tipo] ?? Newspaper;
                          return (
                            <li key={n.id} className="flex gap-3 py-3 first:pt-0 last:pb-0">
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
    </AppShell>
  );
}

function ResumoCard({
  icone,
  rotulo,
  valor,
  detalhe,
}: {
  icone: React.ReactNode;
  rotulo: string;
  valor: string;
  detalhe: string;
}) {
  return (
    <Card className="glow-panel">
      <CardContent className="pt-6">
        <p className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
          <span className="text-primary">{icone}</span>
          {rotulo}
        </p>
        <p className="mt-2 truncate font-display text-3xl">{valor}</p>
        <p className="text-xs text-muted-foreground">{detalhe}</p>
      </CardContent>
    </Card>
  );
}

function Vazio({ texto }: { texto: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
      {texto}
    </div>
  );
}
