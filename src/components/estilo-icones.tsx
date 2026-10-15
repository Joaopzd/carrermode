import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Ícones de estilo de jogo (traço branco sobre fundo escuro, herdam a cor do texto). */
const TRACO = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2.6,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

const ICONES: Record<string, ReactNode> = {
  Gegenpressing: (
    <g {...TRACO}>
      <circle cx="24" cy="24" r="6" />
      <path d="M7 7L17 17M11.7 15.4L17 17L15.4 11.7 M41 7L31 17M32.6 11.7L31 17L36.3 15.4 M7 41L17 31M15.4 36.3L17 31L11.7 32.6 M41 41L31 31M36.3 32.6L31 31L32.6 36.3" />
    </g>
  ),
  "Kick and Rush": (
    <g>
      <circle cx="12" cy="17" r="8" fill="currentColor" />
      <path
        d="M22 31c0-3 3-5 6-5l5-1 3-6h6l1 10c2 1 3 3 3 5v2H22Z"
        fill="currentColor"
      />
      <path d="M26 36h3v4h-3ZM32 36h3v4h-3ZM38 36h3v4h-3ZM43 36h2v4h-2Z" fill="currentColor" />
      <path
        d="M36 20l2 3M33 22l2 3M30 24l2 3"
        stroke="var(--background)"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </g>
  ),
  "Tiki-Taka": (
    <g {...TRACO}>
      <path d="M26.4 11.3L38.6 33.7M34 30.6L38.6 33.7L38.5 28.2 M36.2 38L11.8 38M16.6 35.4L11.8 38L16.6 40.6 M9.4 33.7L21.6 11.3M21.5 16.8L21.6 11.3L17 14.4" />
    </g>
  ),
  "Park the Bus": (
    <g {...TRACO}>
      <rect x="9" y="7" width="30" height="29" rx="5" />
      <rect x="13" y="11" width="22" height="10" rx="2" />
      <path d="M9 26h30" />
      <circle cx="16" cy="31" r="1.2" fill="currentColor" />
      <circle cx="32" cy="31" r="1.2" fill="currentColor" />
      <path d="M14 36v5M34 36v5" />
    </g>
  ),
  "Counter Attack": (
    <g {...TRACO}>
      <path d="M28 5 13 26h10l-3 17 15-22H25Z" />
    </g>
  ),
  "Wing Play": (
    <g {...TRACO}>
      <rect x="6" y="5" width="36" height="38" rx="3" strokeWidth="1.8" opacity="0.55" />
      <path d="M24 5v38" strokeWidth="1.8" opacity="0.55" />
      <path d="M13 38L13 12M15.6 16.9L13 12L10.4 16.9 M35 38L35 12M37.6 16.9L35 12L32.4 16.9" />
    </g>
  ),
  Standard: (
    <g>
      <rect x="9" y="5" width="30" height="38" rx="3" {...TRACO} strokeWidth="1.8" opacity="0.6" />
      <g fill="currentColor">
        <circle cx="24" cy="37" r="1.9" />
        <circle cx="14" cy="29" r="1.9" />
        <circle cx="21" cy="29" r="1.9" />
        <circle cx="27" cy="29" r="1.9" />
        <circle cx="34" cy="29" r="1.9" />
        <circle cx="14" cy="21" r="1.9" />
        <circle cx="21" cy="21" r="1.9" />
        <circle cx="27" cy="21" r="1.9" />
        <circle cx="34" cy="21" r="1.9" />
        <circle cx="20" cy="12" r="1.9" />
        <circle cx="28" cy="12" r="1.9" />
      </g>
    </g>
  ),
};

export const ESTILOS_INFO: Record<string, string> = {
  Gegenpressing: "Pressão alta logo após perder a bola: recuperar rápido e atacar em transição.",
  "Park the Bus": "Bloco baixo e compacto, poucos espaços e foco total em não sofrer gols.",
  "Counter Attack": "Defende organizado e ataca em velocidade nos espaços deixados pelo rival.",
  "Kick and Rush": "Jogo direto: bolas longas, segundas bolas e ímpeto ofensivo.",
  "Tiki-Taka": "Posse de bola, triangulações curtas e paciência para abrir o adversário.",
  Standard: "Equilíbrio entre defesa e ataque, sem uma identidade extrema.",
  "Wing Play": "Jogo pelas pontas: velocidade pelos lados e cruzamentos para a área.",
};

export const LISTA_ESTILOS = Object.keys(ICONES);

export function EstiloIcone({ estilo, className }: { estilo?: string | null; className?: string }) {
  const conteudo = (estilo && ICONES[estilo]) || ICONES["Standard"];
  return (
    <svg
      viewBox="0 0 48 48"
      role="img"
      aria-label={estilo ? `Estilo ${estilo}` : "Estilo de jogo"}
      className={cn("shrink-0", className)}
    >
      {conteudo}
    </svg>
  );
}
