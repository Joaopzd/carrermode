import { posEn } from "@/lib/posicoes";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Heart,
  LayoutGrid,
  List,
  Loader2,
  Pencil,
  Search,
  Trash2,
  UserMinus,
  UserPlus,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { StatusJogador } from "@/components/status-jogador";
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
import { PlaystyleSelect } from "@/components/playstyle-select";
import { parsePlaystyles } from "@/lib/playstyles";
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


const moeda = (v: number | null) =>
  v === null ? "—" : `£ ${new Intl.NumberFormat("pt-BR").format(v)}`;

/** Vermelho ≤64 · amarelo 65-74 · verde 75-84 · azul ≥85. */
function corOverall(overall: number | null) {
  if (overall === null) return "bg-muted text-muted-foreground";
  if (overall <= 64) return "bg-red-500/15 text-red-400";
  if (overall <= 74) return "bg-amber-500/15 text-amber-400";
  if (overall <= 84) return "bg-emerald-500/15 text-emerald-400";
  return "bg-sky-500/15 text-sky-400";
}

const ORDENACOES = [
  { valor: "overall", rotulo: "Overall" },
  { valor: "idade", rotulo: "Idade" },
  { valor: "valor_mercado", rotulo: "Valor de mercado" },
  { valor: "salario", rotulo: "Salário" },
  { valor: "nome", rotulo: "Nome" },
] as const;
type CampoOrdem = (typeof ORDENACOES)[number]["valor"];

