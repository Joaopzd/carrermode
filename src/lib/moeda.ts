export type CodigoMoeda = "GBP" | "EUR";

// Extend this registry when leagues from countries with other currencies are added.
const MOEDA_POR_PAIS: Record<string, CodigoMoeda> = {
  Inglaterra: "GBP",
  Escócia: "GBP",
  "País de Gales": "GBP",
  "Irlanda do Norte": "GBP",
  França: "EUR",
  Espanha: "EUR",
  Alemanha: "EUR",
  Itália: "EUR",
  Portugal: "EUR",
};

export function moedaDoPais(pais?: string | null): CodigoMoeda {
  return pais ? MOEDA_POR_PAIS[pais] ?? "EUR" : "EUR";
}

export function formatarMoeda(valor: number | null | undefined, moeda: CodigoMoeda): string {
  if (valor == null) return "—";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: moeda,
    currencyDisplay: "narrowSymbol",
    maximumFractionDigits: 0,
  }).format(valor);
}

export function formatarMoedaCompacta(valor: number, moeda: CodigoMoeda): string {
  const simbolo = moeda === "GBP" ? "£" : "€";
  const abs = Math.abs(valor);
  const divisor = abs >= 1_000_000 ? 1_000_000 : abs >= 1_000 ? 1_000 : 1;
  const numero = valor / divisor;
  return `${simbolo}${numero.toFixed(numero % 1 === 0 ? 0 : 1)}${divisor === 1_000_000 ? "M" : divisor === 1_000 ? "k" : ""}`;
}