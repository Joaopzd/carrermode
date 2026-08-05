import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Loader2,
  Plus,
  Repeat,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { Skeleton } from "@/components/ui/skeleton";
import {
  JogadorFormDialog,
  formParaPayload,
  type JogadorForm,
} from "@/components/jogador-form-dialog";
import { supabase } from "@/integrations/supabase/client";
import { PAISES } from "@/lib/onboarding-data";
import { checarVendaPolemica } from "@/lib/eventos";
import { useSaveAtual } from "@/lib/use-save";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/transferencias")({
  head: () => ({
    meta: [
      { title: "Transferências | Carreira FC Manager" },
      { name: "description", content: "Compras, vendas, empréstimos e trocas." },
      { property: "og:title", content: "Transferências | Carreira FC Manager" },
      { property: "og:description", content: "Compras, vendas, empréstimos e trocas." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TransferenciasPage,
});

type Transferencia = {
  id: string;
  tipo: string;
  modalidade: string | null;
  player_id: string | null;
  jogador_troca_id: string | null;
  clube_contraparte: string | null;
  valor: number | null;
  duracao_emprestimo: string | null;
  data: string;
};


type JogadorSimples = {
  id: string;
  nome: string;
  overall: number | null;
  status: string | null;
  ativo?: boolean | null;
};


const MODALIDADES = ["definitiva", "emprestimo", "troca"] as const;
type Modalidade = (typeof MODALIDADES)[number];

const ROTULO_MODALIDADE: Record<string, string> = {
  definitiva: "Definitiva",
  emprestimo: "Empréstimo",
  troca: "Troca",
};

const moeda = (v: number | null) =>
  v === null ? "—" : `£ ${new Intl.NumberFormat("pt-BR").format(v)}`;

function TransferenciasPage() {
  const { save, carregando: carregandoSave } = useSaveAtual();
  const [lista, setLista] = useState<Transferencia[]>([]);
  const [elenco, setElenco] = useState<JogadorSimples[]>([]);
  const [todosJogadores, setTodosJogadores] = useState<JogadorSimples[]>([]);
  const [editando, setEditando] = useState<Transferencia | null>(null);
  const [salvandoEdicao, setSalvandoEdicao] = useState(false);
  const [excluindo, setExcluindo] = useState<Transferencia | null>(null);

  const [carregando, setCarregando] = useState(true);
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [filtroModalidade, setFiltroModalidade] = useState("todas");

  // wizard
  const [aberto, setAberto] = useState(false);
  const [etapa, setEtapa] = useState<1 | 2>(1);
  const [tipo, setTipo] = useState<"entrada" | "saida">("entrada");
  const [modalidade, setModalidade] = useState<Modalidade>("definitiva");
  const [salvando, setSalvando] = useState(false);

  // campos
  const [nomeExterno, setNomeExterno] = useState("");
  const [nacExterno, setNacExterno] = useState("");
  const [overallExterno, setOverallExterno] = useState("");
  const [clubeContraparte, setClubeContraparte] = useState("");
  const [valor, setValor] = useState("");
  const [duracao, setDuracao] = useState("");
  const [jogadorElencoId, setJogadorElencoId] = useState("");

  // cadastro do jogador que chega
  const [cadastroAberto, setCadastroAberto] = useState(false);
  const [cadastroInicial, setCadastroInicial] = useState<Partial<JogadorForm>>({});
  const [transferPendente, setTransferPendente] = useState<string | null>(null);
  const [salvandoCadastro, setSalvandoCadastro] = useState(false);

  async function carregar(saveId: string, seasonId: string | null) {
    let qt = supabase.from("transfers").select("*").eq("save_id", saveId);
    if (seasonId) qt = qt.eq("season_id", seasonId);
    const [{ data: t }, { data: p }] = await Promise.all([
      qt.order("data", { ascending: false }),
      supabase
        .from("players")
        .select("id, nome, overall, status, ativo")
        .eq("save_id", saveId)
        .order("nome"),
    ]);
    setLista((t ?? []) as Transferencia[]);
    setTodosJogadores((p ?? []) as JogadorSimples[]);
    setElenco(((p ?? []) as JogadorSimples[]).filter((j) => j.ativo !== false));
    setCarregando(false);
  }


  useEffect(() => {
    if (!save) {
      if (!carregandoSave) setCarregando(false);
      return;
    }
    void carregar(save.id, save.seasonId);
  }, [save, carregandoSave]);

  const filtrada = useMemo(
    () =>
      lista.filter(
        (t) =>
          (filtroTipo === "todos" || t.tipo === filtroTipo) &&
          (filtroModalidade === "todas" || t.modalidade === filtroModalidade),
      ),
    [lista, filtroTipo, filtroModalidade],
  );

  const nomePorId = useMemo(
    () => Object.fromEntries(todosJogadores.map((j) => [j.id, j.nome])),
    [todosJogadores],
  );


  const saldo = useMemo(() => {
    const entradas = lista
      .filter((t) => t.tipo === "entrada")
      .reduce((a, t) => a + (t.valor ?? 0), 0);
    const saidas = lista
      .filter((t) => t.tipo === "saida")
      .reduce((a, t) => a + (t.valor ?? 0), 0);
    return { entradas, saidas, total: saidas - entradas };
  }, [lista]);

  function resetar() {
    setEtapa(1);
    setTipo("entrada");
    setModalidade("definitiva");
    setNomeExterno("");
    setNacExterno("");
    setOverallExterno("");
    setClubeContraparte("");
    setValor("");
    setDuracao("");
    setJogadorElencoId("");
  }

  function abrirWizard() {
    resetar();
    setAberto(true);
  }

  const numOrNull = (v: string) => (v.trim() === "" ? null : Number(v));

  async function confirmar() {
    if (!save) return;
    if (tipo === "entrada" && nomeExterno.trim() === "") {
      toast.error("Informe o nome do jogador que chega.");
      return;
    }
    if (tipo === "saida" && !jogadorElencoId) {
      toast.error("Selecione o jogador que sai do elenco.");
      return;
    }
    if (modalidade === "troca" && tipo === "entrada" && !jogadorElencoId) {
      toast.error("Selecione o jogador do seu elenco envolvido na troca.");
      return;
    }

    setSalvando(true);
    const { data, error } = await supabase
      .from("transfers")
      .insert({
        save_id: save.id,
        season_id: save.seasonId,
        tipo,
        modalidade,
        player_id: tipo === "saida" ? jogadorElencoId : null,
        jogador_troca_id: modalidade === "troca" && jogadorElencoId ? jogadorElencoId : null,
        clube_contraparte: clubeContraparte.trim() || null,
        valor: numOrNull(valor),
        duracao_emprestimo: modalidade === "emprestimo" ? duracao || null : null,
      })
      .select("id")
      .maybeSingle();

    if (error || !data) {
      setSalvando(false);
      toast.error("Não foi possível registrar a transferência.");
      return;
    }

    // Jogador que deixa o clube: numa saída é o próprio; numa entrada por troca
    // é o atleta oferecido, que também precisa sair do elenco.
    const jogadorQueSai =
      tipo === "saida" || modalidade === "troca" ? jogadorElencoId || null : null;

    if (jogadorQueSai) {
      await supabase
        .from("players")
        .update({
          status: "Transferido",
          ativo: false,
          data_saida: new Date().toISOString().slice(0, 10),
          motivo_saida:
            modalidade === "emprestimo" ? "emprestimo" : "transferencia_definitiva",
          clube_destino: clubeContraparte.trim() || null,
          transfer_saida_id: data.id as string,
        })
        .eq("id", jogadorQueSai);
      void checarVendaPolemica(
        save.id,
        jogadorQueSai,
        numOrNull(valor),
        clubeContraparte.trim() || null,
      );
    }


    setSalvando(false);
    setAberto(false);
    toast.success("Transferência registrada!");

    const chegaJogador =
      tipo === "entrada" || (tipo === "saida" && modalidade === "troca" && nomeExterno.trim());

    if (chegaJogador) {
      setCadastroInicial({
        nome: nomeExterno.trim(),
        nacionalidade: nacExterno,
        overall: overallExterno,
        valor_mercado: tipo === "entrada" ? valor : "",
      });
      setTransferPendente(data.id as string);
      setCadastroAberto(true);
    }

    void carregar(save.id, save.seasonId);
  }

  async function salvarJogadorChegando(form: JogadorForm) {
    if (!save) return;
    setSalvandoCadastro(true);
    const { data, error } = await supabase
      .from("players")
      .insert({
        save_id: save.id,
        categoria: "principal",
        criado_via: "transferencia",
        ...formParaPayload(form),
      })
      .select("id")
      .maybeSingle();
    if (!error && data && transferPendente) {
      await supabase
        .from("transfers")
        .update({ player_id: data.id as string })
        .eq("id", transferPendente);
    }
    setSalvandoCadastro(false);
    if (error) {
      toast.error("Transferência salva, mas o cadastro do jogador falhou.");
      return;
    }
    toast.success("Jogador integrado ao elenco principal!");
    setCadastroAberto(false);
    setTransferPendente(null);
    void carregar(save.id, save.seasonId);
  }

  async function salvarEdicao() {
    if (!editando || !save) return;
    setSalvandoEdicao(true);
    const { error } = await supabase
      .from("transfers")
      .update({
        clube_contraparte: editando.clube_contraparte,
        valor: editando.valor,
        duracao_emprestimo: editando.duracao_emprestimo,
        modalidade: editando.modalidade,
        data: editando.data,
      })
      .eq("id", editando.id);
    if (!error) {
      await supabase
        .from("players")
        .update({ clube_destino: editando.clube_contraparte })
        .eq("transfer_saida_id", editando.id);
    }
    setSalvandoEdicao(false);
    if (error) {
      toast.error("Não foi possível salvar a transferência.");
      return;
    }
    toast.success("Transferência atualizada!");
    setEditando(null);
    void carregar(save.id, save.seasonId);
  }

  async function excluirTransferencia() {
    if (!excluindo || !save) return;
    // Reverte a saída dos jogadores vinculados a esta negociação.
    await supabase
      .from("players")
      .update({
        ativo: true,
        status: "Liberado",
        data_saida: null,
        motivo_saida: null,
        clube_destino: null,
        transfer_saida_id: null,
      })
      .eq("transfer_saida_id", excluindo.id);
    await supabase
      .from("news_feed")
      .update({ relacionado_transfer_id: null })
      .eq("relacionado_transfer_id", excluindo.id);
    const { error } = await supabase.from("transfers").delete().eq("id", excluindo.id);
    if (error) {
      toast.error("Não foi possível excluir a transferência.");
      return;
    }
    toast.success("Transferência excluída.");
    setExcluindo(null);
    void carregar(save.id, save.seasonId);
  }

  const precisaDadosExternos =
    tipo === "entrada" || (tipo === "saida" && modalidade === "troca");


  return (
    <AppShell titulo="Transferências">
      <div className="pitch-lines min-h-full px-4 py-8 sm:px-8">
        <div className="mx-auto max-w-5xl space-y-6">
          <header className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-gradient-pitch text-4xl">Transferências</h1>
              <p className="text-sm text-muted-foreground">
                Histórico da janela atual — {lista.length} movimentação(ões).
              </p>
            </div>
            <Button onClick={abrirWizard} disabled={!save}>
              <Plus className="mr-1 h-4 w-4" /> Nova transferência
            </Button>
          </header>

          <div className="grid gap-4 sm:grid-cols-3">
            <Card className="hq-card">
              <CardContent className="py-4">
                <p className="text-xs text-muted-foreground">Gastos com entradas</p>
                <p className="font-display text-2xl text-red-400">{moeda(saldo.entradas)}</p>
              </CardContent>
            </Card>
            <Card className="hq-card">
              <CardContent className="py-4">
                <p className="text-xs text-muted-foreground">Receita com saídas</p>
                <p className="font-display text-2xl text-emerald-400">{moeda(saldo.saidas)}</p>
              </CardContent>
            </Card>
            <Card className="hq-card">
              <CardContent className="py-4">
                <p className="text-xs text-muted-foreground">Saldo do período</p>
                <p
                  className={cn(
                    "font-display text-2xl",
                    saldo.total >= 0 ? "text-emerald-400" : "text-red-400",
                  )}
                >
                  {saldo.total >= 0 ? "+" : "-"} {moeda(Math.abs(saldo.total))}
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="flex flex-wrap gap-3">
            <Select value={filtroTipo} onValueChange={setFiltroTipo}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os tipos</SelectItem>
                <SelectItem value="entrada">Entradas</SelectItem>
                <SelectItem value="saida">Saídas</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filtroModalidade} onValueChange={setFiltroModalidade}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Modalidade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas as modalidades</SelectItem>
                {MODALIDADES.map((m) => (
                  <SelectItem key={m} value={m}>
                    {ROTULO_MODALIDADE[m]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {carregando ? (
            <Skeleton className="h-64 w-full rounded-xl" />
          ) : filtrada.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-14 text-center">
                <TrendingUp className="mx-auto h-8 w-8 text-muted-foreground" />
                <p className="mt-3 text-sm text-muted-foreground">
                  Nenhuma movimentação registrada nesta janela.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filtrada.map((t) => (
                <Card key={t.id} className="hq-card">
                  <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
                    <div className="flex items-center gap-3">
                      <span
                        className={cn(
                          "rounded-lg p-2",
                          t.tipo === "entrada"
                            ? "bg-sky-500/15 text-sky-400"
                            : "bg-emerald-500/15 text-emerald-400",
                        )}
                      >
                        {t.modalidade === "troca" ? (
                          <Repeat className="h-4 w-4" />
                        ) : t.tipo === "entrada" ? (
                          <ArrowDownLeft className="h-4 w-4" />
                        ) : (
                          <ArrowUpRight className="h-4 w-4" />
                        )}
                      </span>
                      <div>
                        <p className="font-display text-lg tracking-wide">
                          {t.player_id ? (nomePorId[t.player_id] ?? "Jogador") : "Jogador"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {t.tipo === "entrada" ? "De" : "Para"} {t.clube_contraparte ?? "—"} ·{" "}
                          {new Date(t.data).toLocaleDateString("pt-BR")}
                          {t.duracao_emprestimo ? ` · até ${t.duracao_emprestimo}` : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">
                        {ROTULO_MODALIDADE[t.modalidade ?? ""] ?? t.modalidade}
                      </Badge>
                      <span className="font-display text-lg">{moeda(t.valor)}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {etapa === 1 ? "Nova transferência" : "Detalhes da transferência"}
            </DialogTitle>
            <DialogDescription>
              {etapa === 1
                ? "Etapa 1 de 2 — o jogador está chegando ou saindo?"
                : `Etapa 2 de 2 — ${tipo === "entrada" ? "Entrada" : "Saída"} · ${ROTULO_MODALIDADE[modalidade]}`}
            </DialogDescription>
          </DialogHeader>

          {etapa === 1 ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {(["entrada", "saida"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTipo(t)}
                    className={cn(
                      "rounded-xl border p-4 text-left transition-colors",
                      tipo === t ? "border-primary bg-primary/10" : "border-border",
                    )}
                  >
                    <p className="font-display text-xl tracking-wide">
                      {t === "entrada" ? "Entrada" : "Saída"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t === "entrada" ? "Chega ao clube" : "Deixa o clube"}
                    </p>
                  </button>
                ))}
              </div>
              <div className="grid gap-1">
                <Label>Modalidade</Label>
                <Select value={modalidade} onValueChange={(v) => setModalidade(v as Modalidade)}>
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
            </div>
          ) : (
            <div className="grid gap-3">
              {precisaDadosExternos ? (
                <>
                  <div className="grid gap-1">
                    <Label>
                      {tipo === "entrada" ? "Nome do jogador" : "Jogador recebido na troca"}
                    </Label>
                    <Input
                      value={nomeExterno}
                      onChange={(e) => setNomeExterno(e.target.value)}
                      placeholder="Nome completo"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="grid gap-1">
                      <Label>Nacionalidade</Label>
                      <Select value={nacExterno} onValueChange={setNacExterno}>
                        <SelectTrigger>
                          <SelectValue placeholder="País" />
                        </SelectTrigger>
                        <SelectContent>
                          {PAISES.map((p) => (
                            <SelectItem key={p} value={p}>
                              {p}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-1">
                      <Label>Overall</Label>
                      <Input
                        type="number"
                        min={0}
                        max={99}
                        value={overallExterno}
                        onChange={(e) => setOverallExterno(e.target.value)}
                      />
                    </div>
                  </div>
                </>
              ) : null}

              {(tipo === "saida" || modalidade === "troca") && (
                <div className="grid gap-1">
                  <Label>Jogador do meu elenco</Label>
                  <Select value={jogadorElencoId} onValueChange={setJogadorElencoId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um jogador" />
                    </SelectTrigger>
                    <SelectContent>
                      {elenco.map((j) => (
                        <SelectItem key={j.id} value={j.id}>
                          {j.nome} {j.overall ? `(${j.overall})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="grid gap-1">
                <Label>{tipo === "entrada" ? "Clube de origem" : "Clube de destino"}</Label>
                <Input
                  value={clubeContraparte}
                  onChange={(e) => setClubeContraparte(e.target.value)}
                  placeholder="Nome do clube"
                />
              </div>

              {modalidade === "emprestimo" ? (
                <div className="grid gap-1">
                  <Label>Duração (data de término)</Label>
                  <Input
                    type="date"
                    value={duracao}
                    onChange={(e) => setDuracao(e.target.value)}
                  />
                </div>
              ) : (
                <div className="grid gap-1">
                  <Label>{modalidade === "troca" ? "Valor de ajuste" : "Valor"}</Label>
                  <Input
                    type="number"
                    value={valor}
                    onChange={(e) => setValor(e.target.value)}
                    placeholder="0"
                  />
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            {etapa === 1 ? (
              <>
                <Button variant="ghost" onClick={() => setAberto(false)}>
                  Cancelar
                </Button>
                <Button onClick={() => setEtapa(2)}>Continuar</Button>
              </>
            ) : (
              <>
                <Button variant="ghost" onClick={() => setEtapa(1)}>
                  Voltar
                </Button>
                <Button onClick={() => void confirmar()} disabled={salvando}>
                  {salvando ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
                  Confirmar transferência
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <JogadorFormDialog
        open={cadastroAberto}
        onOpenChange={setCadastroAberto}
        titulo="Cadastrar jogador que chega"
        descricao="Complete a ficha para integrar o atleta ao elenco principal."
        valorInicial={cadastroInicial}
        salvando={salvandoCadastro}
        textoConfirmar="Integrar ao elenco"
        onConfirmar={salvarJogadorChegando}
      />
    </AppShell>
  );
}
