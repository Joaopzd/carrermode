import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Heart, Loader2, Pencil, Search, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
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
import { Skeleton } from "@/components/ui/skeleton";
import {
  JogadorFormDialog,
  formParaPayload,
  type JogadorForm,
} from "@/components/jogador-form-dialog";
import { Bandeira } from "@/components/bandeira";
import { supabase } from "@/integrations/supabase/client";
import { PAISES, POSICOES, STATUS_JOGADOR } from "@/lib/onboarding-data";
import { useSaveAtual } from "@/lib/use-save";

export const Route = createFileRoute("/_authenticated/elenco")({
  head: () => ({
    meta: [
      { title: "Elenco | Carreira FC Manager" },
      { name: "description", content: "Ficha completa e edição de todos os seus jogadores." },
      { property: "og:title", content: "Elenco | Carreira FC Manager" },
      {
        property: "og:description",
        content: "Ficha completa e edição de todos os seus jogadores.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ElencoPage,
});

type Jogador = {
  id: string;
  nome: string;
  nacionalidade: string | null;
  posicao_principal: string | null;
  posicoes_secundarias: unknown;
  overall: number | null;
  valor_mercado: number | null;
  salario: number | null;
  idade: number | null;
  altura: number | null;
  playstyle: string | null;
  status: string | null;
  favorito_torcida: boolean;
  capitao: boolean;
};

const CORES_STATUS: Record<string, string> = {
  Liberado: "bg-emerald-500/15 text-emerald-400",
  Lesionado: "bg-red-500/15 text-red-400",
  Suspenso: "bg-amber-500/15 text-amber-400",
  "Em transição": "bg-sky-500/15 text-sky-400",
  Convocado: "bg-violet-500/15 text-violet-400",
};

const moeda = (v: number | null) =>
  v === null ? "—" : `€ ${new Intl.NumberFormat("pt-BR").format(v)}`;

function ElencoPage() {
  const { save, carregando: carregandoSave } = useSaveAtual();
  const [jogadores, setJogadores] = useState<Jogador[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState("");
  const [posicao, setPosicao] = useState("todas");
  const [status, setStatus] = useState("todos");
  const [editando, setEditando] = useState<Jogador | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [adicionando, setAdicionando] = useState(false);
  const [criando, setCriando] = useState(false);

  async function definirCapitaoUnico(saveId: string, jogadorId: string) {
    await supabase
      .from("players")
      .update({ capitao: false })
      .eq("save_id", saveId)
      .neq("id", jogadorId);
  }

  async function criarJogador(form: JogadorForm) {
    if (!save) return;
    setCriando(true);
    const { data: novo, error } = await supabase
      .from("players")
      .insert({
        save_id: save.id,
        categoria: "principal",
        criado_via: "manual",
        ...formParaPayload(form),
      })
      .select("id")
      .single();
    if (!error && form.capitao && novo) await definirCapitaoUnico(save.id, novo.id);
    setCriando(false);
    if (error) {
      toast.error("Não foi possível adicionar o jogador.");
      return;
    }
    toast.success("Jogador adicionado ao elenco!");
    setAdicionando(false);
    void carregar(save.id);
  }

  async function carregar(saveId: string) {
    const { data } = await supabase
      .from("players")
      .select("*")
      .eq("save_id", saveId)
      .eq("ativo", true)
      .order("nome");
    setJogadores(
      ((data ?? []) as Jogador[]).filter(
        (j) => (j as unknown as { categoria: string | null }).categoria !== "base",
      ),
    );
    setCarregando(false);
  }

  useEffect(() => {
    if (!save) {
      if (!carregandoSave) setCarregando(false);
      return;
    }
    void carregar(save.id);
  }, [save, carregandoSave]);

  const filtrados = useMemo(
    () =>
      jogadores.filter(
        (j) =>
          j.nome.toLowerCase().includes(busca.trim().toLowerCase()) &&
          (posicao === "todas" || j.posicao_principal === posicao) &&
          (status === "todos" || j.status === status),
      ),
    [jogadores, busca, posicao, status],
  );

  async function salvar() {
    if (!editando) return;
    setSalvando(true);
    const { error } = await supabase
      .from("players")
      .update({
        nome: editando.nome,
        nacionalidade: editando.nacionalidade,
        posicao_principal: editando.posicao_principal,
        overall: editando.overall,
        valor_mercado: editando.valor_mercado,
        salario: editando.salario,
        idade: editando.idade,
        altura: editando.altura,
        playstyle: editando.playstyle,
        status: editando.status,
        favorito_torcida: editando.favorito_torcida,
        capitao: editando.capitao,
      })
      .eq("id", editando.id);
    if (!error && editando.capitao && save) await definirCapitaoUnico(save.id, editando.id);
    setSalvando(false);
    if (error) {
      toast.error("Não foi possível salvar o jogador.");
      return;
    }
    toast.success("Jogador atualizado!");
    setEditando(null);
    if (save) void carregar(save.id);
  }

  function campo(patch: Partial<Jogador>) {
    setEditando((prev) => (prev ? { ...prev, ...patch } : prev));
  }

  const numOrNull = (v: string) => (v.trim() === "" ? null : Number(v));

  return (
    <AppShell titulo="Elenco">
      <div className="pitch-lines min-h-full px-4 py-8 sm:px-8">
        <div className="mx-auto max-w-6xl space-y-6">
          <header className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-gradient-pitch text-4xl">Elenco</h1>
              <p className="text-sm text-muted-foreground">
                {filtrados.length} jogador(es) no elenco principal.
              </p>
            </div>
            <Button onClick={() => setAdicionando(true)} disabled={!save}>
              <UserPlus className="mr-1 h-4 w-4" /> Adicionar jogador
            </Button>
          </header>

          <div className="flex flex-wrap gap-3">
            <div className="relative min-w-56 flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar por nome"
                className="pl-9"
              />
            </div>
            <Select value={posicao} onValueChange={setPosicao}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Posição" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas as posições</SelectItem>
                {POSICOES.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os status</SelectItem>
                {STATUS_JOGADOR.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {carregando ? (
            <Skeleton className="h-72 w-full rounded-xl" />
          ) : filtrados.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-14 text-center">
                <UserPlus className="mx-auto h-8 w-8 text-muted-foreground" />
                <p className="mt-3 text-sm text-muted-foreground">
                  Nenhum jogador encontrado com esses filtros.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtrados.map((j) => (
                <Card key={j.id} className="hq-card">
                  <CardContent className="space-y-3 py-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-display text-xl leading-tight tracking-wide">
                          {j.nome}
                          {j.favorito_torcida && (
                            <Heart className="ml-1 inline h-4 w-4 fill-primary text-primary" />
                          )}
                          {j.capitao && (
                            <span className="ml-1.5 inline-flex items-center rounded bg-primary/15 px-1.5 py-0.5 align-middle text-[10px] font-semibold tracking-widest text-primary">
                              C
                            </span>
                          )}
                        </p>
                        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <span>{j.posicao_principal ?? "—"}</span>
                          <span>·</span>
                          <Bandeira pais={j.nacionalidade} />
                          <span>{j.nacionalidade ?? "—"}</span>
                          <span>· {j.idade ?? "—"} anos</span>
                        </p>
                      </div>
                      <span className="rounded-lg bg-primary/15 px-2 py-1 font-display text-lg text-primary">
                        {j.overall ?? "—"}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <Badge
                        variant="secondary"
                        className={CORES_STATUS[j.status ?? ""] ?? ""}
                      >
                        {j.status ?? "Sem status"}
                      </Badge>
                      {j.playstyle ? <Badge variant="outline">{j.playstyle}</Badge> : null}
                    </div>
                    <div className="grid grid-cols-2 gap-1 text-xs text-muted-foreground">
                      <span>Valor: {moeda(j.valor_mercado)}</span>
                      <span>Salário: {moeda(j.salario)}</span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => setEditando(j)}
                    >
                      <Pencil className="mr-1 h-4 w-4" /> Editar jogador
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      <Dialog open={editando !== null} onOpenChange={(v) => !v && setEditando(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar jogador</DialogTitle>
          </DialogHeader>
          {editando ? (
            <div className="grid gap-3">
              <div className="grid gap-1">
                <Label>Nome</Label>
                <Input value={editando.nome} onChange={(e) => campo({ nome: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1">
                  <Label>Nacionalidade</Label>
                  <Select
                    value={editando.nacionalidade ?? ""}
                    onValueChange={(v) => campo({ nacionalidade: v })}
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
                    value={editando.posicao_principal ?? ""}
                    onValueChange={(v) => campo({ posicao_principal: v })}
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
              <div className="grid grid-cols-3 gap-3">
                <div className="grid gap-1">
                  <Label>Overall</Label>
                  <Input
                    type="number"
                    min={0}
                    max={99}
                    value={editando.overall ?? ""}
                    onChange={(e) => campo({ overall: numOrNull(e.target.value) })}
                  />
                </div>
                <div className="grid gap-1">
                  <Label>Idade</Label>
                  <Input
                    type="number"
                    value={editando.idade ?? ""}
                    onChange={(e) => campo({ idade: numOrNull(e.target.value) })}
                  />
                </div>
                <div className="grid gap-1">
                  <Label>Altura (cm)</Label>
                  <Input
                    type="number"
                    value={editando.altura ?? ""}
                    onChange={(e) => campo({ altura: numOrNull(e.target.value) })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1">
                  <Label>Valor de mercado</Label>
                  <Input
                    type="number"
                    value={editando.valor_mercado ?? ""}
                    onChange={(e) => campo({ valor_mercado: numOrNull(e.target.value) })}
                  />
                </div>
                <div className="grid gap-1">
                  <Label>Salário</Label>
                  <Input
                    type="number"
                    value={editando.salario ?? ""}
                    onChange={(e) => campo({ salario: numOrNull(e.target.value) })}
                  />
                </div>
              </div>
              <div className="grid gap-1">
                <Label>Playstyle</Label>
                <Input
                  value={editando.playstyle ?? ""}
                  onChange={(e) => campo({ playstyle: e.target.value })}
                />
              </div>
              <div className="grid gap-1">
                <Label>Status</Label>
                <Select
                  value={editando.status ?? ""}
                  onValueChange={(v) => campo({ status: v })}
                >
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
              <div className="flex items-center justify-between rounded-lg border border-border p-3">
                <div>
                  <p className="text-sm font-medium">Favorito da torcida</p>
                  <p className="text-xs text-muted-foreground">
                    Ídolos geram repercussão quando ficam fora do time.
                  </p>
                </div>
                <Switch
                  checked={editando.favorito_torcida}
                  onCheckedChange={(v) => campo({ favorito_torcida: v })}
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border p-3">
                <div>
                  <p className="text-sm font-medium">Capitão do elenco</p>
                  <p className="text-xs text-muted-foreground">
                    Apenas um jogador pode usar a braçadeira.
                  </p>
                </div>
                <Switch
                  checked={editando.capitao}
                  onCheckedChange={(v) => campo({ capitao: v })}
                />
              </div>

            </div>
          ) : null}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditando(null)}>
              Cancelar
            </Button>
            <Button onClick={salvar} disabled={salvando}>
              {salvando ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <JogadorFormDialog
        open={adicionando}
        onOpenChange={setAdicionando}
        titulo="Adicionar jogador ao elenco"
        descricao="Cadastre um novo atleta no elenco principal."
        salvando={criando}
        textoConfirmar="Adicionar ao elenco"
        onConfirmar={criarJogador}
      />
    </AppShell>
  );
}
