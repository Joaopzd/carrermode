import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type SaveAtual = {
  id: string;
  temporada: string;
  clubeNome: string | null;
  escudo: string | null;
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
        .select("id, temporada, clubs(nome, escudo_url)")
        .eq("user_id", userId)
        .order("criado_em", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!ativo) return;
      if (data) {
        const clube = (data as { clubs: { nome: string; escudo_url: string | null } | null }).clubs;
        setSave({
          id: data.id as string,
          temporada: data.temporada as string,
          clubeNome: clube?.nome ?? null,
          escudo: clube?.escudo_url ?? null,
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
