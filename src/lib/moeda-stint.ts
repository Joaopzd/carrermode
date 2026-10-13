import { supabase } from "@/integrations/supabase/client";
import { moedaDoPais, type CodigoMoeda } from "@/lib/moeda";

/** Resolve from the requested stint, not the active career or counterpart club. */
export async function moedaDaPassagem(stintId: string): Promise<CodigoMoeda> {
  const { data, error } = await supabase
    .from("stints")
    .select("clubs(pais), leagues(pais)")
    .eq("id", stintId)
    .single();
  if (error) throw error;
  return moedaDoPais(data.clubs?.pais ?? data.leagues?.pais);
}