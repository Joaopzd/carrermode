import { useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { ClubBadge } from "@/components/club-badge";
import { useClubes } from "@/lib/clubes";
import { cn } from "@/lib/utils";

type Props = {
  value: string;
  onChange: (valor: string) => void;
  placeholder?: string;
  className?: string;
  id?: string;
  /** Prioriza clubes desta liga nas sugestões. */
  leagueId?: string | null;
};

function normalizar(v: string) {
  return v
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

/** Input de texto livre com sugestões de clubes cadastrados. */
export function ClubAutocomplete({
  value,
  onChange,
  placeholder = "Nome do clube",
  className,
  id,
  leagueId,
}: Props) {
  const clubes = useClubes();
  const [aberto, setAberto] = useState(false);
  const fechar = useRef<number | null>(null);

  const sugestoes = useMemo(() => {
    const termo = normalizar(value.trim());
    const lista = clubes.filter((c) => (termo ? normalizar(c.nome).includes(termo) : true));
    const ordenada = [...lista].sort((a, b) => {
      const pa = leagueId && a.league_id === leagueId ? 0 : 1;
      const pb = leagueId && b.league_id === leagueId ? 0 : 1;
      if (pa !== pb) return pa - pb;
      if (termo) {
        const sa = normalizar(a.nome).startsWith(termo) ? 0 : 1;
        const sb = normalizar(b.nome).startsWith(termo) ? 0 : 1;
        if (sa !== sb) return sa - sb;
      }
      return a.nome.localeCompare(b.nome);
    });
    return ordenada.slice(0, 8);
  }, [clubes, value, leagueId]);

  return (
    <div className={cn("relative", className)}>
      <Input
        id={id}
        value={value}
        placeholder={placeholder}
        autoComplete="off"
        onChange={(e) => {
          onChange(e.target.value);
          setAberto(true);
        }}
        onFocus={() => setAberto(true)}
        onBlur={() => {
          fechar.current = window.setTimeout(() => setAberto(false), 120);
        }}
      />
      {aberto && sugestoes.length > 0 && (
        <ul className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border bg-popover p-1 shadow-md">
          {sugestoes.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-accent"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  if (fechar.current) window.clearTimeout(fechar.current);
                  onChange(c.nome);
                  setAberto(false);
                }}
              >
                <ClubBadge nome={c.nome} escudoUrl={c.escudo_url} tamanho="md" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
