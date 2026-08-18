export const COMPETICOES = [
  "Liga",
  "Copa Nacional",
  "Copa da Liga",
  "Champions League",
  "Europa League",
  "Conference League",
  "Amistoso",
] as const;

export type Competicao = (typeof COMPETICOES)[number];

export const ICONE_COMPETICAO: Record<string, string> = {
  Liga: "🏆",
  "Copa Nacional": "🥇",
  "Copa da Liga": "🎖️",
  "Champions League": "⭐",
  "Europa League": "🌍",
  "Conference League": "🛡️",
  Amistoso: "🤝",
};

/** Competições disputadas em formato de copa (têm fases). */
export const COMPETICOES_COPA = [
  "Copa Nacional",
  "Copa da Liga",
  "Champions League",
  "Europa League",
  "Conference League",
] as const;

export function ehCopa(competicao: string | null | undefined) {
  return COMPETICOES_COPA.includes((competicao ?? "") as (typeof COMPETICOES_COPA)[number]);
}

/** Fases de copa, da mais inicial à decisão. */
export const FASES_COPA = [
  "Fase preliminar",
  "Fase de grupos",
  "Playoff",
  "Primeira fase",
  "Segunda fase",
  "Terceira fase",
  "Quarta fase",
  "Quinta fase",
  "Oitavas de final",
  "Quartas de final",
  "Semifinal",
  "Final",
] as const;

export type FaseCopa = (typeof FASES_COPA)[number];

/** Índice da fase para saber qual é a mais avançada. */
export function ordemFase(fase: string | null | undefined) {
  const i = FASES_COPA.indexOf((fase ?? "") as FaseCopa);
  return i < 0 ? -1 : i;
}

export const MESES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

export const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

/** yyyy-mm-dd local (sem conversão UTC) */
export function chaveDia(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}
