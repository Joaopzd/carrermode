import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { SetaVariacao } from "@/components/evolucao-jogador";
import { registrarAvaliacoes, type JogadorBase } from "@/lib/base-jogadores";
import { cn } from "@/lib/utils";

type Linha = JogadorBase & { posicao: string | null };

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  titulo: string;
  descricao: string;
  jogadores: Linha[];
  saveId: string;
  stintId: string | null;
  seasonId: string | null;
  onSalvo: () => void;
};

type Campos = { idade: string; overall: string; potencial: string };

const txt = (v: number | null) => (v == null ? "" : String(v));
const numero = (v: string) => (v.trim() === "" ? null : Number(v));

/** Revisão rápida: ajuste idade, overall e potencial; só quem mudou é salvo. */
export function RevisaoBaseDialog({
  open,
  onOpenChange,
  titulo,
  descricao,
  jogadores,
  saveId,
  stintId,
  seasonId,
  onSalvo,
}: Props) {
  const [valores, setValores] = useState<Record<string, Campos>>({});
  const [nota, setNota] = useState("");
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!open) return;
    setValores(
      Object.fromEntries(
        jogadores.map((j) => [
          j.id,
          { idade: txt(j.idade), overall: txt(j.overall), potencial: txt(j.potencial) },
        ]),
      ),
    );
    setNota("");
    // inicializa só quando o diálogo abre, para não apagar o que está sendo digitado
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const alterados = useMemo(
    () =>
      jogadores.filter((j) => {
        const v = valores[j.id];
        return (
          v &&
          (numero(v.idade) !== j.idade ||
            numero(v.overall) !== j.overall ||
            numero(v.potencial) !== j.potencial)
        );
      }),
    [jogadores, valores],
  );

  function mudar(id: string, campo: keyof Campos, valor: string) {
    setValores((p) => ({ ...p, [id]: { ...(p[id] ?? { idade: "", overall: "", potencial: "" }), [campo]: valor } }));
  }

  async function salvar() {
    for (const j of alterados) {
      const v = valores[j.id]!;
      const o = numero(v.overall);
      const p = numero(v.potencial);
      const i = numero(v.idade);
      if ((o != null && (o < 1 || o > 99)) || (p != null && (p < 1 || p > 99))) {
        toast.error(`Overall e potencial de ${j.nome} devem estar entre 1 e 99.`);
        return;
      }
      if (i != null && (i < 10 || i > 45)) {
        toast.error(`Confira a idade de ${j.nome}.`);
        return;
      }
    }
    setSalvando(true);
    try {
      await registrarAvaliacoes({
        saveId,
        stintId,
        seasonId,
        itens: alterados.map((j) => {
          const v = valores[j.id]!;
          return {
            jogador: j,
            novo: {
              idade: numero(v.idade),
              overall: numero(v.overall),
              potencial: numero(v.potencial),
              nota: jogadores.length === 1 ? nota : null,
            },
          };
        }),
      });
      toast.success(`${alterados.length} avaliação(ões) salva(s).`);
      onOpenChange(false);
      onSalvo();
    } catch {
      toast.error("Não foi possível salvar. O banco já recebeu o SQL da evolução?");
    }
    setSalvando(false);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !salvando && onOpenChange(v)}>
      <DialogContent className="max-h-[88vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
          <DialogDescription>{descricao}</DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <div className="grid grid-cols-[1fr_4.5rem_4.5rem_4.5rem] items-end gap-2 px-1 text-[11px] uppercase tracking-wider text-muted-foreground">
            <span>Jogador</span>
            <span>Idade</span>
            <span>OVR</span>
            <span>POT</span>
          </div>
          {jogadores.map((j) => {
            const v = valores[j.id];
            if (!v) return null;
            const mudou = alterados.some((a) => a.id === j.id);
            const novoOvr = numero(v.overall);
            const delta = novoOvr != null && j.overall != null ? novoOvr - j.overall : null;
            return (
              <div
                key={j.id}
                className={cn(
                  "grid grid-cols-[1fr_4.5rem_4.5rem_4.5rem] items-center gap-2 rounded-lg border p-2",
                  mudou ? "border-primary/50 bg-primary/5" : "border-border",
                )}
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{j.nome}</p>
                  <p className="flex items-center gap-1 text-xs text-muted-foreground">
                    {j.posicao ?? "—"}
                    {mudou ? <SetaVariacao delta={delta} /> : null}
                  </p>
                </div>
                {(["idade", "overall", "potencial"] as const).map((campo) => (
                  <Input
                    key={campo}
                    type="number"
                    inputMode="numeric"
                    value={v[campo]}
                    onChange={(e) => mudar(j.id, campo, e.target.value)}
                    className="h-9 px-2 text-center"
                  />
                ))}
              </div>
            );
          })}
          {jogadores.length === 1 ? (
            <Input
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              placeholder="Observação (opcional): ex.: evoluiu muito no treino"
            />
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={salvando}>
            Cancelar
          </Button>
          <Button onClick={() => void salvar()} disabled={salvando || alterados.length === 0}>
            {salvando ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
            {alterados.length > 0 ? `Salvar ${alterados.length} alteração(ões)` : "Nada alterado"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
