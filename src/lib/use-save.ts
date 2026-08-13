import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { garantirSeasonAtiva } from "@/lib/season";

export type SaveAtual = {
  id: string;
  temporada: string;
  clubeNome: string | null;
  escudo: string | null;
  seasonId: string | null;
  seasonNome: string | null;
  leagueId: string | null;
  ligaNome: string | null;
  ligaPais: string | null;
  ligaNivel: number | null;
};

export function useSaveAtual() {
  const [save, setSave] = useState<SaveAtual | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let ativo = true;
    void (async () => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) {
        if (ativo) setCarregando(false);
        return;
      }
      const { data } = await supabase
        .from("saves")
        .select(
          "id, temporada, escudo_url, league_id, clubs(nome, escudo_url), leagues(id, nome, pais, nivel)",
        )
        .eq("user_id", userId)
        .order("criado_em", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!ativo) return;
      if (data) {
        const clube = (data as { clubs: { nome: string; escudo_url: string | null } | null }).clubs;
        const liga = (
          data as {
            leagues: { id: string; nome: string; pais: string; nivel: number } | null;
          }
        ).leagues;
        const season = await garantirSeasonAtiva(
          data.id as string,
          (data.temporada as string) || "Temporada 1",
        );
        if (!ativo) return;
        setSave({
          id: data.id as string,
          temporada: data.temporada as string,
          clubeNome: clube?.nome ?? null,
          escudo:
            ((data as { escudo_url: string | null }).escudo_url ?? clube?.escudo_url) ?? null,
          seasonId: season?.id ?? null,
          seasonNome: season?.nome ?? null,
          leagueId: liga?.id ?? ((data as { league_id: string | null }).league_id ?? null),
          ligaNome: liga?.nome ?? null,
          ligaPais: liga?.pais ?? null,
          ligaNivel: liga?.nivel ?? null,
        });
      }
      setCarregando(false);
    })();
    return () => {
      ativo = false;
    };
  }, []);

  return { save, carregando };
}
