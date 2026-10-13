import { Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { escudoPorNome, useClubes } from "@/lib/clubes";
import { FREE_AGENT, FreeAgentCrest, ehFreeAgent } from "@/components/free-agent-crest";

type Props = {
  nome?: string | null | undefined;
  /** Escudo já conhecido; quando ausente, é buscado pelo nome na tabela clubs. */
  escudoUrl?: string | null | undefined;
  className?: string | undefined;
  tamanho?: "sm" | "md" | "lg" | undefined;
  /** Oculta o nome, mostrando apenas o escudo. */
  semNome?: boolean | undefined;
  /** Classes extras aplicadas apenas ao texto do nome. */
  textoClassName?: string | undefined;
};

const TAMANHOS = {
  sm: "h-4 w-4",
  md: "h-6 w-6",
  lg: "h-10 w-10",
} as const;

/** Nome do clube acompanhado do escudo, com fallback de ícone genérico. */
export function ClubBadge({
  nome,
  escudoUrl,
  className,
  tamanho = "sm",
  semNome = false,
  textoClassName,
}: Props) {
  const clubes = useClubes();
  const freeAgent = ehFreeAgent(nome);
  const url = freeAgent ? null : (escudoUrl ?? escudoPorNome(clubes, nome));
  const box = TAMANHOS[tamanho];

  return (
    <span className={cn("inline-flex min-w-0 items-center gap-1.5", className)}>
      {freeAgent ? (
        <FreeAgentCrest className={box} />
      ) : url ? (
        <img
          src={url}
          alt={nome ? `Escudo do ${nome}` : "Escudo"}
          loading="lazy"
          className={cn(box, "shrink-0 object-contain")}
        />
      ) : (
        <Shield className={cn(box, "shrink-0 text-muted-foreground")} aria-hidden />
      )}
      {!semNome && (
        <span className={cn("truncate", textoClassName)}>
          {freeAgent ? FREE_AGENT : nome?.trim() || "—"}
        </span>
      )}
    </span>
  );
}
