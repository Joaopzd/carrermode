import { CHAVES_ATRIBUTO, rotulosAtributos, type Atributos } from "@/lib/atributos-jogador";
import { cn } from "@/lib/utils";

const W = 320;
const H = 300;
const CX = W / 2;
const CY = H / 2;
const R = 92;
// hexágono de topo reto, no sentido horário a partir do canto superior esquerdo
const ANGULOS = [-120, -60, 0, 60, 120, 180].map((g) => (g * Math.PI) / 180);

const ponto = (i: number, fracao: number, raio = R) => ({
  x: CX + Math.cos(ANGULOS[i]!) * raio * fracao,
  y: CY + Math.sin(ANGULOS[i]!) * raio * fracao,
});

const caminho = (fracoes: number[]) =>
  fracoes
    .map((f, i) => {
      const p = ponto(i, f);
      return `${i === 0 ? "M" : "L"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
    })
    .join(" ") + " Z";

/** Gráfico hexagonal dos seis atributos, com o overall no centro. Traço simples, sem cores. */
export function RadarAtributos({
  atributos,
  overall,
  goleiro = false,
  className,
}: {
  atributos: Partial<Atributos>;
  overall: number | null;
  goleiro?: boolean;
  className?: string;
}) {
  const rotulos = rotulosAtributos(goleiro);
  const valores = CHAVES_ATRIBUTO.map((c) => atributos[c] ?? null);
  const completo = valores.every((v) => v != null);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label="Gráfico de atributos"
      className={cn("mx-auto h-auto w-full max-w-sm", className)}
    >
      {[0.25, 0.5, 0.75, 1].map((f) => (
        <path
          key={f}
          d={caminho(Array(6).fill(f))}
          className="fill-none stroke-border"
          strokeWidth={f === 1 ? 1.5 : 1}
        />
      ))}
      {ANGULOS.map((_, i) => {
        const p = ponto(i, 1);
        return <line key={i} x1={CX} y1={CY} x2={p.x} y2={p.y} className="stroke-border" strokeWidth={1} />;
      })}

      {completo ? (
        <>
          <path
            d={caminho(valores.map((v) => Math.min(100, Math.max(0, v ?? 0)) / 100))}
            className="fill-primary/15 stroke-primary"
            strokeWidth={2}
            strokeLinejoin="round"
          />
          {valores.map((v, i) => {
            const p = ponto(i, Math.min(100, Math.max(0, v ?? 0)) / 100);
            return <circle key={i} cx={p.x} cy={p.y} r={3} className="fill-primary" />;
          })}
        </>
      ) : null}

      {rotulos.map((r, i) => {
        const p = ponto(i, 1, R + 16);
        const cos = Math.cos(ANGULOS[i]!);
        const ancora = cos < -0.3 ? "end" : cos > 0.3 ? "start" : "middle";
        const v = valores[i];
        return (
          <g key={r.chave}>
            <text x={p.x} y={p.y - 3} textAnchor={ancora} fontSize={11} className="fill-muted-foreground">
              {r.sigla}
            </text>
            <text
              x={p.x}
              y={p.y + 15}
              textAnchor={ancora}
              fontSize={17}
              fontWeight={700}
              className="fill-foreground"
            >
              {v ?? "—"}
            </text>
          </g>
        );
      })}

      <text
        x={CX}
        y={CY + 10}
        textAnchor="middle"
        fontSize={34}
        fontWeight={700}
        className="fill-foreground"
        style={{ fontFamily: "var(--font-display)" }}
      >
        {overall ?? "—"}
      </text>
      <text x={CX} y={CY + 26} textAnchor="middle" fontSize={10} className="fill-muted-foreground">
        {goleiro ? "OVERALL" : "OVERALL"}
      </text>
    </svg>
  );
}
