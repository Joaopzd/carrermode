import { useEffect, useState, useSyncExternalStore } from "react";

let ativos = 0;
const listeners = new Set<() => void>();

function emitir() {
  for (const l of listeners) l();
}

export function iniciarCarregamento() {
  ativos += 1;
  emitir();
}

export function finalizarCarregamento() {
  ativos = Math.max(0, ativos - 1);
  emitir();
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

/** Quantidade de carregamentos globais em andamento. */
export function useCarregamentosAtivos() {
  return useSyncExternalStore(
    subscribe,
    () => ativos,
    () => 0,
  );
}

/** Registra um carregamento global enquanto `ativo` for verdadeiro. */
export function useIndicadorCarregamento(ativo: boolean) {
  useEffect(() => {
    if (!ativo) return;
    iniciarCarregamento();
    return () => finalizarCarregamento();
  }, [ativo]);
}

/**
 * Retorna true apenas se `carregando` continuar ativo após `atraso` ms,
 * evitando flash de skeleton em carregamentos rápidos.
 */
export function useSkeletonDelay(carregando: boolean, atraso = 200) {
  const [mostrar, setMostrar] = useState(false);
  useEffect(() => {
    if (!carregando) {
      setMostrar(false);
      return;
    }
    const t = setTimeout(() => setMostrar(true), atraso);
    return () => clearTimeout(t);
  }, [carregando, atraso]);
  return mostrar;
}
