import { cn } from "@/lib/utils";

/** Nome oficial do "clube" usado em transferências de jogadores sem contrato. */
export const FREE_AGENT = "Free Agent";

const ALIASES = new Set([
  "free agent",
  "free agents",
  "freeagent",
  "agente livre",
  "agentes livres",
  "sem clube",
]);

function normalizar(v: string) {
  return v
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** Verdadeiro quando o nome do clube representa jogadores livres no mercado. */
export function ehFreeAgent(nome?: string | null): boolean {
  return !!nome && ALIASES.has(normalizar(nome));
}

/** Escudo próprio do Free Agent: um brasão com as iniciais "FA". */
export function FreeAgentCrest({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 28"
      role="img"
      aria-label="Escudo do Free Agent"
      className={cn("shrink-0", className)}
    >
      <path
        d="M12 1.5 3 4.6v8.1c0 6 3.8 11.2 9 13.8 5.2-2.6 9-7.8 9-13.8V4.6L12 1.5Z"
        className="fill-primary stroke-primary-foreground/40"
        strokeWidth="1"
      />
      <text
        x="12"
        y="17"
        textAnchor="middle"
        fontSize="9.5"
        fontWeight="800"
        className="fill-primary-foreground"
      >
        FA
      </text>
    </svg>
  );
}
