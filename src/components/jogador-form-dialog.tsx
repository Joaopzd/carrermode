import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bandeira } from "@/components/bandeira";
import { PAISES, POSICOES, STATUS_JOGADOR } from "@/lib/onboarding-data";
import { cn } from "@/lib/utils";

export type JogadorForm = {
  nome: string;
  nacionalidade: string;
  posicao_principal: string;
  posicoes_secundarias: string[];
  overall: string;
  potencial: string;
  valor_mercado: string;
  salario: string;
  idade: string;
  altura: string;
  playstyle: string;
  status: string;
  favorito_torcida: boolean;
  capitao: boolean;
};

export const jogadorFormVazio: JogadorForm = {
  nome: "",
  nacionalidade: "",
  posicao_principal: "",
  posicoes_secundarias: [],
  overall: "",
  potencial: "",
  valor_mercado: "",
  salario: "",
  idade: "",
  altura: "",
  playstyle: "",
  status: "Liberado",
  favorito_torcida: false,
  capitao: false,
};

export function formParaPayload(f: JogadorForm) {
  const num = (v: string) => (v.trim() === "" ? null : Number(v));
  return {
    nome: f.nome.trim(),
    nacionalidade: f.nacionalidade || null,
    posicao_principal: f.posicao_principal || null,
    posicoes_secundarias: f.posicoes_secundarias,
    overall: num(f.overall),
    potencial: num(f.potencial),
    valor_mercado: num(f.valor_mercado),
    salario: num(f.salario),
    idade: num(f.idade),
    altura: num(f.altura),
    playstyle: f.playstyle.trim() || null,
    status: f.status || null,
    favorito_torcida: f.favorito_torcida,
    capitao: f.capitao,
  };
}

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  titulo: string;
  descricao?: string;
  mostrarPotencial?: boolean;
  valorInicial?: Partial<JogadorForm>;
  salvando?: boolean;
  textoConfirmar?: string;
  onConfirmar: (form: JogadorForm) => void | Promise<void>;
};

