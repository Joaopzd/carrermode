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
