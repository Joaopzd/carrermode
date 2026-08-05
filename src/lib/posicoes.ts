/** Posições em inglês (padrão do jogo). */
export const POSICOES = [
  "GK",
  "CB",
  "RB",
  "LB",
  "CDM",
  "CM",
  "LM",
  "RM",
  "CAM",
  "RW",
  "LW",
  "CF",
  "ST",
] as const;

export type Posicao = (typeof POSICOES)[number];

/** Mapeamento dos rótulos antigos (pt-BR) para os novos em inglês. */
export const POSICAO_LEGADO: Record<string, string> = {
  GOL: "GK",
  ZAG: "CB",
  LD: "RB",
  LE: "LB",
  VOL: "CDM",
  MC: "CM",
  ME: "LM",
  MD: "RM",
  MEI: "CAM",
  PD: "RW",
  PE: "LW",
  SA: "CF",
  CA: "ST",
};

/** Normaliza qualquer valor salvo para o rótulo em inglês. */
export function posEn(valor: string | null | undefined): string | null {
  if (!valor) return null;
  return POSICAO_LEGADO[valor] ?? valor;
}

export function ehGoleiro(valor: string | null | undefined): boolean {
  return posEn(valor) === "GK";
}