export function JogadorFormDialog({
  open,
  onOpenChange,
  titulo,
  descricao,
  mostrarPotencial = false,
  valorInicial,
  salvando = false,
  textoConfirmar = "Salvar jogador",
  onConfirmar,
}: Props) {
  const [form, setForm] = useState<JogadorForm>({ ...jogadorFormVazio, ...valorInicial });

  useEffect(() => {
    if (open) setForm({ ...jogadorFormVazio, ...valorInicial });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const set = (patch: Partial<JogadorForm>) => setForm((p) => ({ ...p, ...patch }));

  function alternarSecundaria(pos: string) {
    setForm((p) => {
      const tem = p.posicoes_secundarias.includes(pos);
      if (tem)
        return { ...p, posicoes_secundarias: p.posicoes_secundarias.filter((x) => x !== pos) };
      if (p.posicoes_secundarias.length >= 3) return p;
      return { ...p, posicoes_secundarias: [...p.posicoes_secundarias, pos] };
    });
  }

  const overallNum = Number(form.overall || 0);
  const potencialNum = Number(form.potencial || 0);
  const evolucao = Math.max(0, potencialNum - overallNum);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
          {descricao ? <DialogDescription>{descricao}</DialogDescription> : null}
        </DialogHeader>

        <Tabs defaultValue="dados">
          <TabsList className={cn("grid w-full", mostrarPotencial ? "grid-cols-2" : "grid-cols-1")}>
            <TabsTrigger value="dados">Dados do jogador</TabsTrigger>
            {mostrarPotencial ? <TabsTrigger value="potencial">Potencial</TabsTrigger> : null}
          </TabsList>

          <TabsContent value="dados" className="mt-4 grid gap-3">
            <div className="grid gap-1">
              <Label>Nome</Label>
              <Input
                value={form.nome}
                onChange={(e) => set({ nome: e.target.value })}
                placeholder="Nome do jogador"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1">
                <Label>Nacionalidade</Label>
                <Select
                  value={form.nacionalidade}
                  onValueChange={(v) => set({ nacionalidade: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="País" />
                  </SelectTrigger>
                  <SelectContent>
                    {PAISES.map((p) => (
                      <SelectItem key={p} value={p}>
                        <Bandeira pais={p} comNome />
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1">
                <Label>Posição principal</Label>
                <Select
                  value={form.posicao_principal}
                  onValueChange={(v) => set({ posicao_principal: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Posição" />
                  </SelectTrigger>
                  <SelectContent>
                    {POSICOES.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-1">
              <Label>Posições secundárias (até 3)</Label>
              <div className="flex flex-wrap gap-2">
                {POSICOES.map((p) => {
                  const ativo = form.posicoes_secundarias.includes(p);
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => alternarSecundaria(p)}
                      className={cn(
                        "rounded-md border px-2.5 py-1 text-xs transition-colors",
                        ativo
                          ? "border-primary bg-primary/15 text-primary"
                          : "border-border text-muted-foreground hover:border-primary/50",
                      )}
                    >
                      {p}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="grid gap-1">
                <Label>Overall</Label>
                <Input
                  type="number"
                  min={0}
                  max={99}
                  value={form.overall}
                  onChange={(e) => set({ overall: e.target.value })}
                />
              </div>
              <div className="grid gap-1">
                <Label>Idade</Label>
                <Input
                  type="number"
                  value={form.idade}
                  onChange={(e) => set({ idade: e.target.value })}
                />
              </div>
              <div className="grid gap-1">
                <Label>Altura (cm)</Label>
                <Input
                  type="number"
                  value={form.altura}
                  onChange={(e) => set({ altura: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1">
                <Label>Valor de mercado</Label>
                <Input
                  type="number"
                  value={form.valor_mercado}
                  onChange={(e) => set({ valor_mercado: e.target.value })}
                />
              </div>
              <div className="grid gap-1">
                <Label>Salário</Label>
                <Input
                  type="number"
                  value={form.salario}
                  onChange={(e) => set({ salario: e.target.value })}
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1">
                <Label>Playstyle</Label>
                <Input
                  value={form.playstyle}
                  onChange={(e) => set({ playstyle: e.target.value })}
                  placeholder="Ex: Finalizador, Maestro..."
                />
              </div>
              <div className="grid gap-1">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => set({ status: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_JOGADOR.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <p className="text-sm font-medium">Favorito da torcida</p>
                <p className="text-xs text-muted-foreground">
                  Ídolos geram repercussão quando saem do time.
                </p>
              </div>
              <Switch
                checked={form.favorito_torcida}
                onCheckedChange={(v) => set({ favorito_torcida: v })}
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <p className="text-sm font-medium">Capitão do elenco</p>
                <p className="text-xs text-muted-foreground">
                  O líder do time. Apenas um jogador pode ser capitão.
                </p>
              </div>
              <Switch checked={form.capitao} onCheckedChange={(v) => set({ capitao: v })} />
            </div>
          </TabsContent>

          {mostrarPotencial ? (
            <TabsContent value="potencial" className="mt-4 space-y-4">
              <div className="grid gap-1">
                <Label>Potencial (0-99)</Label>
                <Input
                  type="number"
                  min={0}
                  max={99}
                  value={form.potencial}
                  onChange={(e) => set({ potencial: e.target.value })}
                  placeholder="Overall máximo estimado"
                />
              </div>
              <div className="rounded-xl border border-border bg-card/60 p-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Overall atual</span>
                  <span className="font-display text-2xl text-primary">
                    {form.overall || "—"}
                  </span>
                </div>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-primary/40"
                    style={{ width: `${Math.min(100, potencialNum)}%` }}
                  >
                    <div
                      className="h-full bg-primary"
                      style={{
                        width: potencialNum
                          ? `${Math.min(100, (overallNum / potencialNum) * 100)}%`
                          : "0%",
                      }}
                    />
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Margem de evolução</span>
                  <Badge variant="secondary">
                    {potencialNum ? `+${evolucao} pontos` : "defina o potencial"}
                  </Badge>
                </div>
              </div>
            </TabsContent>
          ) : null}
        </Tabs>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            disabled={salvando || form.nome.trim() === ""}
            onClick={() => void onConfirmar(form)}
          >
            {salvando ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
            {textoConfirmar}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
