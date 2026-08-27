import { useMemo, useRef, useState } from "react";
import { Loader2, PlusCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ClubBadge } from "@/components/club-badge";
import { carregarClubes, useClubes } from "@/lib/clubes";
import { cadastrarClubeCatalogo } from "@/lib/crests.functions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Props = {
  value: string;
  onChange: (valor: string) => void;
  placeholder?: string | undefined;
  className?: string | undefined;
  id?: string | undefined;
  /** Prioriza clubes desta liga nas sugestões. */
  leagueId?: string | null | undefined;
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
  const [dialogo, setDialogo] = useState(false);
  const [pais, setPais] = useState("");
  const [salvando, setSalvando] = useState(false);
  const fechar = useRef<number | null>(null);

  const termo = normalizar(value.trim());

  const sugestoes = useMemo(() => {
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
  }, [clubes, termo, leagueId]);

  const jaExiste = useMemo(
    () => clubes.some((c) => normalizar(c.nome) === termo),
    [clubes, termo],
  );
  const podeCadastrar = value.trim().length >= 2 && !jaExiste;

  async function cadastrar() {
    const nome = value.trim();
    setSalvando(true);
    try {
      const criado = await cadastrarClubeCatalogo({ data: { nome, pais: pais || null } });
      await carregarClubes(true);
      onChange(criado?.nome ?? nome);
      setDialogo(false);
      setPais("");
      toast.success(
        criado?.escudo_url ? "Clube cadastrado com escudo." : "Clube cadastrado (escudo não encontrado).",
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível cadastrar o clube.");
    } finally {
      setSalvando(false);
    }
  }

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
      {aberto && (sugestoes.length > 0 || podeCadastrar) && (
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
          {podeCadastrar && (
            <li>
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm text-primary hover:bg-accent"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  if (fechar.current) window.clearTimeout(fechar.current);
                  setAberto(false);
                  setDialogo(true);
                }}
              >
                <PlusCircle className="h-4 w-4 shrink-0" aria-hidden />
                <span className="truncate">Cadastrar “{value.trim()}” no catálogo</span>
              </button>
            </li>
          )}
        </ul>
      )}

      <Dialog open={dialogo} onOpenChange={(o) => !salvando && setDialogo(o)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cadastrar clube</DialogTitle>
            <DialogDescription>
              O clube será adicionado ao catálogo sem liga e o escudo será buscado automaticamente.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Nome</Label>
              <Input value={value} readOnly />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="clube-pais">País (opcional)</Label>
              <Input
                id="clube-pais"
                value={pais}
                onChange={(e) => setPais(e.target.value)}
                placeholder="Ex.: Brasil"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogo(false)} disabled={salvando}>
              Cancelar
            </Button>
            <Button onClick={() => void cadastrar()} disabled={salvando}>
              {salvando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Cadastrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
