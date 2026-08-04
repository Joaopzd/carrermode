import { PLAYSTYLES, MAX_PLAYSTYLES, parsePlaystyles, serializePlaystyles } from "@/lib/playstyles";
import { cn } from "@/lib/utils";

type Props = {
  value: string;
  onChange: (valor: string) => void;
};

export function PlaystyleSelect({ value, onChange }: Props) {
  const selecionados = parsePlaystyles(value);

  function alternar(p: string) {
    const tem = selecionados.includes(p);
    if (tem) {
      onChange(serializePlaystyles(selecionados.filter((x) => x !== p)));
      return;
    }
    if (selecionados.length >= MAX_PLAYSTYLES) return;
    onChange(serializePlaystyles([...selecionados, p]));
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        {selecionados.length}/{MAX_PLAYSTYLES} selecionados
      </p>
      <div className="flex max-h-44 flex-wrap gap-1.5 overflow-y-auto rounded-md border border-border p-2">
        {PLAYSTYLES.map((p) => {
          const ativo = selecionados.includes(p);
          const bloqueado = !ativo && selecionados.length >= MAX_PLAYSTYLES;
          return (
            <button
              key={p}
              type="button"
              disabled={bloqueado}
              onClick={() => alternar(p)}
              className={cn(
                "rounded-md border px-2 py-1 text-xs transition-colors",
                ativo
                  ? "border-primary bg-primary/15 text-primary"
                  : "border-border text-muted-foreground hover:border-primary/50",
                bloqueado && "opacity-40",
              )}
            >
              {p}
            </button>
          );
        })}
      </div>
    </div>
  );
}
