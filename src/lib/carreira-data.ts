const PREFIXO = "carreira:data-atual:";

/** Data atual da carreira (yyyy-mm-dd), guardada por save no navegador. */
export function lerDataCarreira(saveId: string | null | undefined): string | null {
  if (!saveId || typeof window === "undefined") return null;
  return window.localStorage.getItem(PREFIXO + saveId);
}

export function salvarDataCarreira(saveId: string, dia: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PREFIXO + saveId, dia);
}

export function somarDias(dia: string, dias: number): string {
  const d = new Date(`${dia}T12:00:00`);
  d.setDate(d.getDate() + dias);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

export function formatarDia(dia: string) {
  return new Date(`${dia}T12:00:00`).toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

/** Partidas agendadas cuja data já passou da data atual da carreira. */
export function partidasAtrasadas<T extends { data_hora: string | null; status: string }>(
  partidas: T[],
  dataAtual: string | null,
): T[] {
  if (!dataAtual) return [];
  const limite = new Date(`${dataAtual}T23:59:59`).getTime();
  return partidas.filter(
    (p) => p.status !== "finalizada" && p.data_hora && new Date(p.data_hora).getTime() < limite,
  );
}