function ElencoPage() {
  const { save, carregando: carregandoSave } = useSaveAtual();
  const [jogadores, setJogadores] = useState<Jogador[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState("");
  const [posicao, setPosicao] = useState("todas");
  const [status, setStatus] = useState("todos");
  const [ordem, setOrdem] = useState<CampoOrdem>("overall");
  const [asc, setAsc] = useState(false);
  const [visao, setVisao] = useState<"cards" | "lista">("cards");
  const [editando, setEditando] = useState<Jogador | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [adicionando, setAdicionando] = useState(false);
  const [criando, setCriando] = useState(false);
  const [excluindo, setExcluindo] = useState<Jogador | null>(null);
  const [removendo, setRemovendo] = useState(false);
  const [encerrando, setEncerrando] = useState<{
    jogador: Jogador;
    motivo: "aposentadoria" | "rescisao_contrato";
  } | null>(null);

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

  const filtrados = useMemo(() => {
    const base = jogadores.filter(
      (j) =>
        j.nome.toLowerCase().includes(busca.trim().toLowerCase()) &&
        (posicao === "todas" || posEn(j.posicao_principal) === posicao) &&
        (status === "todos" || j.status === status),
    );
    const dir = asc ? 1 : -1;
    return [...base].sort((a, b) => {
      if (ordem === "nome") return a.nome.localeCompare(b.nome, "pt-BR") * dir;
      const va = a[ordem] ?? -Infinity;
      const vb = b[ordem] ?? -Infinity;
      return (Number(va) - Number(vb)) * dir;
    });
  }, [jogadores, busca, posicao, status, ordem, asc]);

  async function salvar() {
    if (!editando) return;
    const overallAnterior = jogadores.find((j) => j.id === editando.id)?.overall ?? null;
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
    if (
      !error &&
      save?.seasonId &&
      editando.overall != null &&
      editando.overall !== overallAnterior
    ) {
      const { error: historyError } = await supabase.from("player_overall_history").insert({
        player_id: editando.id,
        season_id: save.seasonId,
        overall: editando.overall,
        valor_mercado: editando.valor_mercado,
        motivo: "atualizacao_manual",
      });
      if (historyError) {
        toast.error("Jogador atualizado, mas não foi possível registrar a evolução.");
      }
    }
    setSalvando(false);
    if (error) {
      toast.error("Não foi possível salvar o jogador.");
      return;
    }
    toast.success("Jogador atualizado!");
    setEditando(null);
    if (save) void carregar(save.id);
  }

  async function excluirJogador() {
    if (!excluindo || !save) return;
    setRemovendo(true);
    // Exclusão definitiva: limpa vínculos antes de remover o registro.
    await supabase.from("match_player_stats").delete().eq("player_id", excluindo.id);
    await supabase.from("fan_pressure_events").delete().eq("player_id", excluindo.id);
    await supabase
      .from("news_feed")
      .update({ relacionado_player_id: null })
      .eq("relacionado_player_id", excluindo.id);
    await supabase.from("transfers").update({ player_id: null }).eq("player_id", excluindo.id);
    await supabase
      .from("transfers")
      .update({ jogador_troca_id: null })
      .eq("jogador_troca_id", excluindo.id);
    const { error } = await supabase.from("players").delete().eq("id", excluindo.id);
    setRemovendo(false);
    if (error) {
      toast.error("Não foi possível excluir o jogador.");
      return;
    }
    toast.success("Jogador excluído do elenco.");
    setExcluindo(null);
    setEditando(null);
    void carregar(save.id);
  }

  async function encerrarVinculo() {
    if (!encerrando || !save) return;
    setRemovendo(true);
    const aposentadoria = encerrando.motivo === "aposentadoria";
    const { error } = await supabase
      .from("players")
      .update({
        ativo: false,
        capitao: false,
        status: aposentadoria ? "Aposentado" : "Contrato rescindido",
        data_saida: new Date().toISOString().slice(0, 10),
        motivo_saida: encerrando.motivo,
        clube_destino: null,
        transfer_saida_id: null,
      })
      .eq("id", encerrando.jogador.id)
      .eq("save_id", save.id);
    setRemovendo(false);
    if (error) {
      toast.error("Não foi possível concluir a saída do jogador.");
      return;
    }
    toast.success(aposentadoria ? "Aposentadoria registrada." : "Contrato rescindido.");
    setEncerrando(null);
    setEditando(null);
    void carregar(save.id);
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
            <Select value={ordem} onValueChange={(v) => setOrdem(v as CampoOrdem)}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Ordenar por" />
              </SelectTrigger>
              <SelectContent>
                {ORDENACOES.map((o) => (
                  <SelectItem key={o.valor} value={o.valor}>
                    Ordenar por {o.rotulo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="icon"
              aria-label={asc ? "Ordem crescente" : "Ordem decrescente"}
              onClick={() => setAsc((v) => !v)}
            >
              {asc ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
            </Button>
            <div className="flex overflow-hidden rounded-md border border-border">
              <Button
                variant={visao === "cards" ? "secondary" : "ghost"}
                size="icon"
                aria-label="Visão em cards"
                onClick={() => setVisao("cards")}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                variant={visao === "lista" ? "secondary" : "ghost"}
                size="icon"
                aria-label="Visão em lista"
                onClick={() => setVisao("lista")}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
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
          ) : visao === "lista" ? (
            <Card className="hq-card overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-widest text-muted-foreground">
                    <th className="px-3 py-2">Nome</th>
                    <th className="px-3 py-2">Posição</th>
                    <th className="px-3 py-2">Overall</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Idade</th>
                    <th className="px-3 py-2">Valor</th>
                    <th className="px-3 py-2">Salário</th>
                    <th className="px-3 py-2 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filtrados.map((j) => (
                    <tr key={j.id} className="border-b border-border/50 last:border-0">
                      <td className="px-3 py-2">
                        <span className="flex items-center gap-1.5">
                          <Bandeira pais={j.nacionalidade} />
                          <span className="font-medium">{j.nome}</span>
                          {j.capitao && (
                            <span className="rounded bg-primary/15 px-1 text-[10px] font-semibold text-primary">
                              C
                            </span>
                          )}
                        </span>
                      </td>
                      <td className="px-3 py-2">{posEn(j.posicao_principal) ?? "—"}</td>
                      <td className="px-3 py-2">
                        <span
                          className={`rounded-md px-2 py-0.5 font-display ${corOverall(j.overall)}`}
                        >
                          {j.overall ?? "—"}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <StatusJogador status={j.status} />
                      </td>
                      <td className="px-3 py-2">{j.idade ?? "—"}</td>
                      <td className="px-3 py-2">{moeda(j.valor_mercado)}</td>
                      <td className="px-3 py-2">{moeda(j.salario)}</td>
                      <td className="px-3 py-2 text-right whitespace-nowrap">
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Editar ${j.nome}`}
                          onClick={() => setEditando(j)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Excluir ${j.nome}`}
                          onClick={() => setExcluindo(j)}
                        >
                          <Trash2 className="h-4 w-4 text-red-400" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
                          <span>{posEn(j.posicao_principal) ?? "—"}</span>
                          <span>·</span>
                          <Bandeira pais={j.nacionalidade} />
                          <span>{j.nacionalidade ?? "—"}</span>
                          <span>· {j.idade ?? "—"} anos</span>
                        </p>
                      </div>
                      <span
                        className={`rounded-lg px-2 py-1 font-display text-lg ${corOverall(j.overall)}`}
                      >
                        {j.overall ?? "—"}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <StatusJogador status={j.status} />
                      <div className="flex flex-wrap gap-1">
                        {parsePlaystyles(j.playstyle).map((p) => (
                          <Badge key={p} variant="outline">
                            {p}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-1 text-xs text-muted-foreground">
                      <span>Valor: {moeda(j.valor_mercado)}</span>
                      <span>Salário: {moeda(j.salario)}</span>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => setEditando(j)}
                      >
                        <Pencil className="mr-1 h-4 w-4" /> Editar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        aria-label={`Excluir ${j.nome}`}
                        onClick={() => setExcluindo(j)}
                      >
                        <Trash2 className="h-4 w-4 text-red-400" />
                      </Button>
                    </div>
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
                    value={posEn(editando.posicao_principal) ?? ""}
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
                <Label>Playstyles (até 7)</Label>
                <PlaystyleSelect
                  value={editando.playstyle ?? ""}
                  onChange={(v) => campo({ playstyle: v })}
                />
              </div>

              <div className="grid gap-1">
                <Label>Status</Label>
                <Select value={editando.status ?? ""} onValueChange={(v) => campo({ status: v })}>
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
                <Switch checked={editando.capitao} onCheckedChange={(v) => campo({ capitao: v })} />
              </div>
              <div className="grid grid-cols-2 gap-2 border-t border-border pt-3">
                <Button
                  variant="outline"
                  onClick={() => setEncerrando({ jogador: editando, motivo: "aposentadoria" })}
                >
                  <UserMinus className="mr-1 h-4 w-4" /> Aposentar
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setEncerrando({ jogador: editando, motivo: "rescisao_contrato" })}
                >
                  Rescindir contrato
                </Button>
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

      <Dialog open={encerrando !== null} onOpenChange={(v) => !v && setEncerrando(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {encerrando?.motivo === "aposentadoria" ? "Aposentar" : "Rescindir contrato de"}{" "}
              {encerrando?.jogador.nome}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            O jogador deixará o elenco ativo e será preservado em Ex-jogadores com todo o histórico.
          </p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEncerrando(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={() => void encerrarVinculo()} disabled={removendo}>
              {removendo ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
              Confirmar saída
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={excluindo !== null} onOpenChange={(v) => !v && setExcluindo(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Excluir {excluindo?.nome}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            O jogador será apagado definitivamente, junto das estatísticas dele. Ele não vai para a
            lista de ex-jogadores. Esta ação não pode ser desfeita.
          </p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setExcluindo(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => void excluirJogador()}
              disabled={removendo}
            >
              {removendo ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
              Excluir definitivamente
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
