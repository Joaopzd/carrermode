import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { carregarAvaliacoes } from "@/lib/base-jogadores";

export type PontoEvolucao = {
  id: string;
  quando: string;
  overall: number | null;
  potencial: number | null;
  idade: number | null;
  tipo: string;
  nota: string | null;
};

const ROTULO_TIPO: Record<string, string> = {
  cadastro: "Cadastro",
  avaliacao: "Avaliação",
  fim_temporada: "Nova temporada",
  promocao: "Promoção ao elenco",
  atualizacao_manual: "Atualização",
};
export const rotuloTipo = (t: string) => ROTULO_TIPO[t] ?? t;

/**
 * Linha do tempo do jogador: junta o histórico de overall que o app já tinha com as avaliações
 * (idade, overall e potencial). Quando os dois registram o mesmo momento, vale a avaliação.
 */
export function useEvolucaoJogador(playerId: string) {
  const [pontos, setPontos] = useState<PontoEvolucao[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let ativo = true;
    setCarregando(true);
    void (async () => {
      const [{ data: historico }, avaliacoes] = await Promise.all([
        supabase
          .from("player_overall_history")
          .select("id, overall, registrado_em, motivo")
          .eq("player_id", playerId)
          .order("registrado_em", { ascending: true }),
        carregarAvaliacoes([playerId]),
      ]);
      if (!ativo) return;

      const deAvaliacoes: PontoEvolucao[] = avaliacoes.map((a) => ({
        id: `a-${a.id}`,
        quando: a.registrado_em,
        overall: a.overall,
        potencial: a.potencial,
        idade: a.idade,
        tipo: a.tipo,
        nota: a.nota,
      }));
      const tempos = deAvaliacoes.map((a) => new Date(a.quando).getTime());
      const deHistorico: PontoEvolucao[] = ((historico ?? []) as {
        id: string;
        overall: number;
        registrado_em: string;
        motivo: string;
      }[])
        .filter((h) => {
          const t = new Date(h.registrado_em).getTime();
          // descarta o registro automático do mesmo instante de uma avaliação
          return !tempos.some((x) => Math.abs(x - t) < 5 * 60 * 1000);
        })
        .map((h) => ({
          id: `h-${h.id}`,
          quando: h.registrado_em,
          overall: h.overall,
          potencial: null,
          idade: null,
          tipo: h.motivo,
          nota: null,
        }));

      setPontos(
        [...deHistorico, ...deAvaliacoes].sort((x, y) => x.quando.localeCompare(y.quando)),
      );
      setCarregando(false);
    })();
    return () => {
      ativo = false;
    };
  }, [playerId]);

  return { pontos, carregando };
}
