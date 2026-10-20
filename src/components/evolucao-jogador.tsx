import { useMemo } from "react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import { rotuloTipo, useEvolucaoJogador } from "@/lib/evolucao-jogador";
import { cn } from "@/lib/utils";

const config = {
  overall: { label: "Overall", color: "var(--color-primary)" },
  potencial: { label: "Potencial", color: "var(--color-chart-3)" },
} satisfies ChartConfig;

const dia = (iso: string) =>
  new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });

export function SetaVariacao({ delta }: { delta: number | null }) {
  if (delta == null) return null;
  const Icone = delta > 0 ? ArrowUpRight : delta < 0 ? ArrowDownRight : Minus;
  return (
    <span
      className={cn(
        "inline-flex items-center text-xs font-semibold",
        delta > 0 && "text-success",
        delta < 0 && "text-destructive",
        delta === 0 && "text-muted-foreground",
      )}
    >
      <Icone className="h-3.5 w-3.5" />
      {delta > 0 ? "+" : ""}
      {delta}
    </span>
  );
}

/** Evolução do jogador: gráfico de overall e potencial e linha do tempo com idade. */
export function EvolucaoJogador({ playerId }: { playerId: string }) {
  const { pontos, carregando } = useEvolucaoJogador(playerId);

  const dados = useMemo(
    () => pontos.map((p) => ({ ...p, label: dia(p.quando) })),
    [pontos],
  );
  const linhas = useMemo(() => {
    let anterior: number | null = null;
    return pontos
      .map((p) => {
        const delta = p.overall != null && anterior != null ? p.overall - anterior : null;
        if (p.overall != null) anterior = p.overall;
        return { ...p, delta };
      })
      .reverse();
  }, [pontos]);

  if (carregando) return <Skeleton className="h-64 w-full" />;
  if (pontos.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
        Nenhuma evolução registrada para este jogador.
      </p>
    );
  }
  const temPotencial = dados.some((d) => d.potencial != null);

  return (
    <div className="space-y-4">
      {dados.length > 1 ? (
        <ChartContainer config={config} className="aspect-auto h-56 w-full">
          <LineChart data={dados} margin={{ left: 0, right: 12, top: 12, bottom: 0 }}>
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
              connectNulls
            />
            {temPotencial ? (
              <Line
                type="monotone"
                dataKey="potencial"
                stroke="var(--color-potencial)"
                strokeWidth={2}
                strokeDasharray="5 4"
                dot={false}
                connectNulls
              />
            ) : null}
          </LineChart>
        </ChartContainer>
      ) : null}

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="text-left text-[11px] uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-3 py-2">Data</th>
              <th className="px-3 py-2">Idade</th>
              <th className="px-3 py-2">Overall</th>
              <th className="px-3 py-2">Potencial</th>
              <th className="px-3 py-2">Evento</th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((p) => (
              <tr key={p.id} className="border-t border-border">
                <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">{dia(p.quando)}</td>
                <td className="px-3 py-2">{p.idade ?? "—"}</td>
                <td className="px-3 py-2">
                  <span className="mr-2 font-display text-lg">{p.overall ?? "—"}</span>
                  <SetaVariacao delta={p.delta} />
                </td>
                <td className="px-3 py-2">{p.potencial ?? "—"}</td>
                <td className="px-3 py-2 text-xs text-muted-foreground">
                  {rotuloTipo(p.tipo)}
                  {p.nota ? ` · ${p.nota}` : ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
