import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { contarEscudosPendentes, sincronizarEscudos } from "@/lib/crests.functions";

export type ClubeRef = { id: string; nome: string; escudo_url: string | null; league_id: string | null };

let cache: ClubeRef[] | null = null;
let promessa: Promise<ClubeRef[]> | null = null;
const ouvintes = new Set<(c: ClubeRef[]) => void>();

export async function carregarClubes(forcar = false): Promise<ClubeRef[]> {
  if (cache && !forcar) return cache;
  if (promessa && !forcar) return promessa;
  promessa = (async () => {
    const { data } = await supabase
      .from("clubs")
      .select("id, nome, escudo_url, league_id")
      .order("nome");
    cache = (data as ClubeRef[]) ?? [];
    ouvintes.forEach((fn) => fn(cache!));
    return cache;
  })();
  return promessa;
}

/** Lista global de clubes (cacheada) para autocomplete e escudos. */
export function useClubes() {
  const [clubes, setClubes] = useState<ClubeRef[]>(cache ?? []);
  useEffect(() => {
    let ativo = true;
    ouvintes.add(setClubes);
    void carregarClubes().then((c) => {
      if (ativo) setClubes(c);
    });
    return () => {
      ativo = false;
      ouvintes.delete(setClubes);
    };
  }, []);
  return clubes;
}

function normalizar(nome: string) {
  return nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

export function acharClube(clubes: ClubeRef[], nome?: string | null): ClubeRef | null {
  if (!nome) return null;
  const alvo = normalizar(nome);
  return clubes.find((c) => normalizar(c.nome) === alvo) ?? null;
}

export function escudoPorNome(clubes: ClubeRef[], nome?: string | null): string | null {
  return acharClube(clubes, nome)?.escudo_url ?? null;
}

let sincronizacaoIniciada = false;

/**
 * Garante que os escudos dos clubes semeados estejam preenchidos.
 * Roda em segundo plano, em lotes, logo após a configuração inicial —
 * sem depender de clique manual.
 */
export async function garantirEscudosSincronizados() {
  if (sincronizacaoIniciada) return;
  sincronizacaoIniciada = true;
  try {
    const { pendentes } = await contarEscudosPendentes({ data: undefined });
    if (!pendentes) return;
    let restantes = pendentes;
    let voltas = 0;
    while (restantes > 0 && voltas < 40) {
      const r = await sincronizarEscudos({ data: { limite: 10, delayMs: 2000 } });
      voltas++;
      if (r.processados === 0) break;
      restantes = r.pendentes;
      if (r.atualizados === 0 && r.naoEncontrados === r.processados) break;
    }
    await carregarClubes(true);
  } catch {
    // silencioso: sincronização é best-effort
  }
}
