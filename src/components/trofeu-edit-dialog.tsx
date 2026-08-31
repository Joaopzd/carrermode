import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ClubAutocomplete } from "@/components/club-autocomplete";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export type TrofeuEditavel = {
  id: string;
  competicao_nome: string;
  registra_vice: boolean;
  campeao_clube: string;
  vice_clube: string | null;
};

const norm = (v: string | null | undefined) =>
  (v ?? "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

type Props = {
  registro: TrofeuEditavel | null;
  clubeNome?: string | null;
  marcarEditadoAposArquivamento?: boolean;
  onOpenChange: (v: boolean) => void;
  onSalvo: () => void;
};

/** Mesmo formulário de campeão/vice usado na Galeria de Troféus. */
export function TrofeuEditDialog({
  registro,
  clubeNome,
  marcarEditadoAposArquivamento = false,
  onOpenChange,
  onSalvo,
}: Props) {
  const [campeao, setCampeao] = useState("");
  const [vice, setVice] = useState("");
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    setCampeao(registro?.campeao_clube ?? "");
    setVice(registro?.vice_clube ?? "");
  }, [registro]);

  async function salvar() {
    if (!registro) return;
    if (!campeao.trim()) {
      toast.error("Informe o campeão.");
      return;
    }
    setSalvando(true);
    const { error } = await supabase
      .from("trophy_gallery")
      .update({
        campeao_clube: campeao.trim(),
        vice_clube: registro.registra_vice ? vice.trim() || null : null,
        e_meu_clube_campeao: !!clubeNome && norm(campeao) === norm(clubeNome),
        e_meu_clube_vice: !!clubeNome && vice.trim() !== "" && norm(vice) === norm(clubeNome),
        ...(marcarEditadoAposArquivamento ? { editado_apos_arquivamento: true } : {}),
      })
      .eq("id", registro.id);
    setSalvando(false);
    if (error) {
      toast.error("Não foi possível salvar o resultado.");
      return;
    }
    toast.success("Resultado atualizado!");
    onOpenChange(false);
    onSalvo();
  }

  return (
    <Dialog open={registro !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{registro?.competicao_nome ?? "Troféu"}</DialogTitle>
          <DialogDescription>
            Corrija o campeão {registro?.registra_vice ? "e o vice " : ""}desta competição.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1">
            <Label>Campeão</Label>
            <ClubAutocomplete value={campeao} onChange={setCampeao} placeholder="Nome do clube" />
          </div>
          {registro?.registra_vice ? (
            <div className="grid gap-1">
              <Label>Vice-campeão</Label>
              <ClubAutocomplete value={vice} onChange={setVice} placeholder="Nome do clube" />
            </div>
          ) : null}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={() => void salvar()} disabled={salvando}>
            {salvando ? "Salvando…" : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
