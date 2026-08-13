import { supabase } from "@/integrations/supabase/client";

export type LeagueRules = {
  id: string;
  league_id: string;
  temporada_ref: string | null;
  vagas_champions: number;
  vagas_europa_league: number;
  vagas_conference_league: number;
  zona_rebaixamento_direto: number;
  zona_playoff_rebaixamento: number | null;
  vagas_acesso_direto: number | null;
  zona_playoff_acesso: number | null;
};

export type Zona = {
  chave: "champions" | "europa" | "conference" | "acesso" | "playoff" | "rebaixamento";
  rotulo: string;
  linha: string;
  badge: string;
};

const ZONAS: Record<Zona["chave"], Omit<Zona, "chave">> = {
  champions: {
    rotulo: "Champions League",
    linha: "bg-sky-500/10 border-l-2 border-l-sky-500",
    badge: "bg-sky-500/15 text-sky-500 border-sky-500/40",
  },
  europa: {
    rotulo: "Europa League",
    linha: "bg-emerald-500/10 border-l-2 border-l-emerald-500",
    badge: "bg-emerald-500/15 text-emerald-500 border-emerald-500/40",
  },
  conference: {
    rotulo: "Conference League",
    linha: "bg-purple-500/10 border-l-2 border-l-purple-500",
    badge: "bg-purple-500/15 text-purple-500 border-purple-500/40",
  },
  acesso: {
    rotulo: "Acesso direto",
    linha: "bg-emerald-500/10 border-l-2 border-l-emerald-500",
    badge: "bg-emerald-500/15 text-emerald-500 border-emerald-500/40",
  },
  playoff: {
    rotulo: "Playoff",
    linha: "bg-orange-500/10 border-l-2 border-l-orange-500",
    badge: "bg-orange-500/15 text-orange-500 border-orange-500/40",
  },
  rebaixamento: {
    rotulo: "Rebaixamento",
    linha: "bg-red-500/10 border-l-2 border-l-red-500",
    badge: "bg-red-500/15 text-red-500 border-red-500/40",
  },
};

function zona(chave: Zona["chave"], rotulo?: string): Zona {
  return { chave, ...ZONAS[chave], ...(rotulo ? { rotulo } : {}) };
}

/** Descobre a zona da posição na tabela conforme as regras da liga. */
export function zonaDaPosicao(
  posicao: number,
  total: number,
  regras: LeagueRules | null,
): Zona | null {
  if (!regras || posicao < 1) return null;

  const acesso = regras.vagas_acesso_direto ?? 0;
  const playoffAcesso = regras.zona_playoff_acesso ?? 0;
  const europeu =
    regras.vagas_champions + regras.vagas_europa_league + regras.vagas_conference_league;

  if (acesso > 0 && posicao <= acesso) return zona("acesso");
  if (acesso > 0 && playoffAcesso > 0 && posicao <= acesso + playoffAcesso)
    return zona("playoff", "Playoff de acesso");
  if (acesso === 0 && playoffAcesso > 0 && posicao <= playoffAcesso)
    return zona("playoff", "Playoff de acesso");

  if (europeu > 0) {
    if (posicao <= regras.vagas_champions) return zona("champions");
    if (posicao <= regras.vagas_champions + regras.vagas_europa_league) return zona("europa");
    if (posicao <= europeu) return zona("conference");
  }

  if (total > 0) {
    const rebaixados = regras.zona_rebaixamento_direto;
    const playoffRebaixa = regras.zona_playoff_rebaixamento ?? 0;
    if (rebaixados > 0 && posicao > total - rebaixados) return zona("rebaixamento");
    if (playoffRebaixa > 0 && posicao > total - rebaixados - playoffRebaixa)
      return zona("playoff", "Playoff de rebaixamento");
  }

  return null;
}

export async function carregarRegras(leagueId: string | null): Promise<LeagueRules | null> {
  if (!leagueId) return null;
  const { data } = await supabase
    .from("league_rules")
    .select("*")
    .eq("league_id", leagueId)
    .maybeSingle();
  return (data as LeagueRules | null) ?? null;
}
