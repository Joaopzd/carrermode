import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { POSICOES, posEn } from "@/lib/posicoes";
import { useSaveAtual } from "@/lib/use-save";

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
  GK: "hsl(var(--chart-4, 45 93% 55%))",
  DEF: "hsl(var(--primary))",
  MEI: "hsl(var(--accent))",
  ATA: "hsl(var(--destructive))",
};

function areaDaPosicao(pos: string | null): string {
  const p = posEn(pos);
  return AREAS.find((a) => (a.posicoes as readonly string[]).includes(p ?? ""))?.chave ?? "MEI";
}

function secundarias(valor: unknown): string[] {
  if (Array.isArray(valor)) return valor.map((v) => posEn(String(v)) ?? "").filter(Boolean);
  return [];
}

const libra = (v: number) =>
  `£${v.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`;

function AnaliseElencoPage() {
  const { save, carregando: carregandoSave } = useSaveAtual();
  const [jogadores, setJogadores] = useState<Jogador[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [incluirSecundarias, setIncluirSecundarias] = useState(false);

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
        .eq("save_id", save.id)
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

          {carregando ? (
            <Skeleton className="h-96 w-full rounded-xl" />
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
                    <BarChart data={porPosicao} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="posicao" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <YAxis allowDecimals={false} stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <Tooltip
                        contentStyle={{
                          background: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: 8,
                          color: "hsl(var(--foreground))",
                        }}
                      />
                      <Bar dataKey="jogadores" name="Jogadores" radius={[6, 6, 0, 0]}>
                        {porPosicao.map((d) => (
                          <Cell key={d.posicao} fill={COR_AREA[d.area] ?? "hsl(var(--primary))"} />
                        ))}
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
                  formato={libra}
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
}: {
  titulo: string;
  dados: DadoArea[];
  chave: "idadeMedia" | "overallMedio" | "valorTotal";
  formato: (v: number) => string;
}) {
  return (
    <Card className="hq-card">
      <CardHeader className="pb-2">
        <CardTitle className="font-display text-lg tracking-wide">{titulo}</CardTitle>
      </CardHeader>
      <CardContent className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={dados} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="area" stroke="hsl(var(--muted-foreground))" fontSize={11} />
            <YAxis
              stroke="hsl(var(--muted-foreground))"
              fontSize={11}
              tickFormatter={(v: number) => (chave === "valorTotal" ? `${Math.round(v / 1000)}k` : String(v))}
            />
            <Tooltip
              formatter={(v: number) => formato(Number(v))}
              contentStyle={{
                background: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: 8,
                color: "hsl(var(--foreground))",
              }}
            />
            <Bar dataKey={chave} name={titulo} radius={[6, 6, 0, 0]}>
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
