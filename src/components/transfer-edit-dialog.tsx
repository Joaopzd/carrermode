import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ClubAutocomplete } from "@/components/club-autocomplete";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export type TransferEditavel = {
  id: string;
  tipo: string;
  modalidade: string | null;
  clube_contraparte: string | null;
  valor: number | null;
  duracao_emprestimo?: string | null;
  janela?: string | null;
  data: string;
};

const MODALIDADES = ["definitiva", "emprestimo", "troca"] as const;
const ROTULO_MODALIDADE: Record<string, string> = {
  definitiva: "Definitiva",
  emprestimo: "Empréstimo",
  troca: "Troca",
};
const ICONE_JANELA: Record<string, string> = { verao: "☀️", inverno: "❄️" };
const ROTULO_JANELA: Record<string, string> = { verao: "Verão", inverno: "Inverno" };

function janelaDoDia(dia: string): "verao" | "inverno" {
  const mes = Number(dia.slice(5, 7));
  return mes >= 6 && mes <= 8 ? "verao" : "inverno";
}

type Props = {
  transferencia: TransferEditavel | null;
  descricao?: string;
  /** Marca o registro como corrigido depois do arquivamento da temporada. */
  marcarEditadoAposArquivamento?: boolean;
  onOpenChange: (v: boolean) => void;
  onSalvo: () => void;
};

/** Mesmo formulário de edição de transferência usado na tela ativa. */
export function TransferEditDialog({
  transferencia,
  descricao,
  marcarEditadoAposArquivamento = false,
  onOpenChange,
  onSalvo,
}: Props) {
  const [form, setForm] = useState<TransferEditavel | null>(transferencia);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    setForm(transferencia);
  }, [transferencia]);

  async function salvar() {
    if (!form) return;
    setSalvando(true);
    const { error } = await supabase
      .from("transfers")
      .update({
        clube_contraparte: form.clube_contraparte,
        valor: form.valor,
        duracao_emprestimo: form.duracao_emprestimo ?? null,
        modalidade: form.modalidade,
        data: form.data,
        janela: (form.janela as "verao" | "inverno" | null) ?? janelaDoDia(form.data.slice(0, 10)),
        ...(marcarEditadoAposArquivamento ? { editado_apos_arquivamento: true } : {}),
      })
      .eq("id", form.id);
    if (!error) {
      await supabase
        .from("players")
        .update({ clube_destino: form.clube_contraparte })
        .eq("transfer_saida_id", form.id);
    }
    setSalvando(false);
    if (error) {
      toast.error("Não foi possível salvar a transferência.");
      return;
    }
    toast.success("Transferência atualizada!");
    onOpenChange(false);
    onSalvo();
  }

  return (
    <Dialog open={transferencia !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar transferência</DialogTitle>
          <DialogDescription>{descricao ?? "Corrija os dados da negociação."}</DialogDescription>
        </DialogHeader>
        {form ? (
          <div className="grid gap-3">
            <div className="grid gap-1">
              <Label>Modalidade</Label>
              <Select
                value={form.modalidade ?? "definitiva"}
                onValueChange={(v) => setForm((p) => (p ? { ...p, modalidade: v } : p))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MODALIDADES.map((m) => (
                    <SelectItem key={m} value={m}>
                      {ROTULO_MODALIDADE[m]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1">
              <Label>Clube contraparte</Label>
              <ClubAutocomplete
                value={form.clube_contraparte ?? ""}
                onChange={(v) => setForm((p) => (p ? { ...p, clube_contraparte: v } : p))}
              />
            </div>
            <div className="grid gap-1">
              <Label>Valor</Label>
              <Input
                type="number"
                value={form.valor ?? ""}
                onChange={(e) =>
                  setForm((p) =>
                    p ? { ...p, valor: e.target.value === "" ? null : Number(e.target.value) } : p,
                  )
                }
              />
            </div>
            {form.modalidade === "emprestimo" ? (
              <div className="grid gap-1">
                <Label>Duração (data de término)</Label>
                <Input
                  type="date"
                  value={form.duracao_emprestimo ?? ""}
                  onChange={(e) =>
                    setForm((p) => (p ? { ...p, duracao_emprestimo: e.target.value } : p))
                  }
                />
              </div>
            ) : null}
            <div className="grid gap-1">
              <Label>Data da negociação</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="date"
                  value={form.data.slice(0, 10)}
                  onChange={(e) =>
                    setForm((p) =>
                      p
                        ? {
                            ...p,
                            data: new Date(`${e.target.value}T12:00:00`).toISOString(),
                            janela: janelaDoDia(e.target.value),
                          }
                        : p,
                    )
                  }
                />
                {(["verao", "inverno"] as const).map((j) => (
                  <button
                    key={j}
                    type="button"
                    aria-label={`Janela de ${ROTULO_JANELA[j]}`}
                    title={`Janela de ${ROTULO_JANELA[j]}`}
                    onClick={() => setForm((p) => (p ? { ...p, janela: j } : p))}
                    className={cn(
                      "rounded-lg border px-3 py-2 text-lg transition-colors",
                      (form.janela ?? janelaDoDia(form.data.slice(0, 10))) === j
                        ? "border-primary bg-primary/10"
                        : "border-border opacity-60 hover:opacity-100",
                    )}
                  >
                    {ICONE_JANELA[j]}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : null}
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={() => void salvar()} disabled={salvando}>
            {salvando ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
