import { useMemo } from "react";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { Badge } from "@/components/ui/badge";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import { calcularVariacao, usePlayerOverallHistory } from "@/lib/overall-history";

type Props = {
  playerId: string;
  currentOverall: number | null;
};

const chartConfig = {
  overall: { label: "Overall", color: "var(--color-primary)" },
} satisfies ChartConfig;

export function PlayerEvolution({ playerId, currentOverall }: Props) {
  const { history, seasonNames, loading } = usePlayerOverallHistory(playerId);

  const points = useMemo(() => {
    const countBySeason = new Map<string, number>();
    for (const point of history) {
      countBySeason.set(point.season_id, (countBySeason.get(point.season_id) ?? 0) + 1);
    }
    return history.map((point) => ({
      ...point,
      label:
        (countBySeason.get(point.season_id) ?? 0) > 1
          ? new Date(point.registrado_em).toLocaleDateString("pt-BR")
          : seasonNames[point.season_id] ?? "Temporada",
    }));
  }, [history, seasonNames]);

  if (loading) return <Skeleton className="h-52 w-full" />;

  const { initial, current, variation } = calcularVariacao(history, currentOverall);

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Evolução
        </h3>
        {variation != null ? (
          <Badge variant={variation >= 0 ? "default" : "destructive"}>
            {initial} → {current} ({variation >= 0 ? "+" : ""}
            {variation})
          </Badge>
        ) : null}
      </div>
      {points.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          Nenhuma evolução registrada para este jogador.
        </p>
      ) : (
        <ChartContainer config={chartConfig} className="h-56 w-full aspect-auto">
          <LineChart data={points} margin={{ left: 0, right: 12, top: 12, bottom: 0 }}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="label" tickLine={false} axisLine={false} minTickGap={24} />
            <YAxis
              domain={["dataMin - 2", "dataMax + 2"]}
              allowDecimals={false}
              tickLine={false}
              axisLine={false}
              width={28}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Line
              type="monotone"
              dataKey="overall"
              stroke="var(--color-overall)"
              strokeWidth={3}
              dot={{ fill: "var(--color-overall)", r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ChartContainer>
      )}
    </section>
  );
}
