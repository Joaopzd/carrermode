import { useNavigate } from "@tanstack/react-router";

/** Abre a página do jogador (/jogador/:id). */
export function useAbrirJogador() {
  const navigate = useNavigate();
  return (id: string, escopo: "temporada" | "carreira" = "temporada") =>
    void navigate({ to: "/jogador/$id", params: { id }, search: { escopo } } as never);
}
