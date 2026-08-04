export const PLAYSTYLES = [
  "Acrobatic",
  "Chip Shot",
  "Dead Ball",
  "Finesse Shot",
  "Game Changer",
  "Low Driven Shot",
  "Power Shot",
  "Precision Header",
  "Incisive Pass",
  "Inventive",
  "Long Ball Pass",
  "Pinged Pass",
  "Tiki Taka",
  "Whipped Pass",
  "First Touch",
  "Press Proven",
  "Rapid",
  "Technical",
  "Trickster",
  "Aerial Fortress",
  "Anticipate",
  "Block",
  "Intercept",
  "Jockey",
  "Slide Tackle",
  "Bruiser",
  "Enforcer",
  "Long Throw",
  "Quick Step",
  "Relentless",
  "Cross Claimer",
  "Deflector",
  "Far Reach",
  "Far Throw",
  "Foot Work",
  "Rush Out",
] as const;

export const MAX_PLAYSTYLES = 7;

export function parsePlaystyles(valor: string | null | undefined): string[] {
  if (!valor) return [];
  return valor
    .split(",")
    .map((v) => v.trim())
    .filter((v) => v.length > 0);
}

export function serializePlaystyles(lista: string[]): string {
  return lista.slice(0, MAX_PLAYSTYLES).join(", ");
}
