import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { SkeletonGraficos } from "@/components/loading";
import { useIndicadorCarregamento, useSkeletonDelay } from "@/lib/loading-bus";
import { supabase } from "@/integrations/supabase/client";
import { POSICOES, posEn } from "@/lib/posicoes";
import { useSaveAtual } from "@/lib/use-save";
import { formatarMoedaCompacta } from "@/lib/moeda";
import { useIsMobile } from "@/hooks/use-mobile";

export const Route = createFileRoute("/_authenticated/analise-elenco")({
  head: () => ({
    meta: [
      { title: "Análise de Elenco | Carreira FC Manager" },
      {
        name: "description",
        content:
          "Relatório visual do elenco: jogadores por posição, idade média, overall e valor de mercado por área.",
      },
      { property: "og:title", content: "Análise de Elenco | Carreira FC Manager" },
      {
        property: "og:description",
        content: "Gráficos de distribuição, idade, overall e valor do seu elenco.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AnaliseElencoPage,
});

type Jogador = {
  posicao_principal: string | null;
  posicoes_secundarias: unknown;
  idade: number | null;
  overall: number | null;
  valor_mercado: number | null;
};

const AREAS = [
  { chave: "GK", rotulo: "Goleiros", posicoes: ["GK"] },
  { chave: "DEF", rotulo: "Defesa", posicoes: ["CB", "RB", "LB"] },
  { chave: "MEI", rotulo: "Meio-campo", posicoes: ["CDM", "CM", "LM", "RM", "CAM"] },
  { chave: "ATA", rotulo: "Ataque", posicoes: ["RW", "LW", "CF", "ST"] },
] as const;

const COR_AREA: Record<string, string> = {
  GK: "oklch(0.74 0.16 80)",     // âmbar
  DEF: "oklch(0.58 0.19 250)",    // azul
  MEI: "hsl(var(--primary))",      // verde do tema
  ATA: "oklch(0.66 0.21 35)",     // laranja/vermelho
};

const BARRA_ZERO = {
  fill: "transparent",
  strokeWidth: 2,
  strokeDasharray: "4 3",
};

const ROTULO_AREA: Record<string, string> = {
  GK: "Goleiros",
  DEF: "Defesa",
  MEI: "Meio-campo",
  ATA: "Ataque",
};

/** Cartão de tooltip padrão, fora da área das barras. */
function CaixaTooltip({ titulo, linhas }: { titulo: string; linhas: string[] }) {
  return (
    <div className="pointer-events-none rounded-md border border-border bg-card/95 px-3 py-2 text-xs shadow-lg backdrop-blur">
      <p className="font-display text-sm tracking-wide text-foreground">{titulo}</p>
      {linhas.map((l) => (
        <p key={l} className="text-muted-foreground">
          {l}
        </p>
      ))}
    </div>
  );
}

function areaDaPosicao(pos: string | null): string {
  const p = posEn(pos);
  return AREAS.find((a) => (a.posicoes as readonly string[]).includes(p ?? ""))?.chave ?? "MEI";
}

function secundarias(valor: unknown): string[] {
  if (Array.isArray(valor)) return valor.map((v) => posEn(String(v)) ?? "").filter(Boolean);
  return [];
}

function AnaliseElencoPage() {
  const { save, carregando: carregandoSave } = useSaveAtual();
  const [jogadores, setJogadores] = useState<Jogador[]>([]);
  const [carregando, setCarregando] = useState(true);
  useIndicadorCarregamento(carregando);
  const mostrarSkeleton = useSkeletonDelay(carregando);
  const [incluirSecundarias, setIncluirSecundarias] = useState(false);
  const compacto = useIsMobile();

  useEffect(() => {
    if (carregandoSave) return;
    if (!save) {
      setCarregando(false);
      return;
    }
    void (async () => {
      const { data } = await supabase
        .from("players")
        .select("posicao_principal, posicoes_secundarias, idade, overall, valor_mercado")
        .eq("stint_id", save.stintId ?? "")
        .eq("ativo", true);
      setJogadores((data as Jogador[]) ?? []);
      setCarregando(false);
    })();
  }, [save, carregandoSave]);

  const porPosicao = useMemo(() => {
    const contagem = new Map<string, number>(POSICOES.map((p) => [p, 0]));
    for (const j of jogadores) {
      const principal = posEn(j.posicao_principal);
      if (principal && contagem.has(principal)) {
        contagem.set(principal, (contagem.get(principal) ?? 0) + 1);
      }
      if (incluirSecundarias) {
        for (const s of secundarias(j.posicoes_secundarias)) {
          if (s !== principal && contagem.has(s)) contagem.set(s, (contagem.get(s) ?? 0) + 1);
        }
      }
    }
    return POSICOES.map((p) => ({
      posicao: p,
      jogadores: contagem.get(p) ?? 0,
      area: areaDaPosicao(p),
    }));
  }, [jogadores, incluirSecundarias]);

  const porArea = useMemo(() => {
    return AREAS.map((a) => {
      const grupo = jogadores.filter((j) => areaDaPosicao(j.posicao_principal) === a.chave);
      const media = (nums: number[]) =>
        nums.length ? nums.reduce((s, n) => s + n, 0) / nums.length : 0;
      return {
        area: a.rotulo,
        chave: a.chave,
        jogadores: grupo.length,
        idadeMedia: Number(
          media(grupo.map((j) => j.idade ?? 0).filter((n) => n > 0)).toFixed(1),
        ),
        overallMedio: Number(
          media(grupo.map((j) => j.overall ?? 0).filter((n) => n > 0)).toFixed(1),
        ),
        valorTotal: grupo.reduce((s, j) => s + (j.valor_mercado ?? 0), 0),
      };
    });
  }, [jogadores]);

  const semDados = !carregando && jogadores.length === 0;

  return (
    <AppShell titulo="Análise de Elenco">
      <div className="pitch-lines min-h-full px-4 py-8 sm:px-8">
        <div className="mx-auto max-w-6xl space-y-6">
          <header className="space-y-1">
            <h1 className="text-gradient-pitch text-4xl">Análise de Elenco</h1>
            <p className="text-sm text-muted-foreground">
              Relatório visual do elenco ativo{save?.clubeNome ? ` do ${save.clubeNome}` : ""} —{" "}
              {jogadores.length} jogador(es).
            </p>
          </header>

          {mostrarSkeleton ? (
            <SkeletonGraficos />
          ) : carregando ? (
            <div className="h-96" />
          ) : semDados ? (
            <Card className="border-dashed">
              <CardContent className="py-14 text-center text-sm text-muted-foreground">
                Nenhum jogador ativo cadastrado nesta save.
              </CardContent>
            </Card>
          ) : (
            <>
              <Card className="hq-card">
                <CardHeader className="flex-row items-center justify-between gap-4 space-y-0">
                  <CardTitle className="font-display text-xl tracking-wide">
                    Jogadores por posição
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Switch
                      id="secundarias"
                      checked={incluirSecundarias}
                      onCheckedChange={setIncluirSecundarias}
                    />
                    <Label htmlFor="secundarias" className="text-xs sm:text-sm">
                      Incluir posições secundárias
                    </Label>
                  </div>
                </CardHeader>
                <CardContent className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={porPosicao}
                      margin={{ top: 28, right: 8, left: -20, bottom: 0 }}
                      barCategoryGap={compacto ? "18%" : "28%"}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.35} />
                      <XAxis
                        dataKey="posicao"
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={compacto ? 10 : 12}
                        interval={0}
                        tickMargin={6}
                      />
                      <YAxis allowDecimals={false} stroke="hsl(var(--muted-foreground))" fontSize={compacto ? 10 : 12} />
                      <Tooltip
                        cursor={{ fill: "hsl(var(--muted) / 0.25)" }}
                        wrapperStyle={{ zIndex: 50, outline: "none" }}
                        offset={16}
                        allowEscapeViewBox={{ x: false, y: true }}
                        content={({ active, payload }) => {
                          if (!active || !payload?.length) return null;
                          const d = payload[0]?.payload as (typeof porPosicao)[number] | undefined;
                          if (!d) return null;
                          return (
                            <CaixaTooltip
                              titulo={d.posicao}
                              linhas={[
                                `Área: ${ROTULO_AREA[d.area] ?? d.area}`,
                                `Jogadores: ${d.jogadores}`,
                              ]}
                            />
                          );
                        }}
                      />
                      <Bar dataKey="jogadores" name="Jogadores" radius={[6, 6, 0, 0]} minPointSize={4}>
                        {!compacto && (
                          <LabelList
                            dataKey="jogadores"
                            position="top"
                            formatter={(v: number) => String(v)}
                            fontSize={11}
                            fill="hsl(var(--foreground))"
                          />
                        )}
                        {porPosicao.map((d) => {
                          const cor = COR_AREA[d.area] ?? "hsl(var(--primary))";
                          const isZero = d.jogadores === 0;
                          return (
                            <Cell
                              key={d.posicao}
                              fill={isZero ? BARRA_ZERO.fill : cor}
                              stroke={cor}
                              strokeWidth={isZero ? BARRA_ZERO.strokeWidth : 0}
                              strokeDasharray={isZero ? BARRA_ZERO.strokeDasharray : undefined}
                            />
                          );
                        })}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <div className="grid gap-6 lg:grid-cols-3">
                <GraficoArea
                  titulo="Idade média por área"
                  dados={porArea}
                  chave="idadeMedia"
                  formato={(v) => `${v.toFixed(1)} anos`}
                />
                <GraficoArea
                  titulo="Overall médio por área"
                  dados={porArea}
                  chave="overallMedio"
                  formato={(v) => v.toFixed(1)}
                />
                <GraficoArea
                  titulo="Valor de mercado por área"
                  dados={porArea}
                  chave="valorTotal"
                  formato={(v) => formatarMoedaCompacta(v, save?.moeda ?? "EUR")}
                  moeda
                />
              </div>
            </>
          )}
        </div>
      </div>
    </AppShell>
  );
}

type DadoArea = {
  area: string;
  chave: string;
  jogadores: number;
  idadeMedia: number;
  overallMedio: number;
  valorTotal: number;
};

function GraficoArea({
  titulo,
  dados,
  chave,
  formato,
  moeda = false,
}: {
  titulo: string;
  dados: DadoArea[];
  chave: "idadeMedia" | "overallMedio" | "valorTotal";
  formato: (v: number) => string;
  moeda?: boolean;
}) {
  const compacto = useIsMobile();
  return (
    <Card className="hq-card">
      <CardHeader className="pb-2">
        <CardTitle className="font-display text-lg tracking-wide">{titulo}</CardTitle>
      </CardHeader>
      <CardContent className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={dados}
            margin={{ top: 28, right: 8, left: -10, bottom: 0 }}
            barCategoryGap={compacto ? "18%" : "28%"}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.35} />
            <XAxis
              dataKey="area"
              stroke="hsl(var(--muted-foreground))"
              fontSize={compacto ? 10 : 11}
              interval={0}
              tickMargin={6}
            />
            <YAxis
              stroke="hsl(var(--muted-foreground))"
              fontSize={compacto ? 10 : 11}
              tickFormatter={(v: number) =>
                moeda ? formato(Number(v)) : String(v)
              }
            />
            <Tooltip
              cursor={{ fill: "hsl(var(--muted) / 0.25)" }}
              wrapperStyle={{ zIndex: 50, outline: "none" }}
              offset={16}
              allowEscapeViewBox={{ x: false, y: true }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0]?.payload as DadoArea | undefined;
                if (!d) return null;
                return (
                  <CaixaTooltip
                    titulo={d.area}
                    linhas={[
                      `${titulo}: ${formato(Number(d[chave]))}`,
                      `Jogadores: ${d.jogadores}`,
                    ]}
                  />
                );
              }}
            />
            <Bar dataKey={chave} name={titulo} radius={[6, 6, 0, 0]}>
              {!compacto && (
                <LabelList
                  dataKey={chave}
                  position="top"
                  formatter={(v: number) => formato(Number(v))}
                  fontSize={11}
                  fill="hsl(var(--foreground))"
                />
              )}
              {dados.map((d) => (
                <Cell key={d.chave} fill={COR_AREA[d.chave] ?? "hsl(var(--primary))"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
