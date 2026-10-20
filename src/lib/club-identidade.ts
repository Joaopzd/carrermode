/** Explicit identities: aliases never merge clubs through approximate matching. */
const IDENTIDADES = [
  ["Paris Saint Germain", "Paris Saint-Germain", "PSG"],
  ["Bayern Munich", "Bayern de Munique", "Bayer de Munique", "Bayern München", "FC Bayern München"],
  ["Inter Milan", "Inter de Milão", "Internazionale", "FC Internazionale Milano"],
  ["Rochdale", "Rochdale AFC"],
  ["Boulogne", "Boulogne-sur-Mer", "US Boulogne Côte-d'Opale"],
  ["Saint Etienne", "Saint-Étienne", "AS Saint-Étienne"],
  ["Saarbrucken", "Saarbrücken", "1. FC Saarbrücken"],
  ["Brighton & Hove Albion", "Brighton", "Brighton and Hove Albion"],
  ["Atlético Madrid", "Atlético de Madrid", "Atletico Madrid"],
  ["Athletic Bilbao", "Athletic Club"],
  ["Celta Vigo", "RC Celta", "RC Celta de Vigo"],
  ["Deportivo La Coruña", "Deportivo La Coruna", "RC Deportivo"],
  ["Sporting CP", "Sporting Lisbon"],
  ["Porto", "FC Porto"],
  ["Benfica", "SL Benfica"],
  ["Braga", "SC Braga"],
  ["Vitória de Guimarães", "Vitoria Guimaraes"],
  ["Milan", "AC Milan"],
  ["Roma", "AS Roma"],
  ["Napoli", "SSC Napoli"],
  ["Bodø/Glimt", "Bodo Glimt", "Bodo/Glimt"],
  ["Royale Union Saint-Gilloise", "Union Saint-Gilloise", "USG"],
  ["Al Ahli Saudi", "Al-Ahli Saudi", "Al-Ahli", "Al Ahli"],
] as const;

export function normalizarNomeClube(nome: string): string {
  return nome.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function identidade(nome: string) {
  const alvo = normalizarNomeClube(nome);
  return IDENTIDADES.find((grupo) => grupo.some((alias) => normalizarNomeClube(alias) === alvo));
}

export function chaveClube(nome: string): string {
  return normalizarNomeClube(identidade(nome)?.[0] ?? nome);
}

export function nomesDoClube(nome: string): string[] {
  return [...new Set([...(identidade(nome) ?? []), nome])];
}

export function correspondeBuscaClube(nome: string, termo: string): boolean {
  const busca = normalizarNomeClube(termo);
  return nomesDoClube(nome).some((alias) => normalizarNomeClube(alias).includes(busca));
}

export function nomeCatalogoClube(nome: string): string {
  const chave = chaveClube(nome);
  const corrigidos = ["Paris Saint Germain", "Bayern Munich", "Inter Milan"];
  return corrigidos.find((corrigido) => chaveClube(corrigido) === chave) ?? nome.trim();
}