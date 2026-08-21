import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type HistoryPoint = {
  id: string;
  overall: number;
  registrado_em: string;
  season_id: string;
  motivo: string;
};

/** Busca o histórico de overall de um jogador (compartilhado entre sparkline e gráfico completo). */
export function usePlayerOverallHistory(playerId: string) {
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [seasonNames, setSeasonNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    void (async () => {
      const { data } = await supabase
        .from("player_overall_history")
        .select("id, overall, registrado_em, season_id, motivo, seasons(nome)")
        .eq("player_id", playerId)
        .order("registrado_em", { ascending: true });
      if (!active) return;
      const rows = (data ?? []) as unknown as (HistoryPoint & {
        seasons: { nome: string } | null;
      })[];
      setHistory(rows);
      setSeasonNames(
        Object.fromEntries(rows.map((row) => [row.season_id, row.seasons?.nome ?? "Temporada"])),
      );
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [playerId]);

  return { history, seasonNames, loading };
}

/** Overall inicial x atual e a variação total. */
export function calcularVariacao(history: HistoryPoint[], currentOverall: number | null) {
  const initial = history[0]?.overall ?? currentOverall;
  const current = currentOverall ?? history[history.length - 1]?.overall ?? null;
  const variation = initial != null && current != null ? current - initial : null;
  return { initial, current, variation };
}
