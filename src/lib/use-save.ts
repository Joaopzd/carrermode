import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { garantirSeasonAtiva } from "@/lib/season";
import { garantirStintAtiva } from "@/lib/stint";

type ClubeAtual = { nome: string; escudo_url: string | null };
type LigaAtual = { id: string; nome: string; pais: string; nivel: number };

export type SaveAtual = {
  /** id da save (carreira) */
  id: string;
  /** id da passagem ativa pelo clube atual */
  stintId: string | null;
  temporada: string;
  clubId: string | null;
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
        .select("id, temporada, escudo_url")
        .eq("user_id", userId)
        .order("criado_em", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!ativo) return;
      if (data) {
        const stint = await garantirStintAtiva(data.id as string);
        if (!ativo) return;

        let clube: ClubeAtual | null = null;
        let liga: LigaAtual | null = null;
        if (stint?.club_id) {
          const { data: c } = await supabase
            .from("clubs")
            .select("nome, escudo_url")
            .eq("id", stint.club_id)
            .maybeSingle();
          clube = (c as ClubeAtual | null) ?? null;
        }
        if (stint?.league_id) {
          const { data: l } = await supabase
            .from("leagues")
            .select("id, nome, pais, nivel")
            .eq("id", stint.league_id)
            .maybeSingle();
          liga = (l as LigaAtual | null) ?? null;
        }

        const season = stint
          ? await garantirSeasonAtiva(
              data.id as string,
              (data.temporada as string) || "Temporada 1",
              stint.id,
            )
          : null;
        if (!ativo) return;
        setSave({
          id: data.id as string,
          stintId: stint?.id ?? null,
          temporada: data.temporada as string,
          clubId: stint?.club_id ?? null,
          clubeNome: clube?.nome ?? null,
          escudo: (stint?.escudo_url ?? clube?.escudo_url) ?? null,
          seasonId: season?.id ?? null,
          seasonNome: season?.nome ?? null,
          leagueId: liga?.id ?? stint?.league_id ?? null,
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
