import { ArrowLeftRight, Ban, CheckCircle2, HeartPulse, ShieldCheck, HelpCircle } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type Config = { icone: LucideIcon; classe: string };

const CONFIG: Record<string, Config> = {
  Liberado: { icone: CheckCircle2, classe: "bg-emerald-500/15 text-emerald-400" },
  Convocado: { icone: ShieldCheck, classe: "bg-sky-500/15 text-sky-400" },
  Lesionado: { icone: HeartPulse, classe: "bg-red-500/15 text-red-400" },
  Suspenso: { icone: Ban, classe: "bg-orange-500/15 text-orange-400" },
  "Em transição": { icone: ArrowLeftRight, classe: "bg-violet-500/15 text-violet-400" },
};

/** Ícone colorido com tooltip para o status do jogador. */
export function StatusJogador({ status, className = "" }: { status: string | null; className?: string }) {
  const cfg = CONFIG[status ?? ""] ?? {
    icone: HelpCircle,
    classe: "bg-muted text-muted-foreground",
  };
  const Icone = cfg.icone;
  const rotulo = status ?? "Sem status";

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            aria-label={rotulo}
            className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${cfg.classe} ${className}`}
          >
            <Icone className="h-4 w-4" />
            <span className="sr-only">{rotulo}</span>
          </span>
        </TooltipTrigger>
        <TooltipContent>{rotulo}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
