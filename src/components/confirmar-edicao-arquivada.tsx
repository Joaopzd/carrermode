import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type Props = {
  aberto: boolean;
  seasonNome: string;
  onOpenChange: (v: boolean) => void;
  onConfirmar: () => void;
};

/** Alerta exibido antes de editar qualquer registro de uma temporada encerrada. */
export function ConfirmarEdicaoArquivada({ aberto, seasonNome, onOpenChange, onConfirmar }: Props) {
  return (
    <Dialog open={aberto} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar registro arquivado</DialogTitle>
          <DialogDescription>
            Você está prestes a editar um registro da temporada {seasonNome}, já encerrada. Use isso
            apenas para corrigir erros de digitação — não para alterar resultados ou estatísticas
            retroativamente. Deseja continuar?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={onConfirmar}>Continuar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
