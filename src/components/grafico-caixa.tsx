import { useState } from "react";

export type PontoCaixa = {
  id: string;
  rotulo: string;
  /** Variação do caixa neste movimento (positivo = entrou dinheiro). */
  delta: number;
  /** Caixa depois do movimento. */
  saldo: number;
};

type Props = {
  inicial: number;
  pontos: PontoCaixa[];
  formatar: (v: number) => string;
};

const W = 640;
const H = 220;
const PX = 64;
const PY = 22;

/** Caixa ao longo da temporada: degraus a cada compra, venda ou parcela. */
export function GraficoCaixa({ inicial, pontos, formatar }: Props) {
  const [ativo, setAtivo] = useState<number | null>(null);
  const serie: PontoCaixa[] = [
    { id: "inicio", rotulo: "Início da temporada", delta: 0, saldo: inicial },
    ...pontos,
  ];

  const valores = serie.map((s) => s.saldo);
  let min = Math.min(...valores);
  let max = Math.max(...valores);
  if (min === max) {
    min -= 1;
    max += 1;
  }
  const folga = (max - min) * 0.14;
  min -= folga;
  max += folga;

  const x = (i: number) =>
    serie.length === 1 ? PX : PX + (i / (serie.length - 1)) * (W - PX - PY);
  const y = (v: number) => PY + (1 - (v - min) / (max - min)) * (H - 2 * PY);

  let linha = `M ${x(0)} ${y(serie[0]!.saldo)}`;
  for (let i = 1; i < serie.length; i++) {
    linha += ` H ${x(i)} V ${y(serie[i]!.saldo)}`;
  }
  const area = `${linha} V ${H - PY} H ${x(0)} Z`;
  const detalhe = ativo != null ? serie[ativo] : null;

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Caixa ao longo da temporada">
        <line x1={PX} x2={W - PY} y1={y(inicial)} y2={y(inicial)} className="stroke-border" strokeDasharray="4 4" />
        <path d={area} className="fill-primary/10" />
        <path d={linha} className="fill-none stroke-primary" strokeWidth={2} strokeLinejoin="round" />
        <text x={PX - 8} y={y(Math.max(...valores)) + 4} textAnchor="end" className="fill-muted-foreground" fontSize={11}>
          {formatar(Math.max(...valores))}
        </text>
        {Math.min(...valores) !== Math.max(...valores) && (
          <text x={PX - 8} y={y(Math.min(...valores)) + 4} textAnchor="end" className="fill-muted-foreground" fontSize={11}>
            {formatar(Math.min(...valores))}
          </text>
        )}
        {serie.map((p, i) => (
          <g key={p.id} onMouseEnter={() => setAtivo(i)} onClick={() => setAtivo(i)} className="cursor-pointer">
            <circle cx={x(i)} cy={y(p.saldo)} r={12} fill="transparent" />
            <circle
              cx={x(i)}
              cy={y(p.saldo)}
              r={ativo === i ? 6 : 4}
              className={
                i === 0
                  ? "fill-primary"
                  : p.delta > 0
                    ? "fill-success"
                    : p.delta < 0
                      ? "fill-destructive"
                      : "fill-muted-foreground"
              }
            />
          </g>
        ))}
      </svg>
      <p className="min-h-5 text-xs text-muted-foreground">
        {detalhe
          ? `${detalhe.rotulo}${detalhe.delta !== 0 ? ` · ${detalhe.delta > 0 ? "+" : "−"}${formatar(Math.abs(detalhe.delta))}` : ""} · caixa ${formatar(detalhe.saldo)}`
          : serie.length > 1
            ? "Passe o mouse ou toque num ponto para ver o movimento."
            : "Sem movimentações ainda nesta temporada."}
      </p>
    </div>
  );
}
