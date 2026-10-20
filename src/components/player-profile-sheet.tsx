import { useEffect, type ReactNode } from "react";
import { useAbrirJogador } from "@/lib/abrir-jogador";

export type EscopoPerfil = "temporada" | "carreira";

/**
 * O perfil do jogador agora é uma página (/jogador/:id). Este componente mantém a assinatura
 * antiga para que Elenco, Estatísticas e Ex-jogadores continuem funcionando: ao receber um
 * jogador, ele abre a página e fecha o estado do painel.
 */
export function PlayerProfileSheet({
  playerId,
  escopoInicial = "temporada",
  onOpenChange,
}: {
  playerId: string | null;
  saveId?: string | null;
  stintId?: string | null;
  seasonId?: string | null;
  escopoInicial?: EscopoPerfil;
  extra?: ReactNode;
  onOpenChange: (aberto: boolean) => void;
}) {
  const abrir = useAbrirJogador();
  useEffect(() => {
    if (!playerId) return;
    abrir(playerId, escopoInicial);
    onOpenChange(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerId]);
  return null;
}
