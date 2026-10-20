import { chaveClube, nomesDoClube, normalizarNomeClube } from "./club-identidade";

type TimeExterno = {
  strTeam?: string | null;
  strAlternate?: string | null;
  strSport?: string | null;
  strCountry?: string | null;
  strTeamBadge?: string | null;
  strBadge?: string | null;
};

const PAISES: Record<string, string> = {
  inglaterra: "England", franca: "France", alemanha: "Germany",
  italia: "Italy", espanha: "Spain", portugal: "Portugal",
  brasil: "Brazil", belgica: "Belgium", noruega: "Norway",
};

export function selecionarEscudo(times: TimeExterno[], nome: string, pais?: string | null): string | null {
  const alvo = chaveClube(nome);
  const paisEsperado = pais ? PAISES[normalizarNomeClube(pais)] ?? pais : null;
  for (const time of times) {
    if (time.strSport !== "Soccer") continue;
    if (paisEsperado && time.strCountry && normalizarNomeClube(time.strCountry) !== normalizarNomeClube(paisEsperado)) continue;
    const nomes = [time.strTeam ?? "", ...(time.strAlternate?.split(/[,;]/) ?? [])];
    if (!nomes.some((n) => chaveClube(n) === alvo)) continue;
    const escudo = time.strTeamBadge ?? time.strBadge;
    if (escudo && /^https:\/\//i.test(escudo)) return escudo;
  }
  return null;
}

export async function buscarEscudoClube(nome: string, pais?: string | null): Promise<string | null> {
  const termos = [...new Set(nomesDoClube(nome).map((n) => n.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[-/]/g, " ")))];
  for (const termo of termos.slice(0, 3)) {
    const res = await fetch(`https://www.thesportsdb.com/api/v1/json/123/searchteams.php?t=${encodeURIComponent(termo)}`, {
      headers: { accept: "application/json" }, signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) throw new Error("Não foi possível consultar os escudos agora.");
    const json = await res.json() as { teams?: TimeExterno[] | null };
    const escudo = selecionarEscudo(json.teams ?? [], nome, pais);
    if (escudo) return escudo;
  }
  return null;
}