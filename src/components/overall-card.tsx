import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { calcularVariacao, usePlayerOverallHistory } from "@/lib/overall-history";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/** Mini gráfico de linha sem eixos nem rótulos — só a forma da curva. */
export function Sparkline({
  valores,
  className,
  cor = "var(--color-primary)",
}: {
  valores: number[];
  className?: string;
  cor?: string;
}) {
  if (valores.length < 2) return null;
  const w = 100;
  const h = 28;
  const min = Math.min(...valores);
  const max = Math.max(...valores);
  const span = max - min || 1;
  const pontos = valores.map((v, i) => {
    const x = (i / (valores.length - 1)) * w;
    const y = h - ((v - min) / span) * (h - 4) - 2;
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  });

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      aria-hidden="true"
      className={cn("h-7 w-24", className)}
    >
      <polyline
        points={pontos.join(" ")}
        fill="none"
        stroke={cor}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

/** Badge de variação total (ex.: 77 → 80 (+3)). */
export function VariacaoBadge({
  initial,
  current,
  variation,
}: {
  initial: number | null;
  current: number | null;
  variation: number | null;
}) {
  if (variation == null || initial == null || current == null) return null;
  const positivo = variation > 0;
  const negativo = variation < 0;
  const Icone = positivo ? ArrowUpRight : negativo ? ArrowDownRight : Minus;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold",
        positivo && "border-emerald-500/40 bg-emerald-500/15 text-emerald-500",
        negativo && "border-destructive/40 bg-destructive/15 text-destructive",
        !positivo && !negativo && "border-border bg-muted text-muted-foreground",
      )}
    >
      <Icone className="h-3 w-3" />
      {initial} → {current} ({variation > 0 ? "+" : ""}
      {variation})
    </span>
  );
}

/** Card de OVERALL com prévia compacta da evolução. */
export function OverallCard({
  playerId,
  overall,
  className,
}: {
  playerId: string;
  overall: number | null;
  className?: string;
}) {
  const { history, loading } = usePlayerOverallHistory(playerId);
  const { initial, current, variation } = calcularVariacao(history, overall);
  const valores = history.map((p) => p.overall);
  if (overall != null && valores[valores.length - 1] !== overall) valores.push(overall);

  return (
    <div className={cn("rounded-lg border border-border p-3", className)}>
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Overall</p>
      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
        <p className="font-display text-2xl leading-none">{overall ?? "—"}</p>
        {loading ? (
          <Skeleton className="h-7 w-24" />
        ) : (
          <>
            <Sparkline valores={valores} />
            <VariacaoBadge initial={initial} current={current} variation={variation} />
          </>
        )}
      </div>
    </div>
  );
}
