import { ClubBadge } from "@/components/club-badge";
import { ClubAutocomplete } from "@/components/club-autocomplete";
import { createFileRoute, useRouterState } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Loader2,
  Pencil,
  Plus,
  Repeat,
  Trash2,
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
import { Switch } from "@/components/ui/switch";
import {
  JogadorFormDialog,
  formParaPayload,
  type JogadorForm,
} from "@/components/jogador-form-dialog";
import { supabase } from "@/integrations/supabase/client";
import {
  carregarEmprestimosAtivos,
  encerrarEmprestimo,
  type EmprestimoRow,
} from "@/lib/emprestimos";
import { lerDataCarreira } from "@/lib/carreira-data";
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
  validateSearch: (s: Record<string, unknown>) => ({
    recontratar: typeof s['recontratar'] === "string" ? (s['recontratar'] as string) : undefined,
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
  janela: string | null;
  data: string;
  tem_opcao_compra?: boolean | null;
  valor_opcao_compra?: number | null;
  obrigacao_compra?: boolean | null;
  status_opcao?: string | null;
  transfer_origem_emprestimo_id?: string | null;
};

type JogadorSimples = {
  id: string;
  nome: string;
  overall: number | null;
  status: string | null;
  ativo?: boolean | null;
};

type ExJogador = {
  id: string;
  nome: string;
  nacionalidade: string | null;
  posicao_principal: string | null;
  posicoes_secundarias: string[] | null;
  overall: number | null;
  potencial: number | null;
  valor_mercado: number | null;
  salario: number | null;
  idade: number | null;
  altura: number | null;
  playstyle: string | null;
  status: string | null;
  favorito_torcida: boolean | null;
  capitao: boolean | null;
};

/** Pré-preenche a ficha com os últimos valores conhecidos do ex-jogador. */
function formDoRetorno(j: ExJogador): Partial<JogadorForm> {
  const txt = (v: number | null) => (v == null ? "" : String(v));
  return {
    nome: j.nome,
    nacionalidade: j.nacionalidade ?? "",
    posicao_principal: j.posicao_principal ?? "",
    posicoes_secundarias: j.posicoes_secundarias ?? [],
    overall: txt(j.overall),
    potencial: txt(j.potencial),
    valor_mercado: txt(j.valor_mercado),
    salario: txt(j.salario),
    idade: txt(j.idade),
    altura: txt(j.altura),
    playstyle: j.playstyle ?? "",
    status: j.status ?? "Liberado",
    favorito_torcida: !!j.favorito_torcida,
    capitao: false,
  };
}

const MODALIDADES = ["definitiva", "emprestimo", "troca"] as const;
type Modalidade = (typeof MODALIDADES)[number];

const ROTULO_MODALIDADE: Record<string, string> = {
  definitiva: "Definitiva",
  emprestimo: "Empréstimo",
  troca: "Troca",
};

type Janela = "verao" | "inverno";
const ICONE_JANELA: Record<string, string> = { verao: "☀️", inverno: "❄️" };
const ROTULO_JANELA: Record<string, string> = { verao: "Verão", inverno: "Inverno" };

/** Junho a agosto = verão; demais meses (janeiro incluso) = inverno. */
function janelaDoDia(dia: string): Janela {
  const mes = Number(dia.slice(5, 7));
  return mes >= 6 && mes <= 8 ? "verao" : "inverno";
}

const hojeISO = () => new Date().toISOString().slice(0, 10);

const moeda = (v: number | null) =>
  v === null ? "—" : `£ ${new Intl.NumberFormat("pt-BR").format(v)}`;

function TransferenciasPage() {
  const { save, carregando: carregandoSave } = useSaveAtual();
  const recontratarId = useRouterState({
    select: (s) => (s.location.search as { recontratar?: string }).recontratar ?? null,
  });
  const [lista, setLista] = useState<Transferencia[]>([]);
  const [emprestimos, setEmprestimos] = useState<Transferencia[]>([]);
  const [elenco, setElenco] = useState<JogadorSimples[]>([]);
  const [todosJogadores, setTodosJogadores] = useState<JogadorSimples[]>([]);
  const [editando, setEditando] = useState<Transferencia | null>(null);
  const [salvandoEdicao, setSalvandoEdicao] = useState(false);
  const [excluindo, setExcluindo] = useState<Transferencia | null>(null);

  const [carregando, setCarregando] = useState(true);
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [filtroModalidade, setFiltroModalidade] = useState("todas");
  const [filtroJanela, setFiltroJanela] = useState("todas");

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
  const [dataNeg, setDataNeg] = useState(hojeISO);
  const [janela, setJanela] = useState<Janela>(() => janelaDoDia(hojeISO()));
  const [janelaManual, setJanelaManual] = useState(false);
  const [temOpcao, setTemOpcao] = useState(false);
  const [valorOpcao, setValorOpcao] = useState("");
  const [obrigacaoCompra, setObrigacaoCompra] = useState(false);
  const [processandoOpcao, setProcessandoOpcao] = useState<string | null>(null);

  // cadastro do jogador que chega
  const [cadastroAberto, setCadastroAberto] = useState(false);
  const [cadastroInicial, setCadastroInicial] = useState<Partial<JogadorForm>>({});
  const [transferPendente, setTransferPendente] = useState<string | null>(null);
  const [salvandoCadastro, setSalvandoCadastro] = useState(false);

  // retorno de ex-jogador
  const [exJogadores, setExJogadores] = useState<ExJogador[]>([]);
  const [buscaRetorno, setBuscaRetorno] = useState("");
  const [retorno, setRetorno] = useState<ExJogador | null>(null);
  const [jogadorNovo, setJogadorNovo] = useState(false);
  const [retornoAberto, setRetornoAberto] = useState(false);

  async function carregar(saveId: string, seasonId: string | null) {
    let qt = supabase.from("transfers").select("*").eq("save_id", saveId);
    if (seasonId) qt = qt.eq("season_id", seasonId);
    const [{ data: t }, { data: p }, { data: ex }, ativos] = await Promise.all([
      qt.order("data", { ascending: false }),
      supabase
        .from("players")
        .select("id, nome, overall, status, ativo")
        .eq("save_id", saveId)
        .order("nome"),
      supabase
        .from("players")
        .select(
          "id, nome, nacionalidade, posicao_principal, posicoes_secundarias, overall, potencial, valor_mercado, salario, idade, altura, playstyle, status, favorito_torcida, capitao",
        )
        .eq("save_id", saveId)
        .eq("ativo", false)
        .order("nome"),
      carregarEmprestimosAtivos(saveId),
    ]);
    setLista((t ?? []) as Transferencia[]);
    setEmprestimos(ativos as unknown as Transferencia[]);
    setTodosJogadores((p ?? []) as JogadorSimples[]);
    setElenco(((p ?? []) as JogadorSimples[]).filter((j) => j.ativo !== false));
    setExJogadores((ex ?? []) as unknown as ExJogador[]);
    setCarregando(false);
  }

  useEffect(() => {
    if (!save) {
      if (!carregandoSave) setCarregando(false);
      return;
    }
    void carregar(save.id, save.seasonId);
  }, [save, carregandoSave]);

  // Deep link de "Recontratar" a partir da tela de Ex-Jogadores.
  useEffect(() => {
    if (!recontratarId || exJogadores.length === 0 || aberto) return;
    const alvo = exJogadores.find((j) => j.id === recontratarId);
    if (alvo) abrirRecontratacao(alvo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recontratarId, exJogadores]);


  const filtrada = useMemo(
    () =>
      lista.filter(
        (t) =>
          (filtroTipo === "todos" || t.tipo === filtroTipo) &&
          (filtroModalidade === "todas" || t.modalidade === filtroModalidade) &&
          (filtroJanela === "todas" ||
            (t.janela ?? janelaDoDia(t.data.slice(0, 10))) === filtroJanela),
      ),
    [lista, filtroTipo, filtroModalidade, filtroJanela],
  );

  const resumoFiltrado = useMemo(() => {
    const entradas = filtrada.filter((t) => t.tipo === "entrada").length;
    const saidas = filtrada.filter((t) => t.tipo === "saida").length;
    const porModalidade = {
      definitiva: filtrada.filter((t) => t.modalidade === "definitiva").length,
      emprestimo: filtrada.filter((t) => t.modalidade === "emprestimo").length,
      troca: filtrada.filter((t) => t.modalidade === "troca").length,
    };
    return { entradas, saidas, total: entradas + saidas, porModalidade };
  }, [filtrada]);

  const nomePorId = useMemo(
    () => Object.fromEntries(todosJogadores.map((j) => [j.id, j.nome])),
    [todosJogadores],
  );

  const saldo = useMemo(() => {
    const entradas = lista
      .filter((t) => t.tipo === "entrada")
      .reduce((a, t) => a + (t.valor ?? 0), 0);
    const saidas = lista.filter((t) => t.tipo === "saida").reduce((a, t) => a + (t.valor ?? 0), 0);
    return { entradas, saidas, total: saidas - entradas };
  }, [lista]);

  function definirData(novo: string) {
    setDataNeg(novo);
    if (!janelaManual && novo) setJanela(janelaDoDia(novo));
  }

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
    // Por padrão usa o dia atual do calendário da carreira (editável).
    const hoje = lerDataCarreira(save?.id) ?? hojeISO();
    setDataNeg(hoje);
    setJanela(janelaDoDia(hoje));

    setJanelaManual(false);
    setTemOpcao(false);
    setValorOpcao("");
    setObrigacaoCompra(false);
    setBuscaRetorno("");
    setRetorno(null);
    setJogadorNovo(false);
  }

  function abrirWizard() {
    resetar();
    setAberto(true);
  }

  /** Abre o wizard de entrada com um ex-jogador já pré-selecionado. */
  function abrirRecontratacao(j: ExJogador) {
    resetar();
    setTipo("entrada");
    selecionarRetorno(j);
    setEtapa(2);
    setAberto(true);
  }

  function selecionarRetorno(j: ExJogador) {
    setRetorno(j);
    setJogadorNovo(false);
    setBuscaRetorno(j.nome);
    setNomeExterno(j.nome);
    setNacExterno(j.nacionalidade ?? "");
    setOverallExterno(j.overall == null ? "" : String(j.overall));
  }

  const sugestoesRetorno = useMemo(() => {
    const termo = buscaRetorno.trim().toLowerCase();
    if (termo === "" || retorno) return [];
    return exJogadores.filter((j) => j.nome.toLowerCase().includes(termo)).slice(0, 6);
  }, [buscaRetorno, exJogadores, retorno]);

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
        player_id: tipo === "saida" && modalidade !== "troca" ? jogadorElencoId : null,
        jogador_troca_id: modalidade === "troca" && jogadorElencoId ? jogadorElencoId : null,
        clube_contraparte: clubeContraparte.trim() || null,
        valor: numOrNull(valor),
        duracao_emprestimo: modalidade === "emprestimo" ? duracao || null : null,
        janela,
        tem_opcao_compra: modalidade === "emprestimo" ? temOpcao : false,
        valor_opcao_compra: modalidade === "emprestimo" && temOpcao ? numOrNull(valorOpcao) : null,
        obrigacao_compra: modalidade === "emprestimo" && temOpcao ? obrigacaoCompra : false,
        status_opcao: modalidade === "emprestimo" && temOpcao ? "pendente" : "nao_aplicavel",
        data: new Date(`${dataNeg || hojeISO()}T12:00:00`).toISOString(),
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
      const { error: saidaError } = await supabase
        .from("players")
        .update({
          status: "Transferido",
          ativo: false,
          data_saida: new Date().toISOString().slice(0, 10),
          motivo_saida: modalidade === "emprestimo" ? "emprestimo" : "transferencia_definitiva",
          clube_destino: clubeContraparte.trim() || null,
          transfer_saida_id: data.id as string,
        })
        .eq("id", jogadorQueSai)
        .eq("save_id", save.id)
        .select("id")
        .single();
      if (saidaError) {
        await supabase
          .from("transfers")
          .delete()
          .eq("id", data.id as string);
        setSalvando(false);
        toast.error("A negociação não foi concluída porque o jogador não saiu do elenco.");
        return;
      }
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

    if (retorno && tipo === "entrada") {
      await supabase
        .from("transfers")
        .update({ player_id: retorno.id })
        .eq("id", data.id as string);
      setCadastroInicial({
        ...formDoRetorno(retorno),
        valor_mercado: valor || String(retorno.valor_mercado ?? ""),
      });
      setTransferPendente(data.id as string);
      setRetornoAberto(true);
    } else if (chegaJogador) {
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

  /** Reativa o registro de um ex-jogador em vez de criar um novo player. */
  async function salvarRetornoJogador(form: JogadorForm) {
    if (!save || !retorno) return;
    setSalvandoCadastro(true);
    const payload = formParaPayload(form);
    const { error } = await supabase
      .from("players")
      .update({
        ...payload,
        ativo: true,
        categoria: "principal",
        data_saida: null,
        motivo_saida: null,
        clube_destino: null,
        transfer_saida_id: null,
      })
      .eq("id", retorno.id)
      .eq("save_id", save.id);

    if (!error && payload.overall != null && save.seasonId) {
      await supabase.from("player_overall_history").insert({
        player_id: retorno.id,
        season_id: save.seasonId,
        overall: payload.overall,
        valor_mercado: payload.valor_mercado,
        motivo: "atualizacao_manual",
      });
    }

    setSalvandoCadastro(false);
    if (error) {
      toast.error("Transferência salva, mas o retorno do jogador falhou.");
      return;
    }
    toast.success(`${form.nome} está de volta ao elenco!`);
    setRetornoAberto(false);
    setTransferPendente(null);
    setRetorno(null);
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
        janela: (editando.janela as Janela | null) ?? janelaDoDia(editando.data.slice(0, 10)),
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

  async function exercerOpcao(t: Transferencia) {
    if (!save) return;
    setProcessandoOpcao(t.id);
    const hoje = hojeISO();
    const { error } = await supabase.from("transfers").insert({
      save_id: save.id,
      season_id: save.seasonId,
      tipo: t.tipo,
      modalidade: "definitiva",
      player_id: t.player_id,
      clube_contraparte: t.clube_contraparte,
      valor: t.valor_opcao_compra ?? null,
      janela: janelaDoDia(hoje),
      data: new Date(`${hoje}T12:00:00`).toISOString(),
      transfer_origem_emprestimo_id: t.id,
    });
    if (!error) {
      await supabase.from("transfers").update({ status_opcao: "exercida" }).eq("id", t.id);
      if (t.tipo === "saida" && t.player_id) {
        await supabase
          .from("players")
          .update({ motivo_saida: "transferencia_definitiva" })
          .eq("id", t.player_id);
      }
    }
    setProcessandoOpcao(null);
    if (error) {
      toast.error("Não foi possível exercer a opção de compra.");
      return;
    }
    toast.success("Opção de compra exercida!");
    void carregar(save.id, save.seasonId);
  }

  async function naoExercerOpcao(t: Transferencia) {
    if (!save) return;
    setProcessandoOpcao(t.id);
    const { error } = await supabase
      .from("transfers")
      .update({ status_opcao: "nao_exercida" })
      .eq("id", t.id);
    if (!error && t.player_id) {
      if (t.tipo === "entrada") {
        await supabase
          .from("players")
          .update({
            ativo: false,
            status: "Transferido",
            data_saida: hojeISO(),
            motivo_saida: "emprestimo",
            clube_destino: t.clube_contraparte,
          })
          .eq("id", t.player_id);
      } else {
        await supabase
          .from("players")
          .update({
            ativo: true,
            status: "Liberado",
            data_saida: null,
            motivo_saida: null,
            clube_destino: null,
          })
          .eq("id", t.player_id);
      }
    }
    setProcessandoOpcao(null);
    if (error) {
      toast.error("Não foi possível atualizar a opção de compra.");
      return;
    }
    toast.success("Opção de compra não exercida.");
    void carregar(save.id, save.seasonId);
  }

  function rotuloJogador(t: Transferencia) {
    const entra = t.player_id ? nomePorId[t.player_id] : null;
    const sai = t.jogador_troca_id ? nomePorId[t.jogador_troca_id] : null;
    if (t.modalidade === "troca") {
      if (entra && sai) return `${sai} ⇄ ${entra}`;
      return entra ?? sai ?? "Jogador";
    }
    return entra ?? sai ?? "Jogador";
  }

  const emprestimosAtivos = emprestimos;

  async function retornarAgora(t: Transferencia) {
    if (!save) return;
    setProcessandoOpcao(t.id);
    try {
      await encerrarEmprestimo(t as unknown as EmprestimoRow);
      toast.success("Jogador retornado, empréstimo encerrado.");
      void carregar(save.id, save.seasonId);
    } catch {
      toast.error("Não foi possível encerrar o empréstimo.");
    } finally {
      setProcessandoOpcao(null);
    }
  }

  const precisaDadosExternos = tipo === "entrada" || (tipo === "saida" && modalidade === "troca");

  return (
    <AppShell titulo="Transferências">
      <div className="pitch-lines min-h-full px-4 py-8 sm:px-8">
        <div className="mx-auto max-w-5xl space-y-6">
          <header className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-gradient-pitch text-4xl">
                {filtroJanela === "todas"
                  ? "Transferências"
                  : `Janela de ${ROTULO_JANELA[filtroJanela]}`}
              </h1>
              <p className="text-sm text-muted-foreground">
                {filtroJanela === "todas" ? "Histórico completo" : ICONE_JANELA[filtroJanela]} —{" "}
                {filtrada.length} movimentação(ões).
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
            <Select value={filtroJanela} onValueChange={setFiltroJanela}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Janela" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas as janelas</SelectItem>
                <SelectItem value="verao">☀️ Verão</SelectItem>
                <SelectItem value="inverno">❄️ Inverno</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Card className="hq-card">
            <CardContent className="space-y-3 py-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-emerald-400">{resumoFiltrado.entradas} entradas</span>
                <span className="text-red-400">{resumoFiltrado.saidas} saídas</span>
              </div>
              <div className="flex h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-emerald-500"
                  style={{
                    width: `${resumoFiltrado.total ? (resumoFiltrado.entradas / resumoFiltrado.total) * 100 : 0}%`,
                  }}
                />
                <div
                  className="h-full bg-red-500"
                  style={{
                    width: `${resumoFiltrado.total ? (resumoFiltrado.saidas / resumoFiltrado.total) * 100 : 0}%`,
                  }}
                />
              </div>
              <div className="grid grid-cols-3 gap-2 text-center text-xs text-muted-foreground">
                <div>
                  <p className="font-display text-lg text-foreground">
                    {resumoFiltrado.porModalidade.definitiva}
                  </p>
                  Definitivas
                </div>
                <div>
                  <p className="font-display text-lg text-foreground">
                    {resumoFiltrado.porModalidade.emprestimo}
                  </p>
                  Empréstimos
                </div>
                <div>
                  <p className="font-display text-lg text-foreground">
                    {resumoFiltrado.porModalidade.troca}
                  </p>
                  Trocas
                </div>
              </div>
            </CardContent>
          </Card>

          {emprestimosAtivos.length > 0 ? (
            <section className="space-y-3">
              <button
                type="button"
                onClick={() => setEmprestimosAberto((v) => !v)}
                className="flex w-full items-center justify-between gap-2 text-left"
                aria-expanded={emprestimosAberto}
              >
                <h2 className="font-display text-2xl tracking-wide">
                  Empréstimos ativos{" "}
                  <span className="text-base text-muted-foreground">
                    ({emprestimosAtivos.length})
                  </span>
                </h2>
                <ChevronDown
                  className={cn(
                    "h-5 w-5 text-muted-foreground transition-transform",
                    emprestimosAberto ? "rotate-180" : "",
                  )}
                />
              </button>
              <Collapse open={emprestimosAberto}>
                <div className="space-y-3">
                  {emprestimosAtivos.map((t) => (
                    <Card key={t.id} className="hq-card">
                      <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
                        <div>
                          <p className="font-display text-lg tracking-wide">{rotuloJogador(t)}</p>
                          <p className="text-xs text-muted-foreground">
                            {t.tipo === "entrada" ? "De" : "Para"}{" "}
                            <ClubBadge nome={t.clube_contraparte} className="align-middle" />
                            {t.duracao_emprestimo ? ` · até ${t.duracao_emprestimo}` : ""}
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          {t.tem_opcao_compra ? (
                            <>
                              <Badge variant="outline">
                                {t.obrigacao_compra ? "Obrigação" : "Opção"} de compra:{" "}
                                {moeda(t.valor_opcao_compra ?? null)}
                              </Badge>
                              <Button
                                size="sm"
                                disabled={processandoOpcao === t.id}
                                onClick={() => void exercerOpcao(t)}
                              >
                                Exercer opção de compra
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={processandoOpcao === t.id}
                                onClick={() => void naoExercerOpcao(t)}
                              >
                                Não exercer opção
                              </Button>
                            </>
                          ) : (
                            <Button
                              size="sm"
                              disabled={processandoOpcao === t.id}
                              onClick={() => {
                                setContratando(t);
                                setValorContratacao("");
                              }}
                            >
                              Contratar jogador
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="secondary"
                            disabled={processandoOpcao === t.id}
                            onClick={() => void retornarAgora(t)}
                          >
                            Encerrar Empréstimo
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </Collapse>
            </section>
          ) : null}

          <Dialog open={!!contratando} onOpenChange={(v) => !v && setContratando(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Contratar jogador emprestado</DialogTitle>
                <DialogDescription>
                  Transforma o empréstimo em transferência definitiva.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-1">
                <Label>Valor da negociação</Label>
                <Input
                  type="number"
                  value={valorContratacao}
                  onChange={(e) => setValorContratacao(e.target.value)}
                  placeholder="0"
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setContratando(null)}>
                  Cancelar
                </Button>
                <Button
                  disabled={!!processandoOpcao}
                  onClick={() => void confirmarContratacaoEmprestado()}
                >
                  Confirmar contratação
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>



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
                        <p className="font-display text-lg tracking-wide">{rotuloJogador(t)}</p>
                        <p className="text-xs text-muted-foreground">
                          {t.tipo === "entrada" ? "De" : "Para"}{" "}
                          <ClubBadge nome={t.clube_contraparte} className="align-middle" /> ·{" "}
                          {new Date(t.data).toLocaleDateString("pt-BR")}
                          {t.duracao_emprestimo ? ` · até ${t.duracao_emprestimo}` : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">
                        {ROTULO_MODALIDADE[t.modalidade ?? ""] ?? t.modalidade}
                      </Badge>
                      <span
                        title={`Janela de ${ROTULO_JANELA[t.janela ?? janelaDoDia(t.data.slice(0, 10))]}`}
                      >
                        {ICONE_JANELA[t.janela ?? janelaDoDia(t.data.slice(0, 10))]}
                      </span>
                      <span className="font-display text-lg">{moeda(t.valor)}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Editar transferência"
                        onClick={() => setEditando(t)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Excluir transferência"
                        onClick={() => setExcluindo(t)}
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
              {tipo === "entrada" ? (
                <div className="grid gap-2 rounded-xl border border-border p-3">
                  <Label>Este jogador já jogou pelo clube antes?</Label>
                  {retorno ? (
                    <div className="flex items-center justify-between gap-2 rounded-lg border border-primary bg-primary/10 px-3 py-2">
                      <div className="text-sm">
                        <p className="font-medium">{retorno.nome}</p>
                        <p className="text-xs text-muted-foreground">
                          Retorno ao clube · overall anterior {retorno.overall ?? "—"}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setRetorno(null);
                          setBuscaRetorno("");
                        }}
                      >
                        Trocar
                      </Button>
                    </div>
                  ) : jogadorNovo ? (
                    <div className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
                      <span>Jogador novo — cadastro completo.</span>
                      <Button variant="ghost" size="sm" onClick={() => setJogadorNovo(false)}>
                        Buscar ex-jogador
                      </Button>
                    </div>
                  ) : (
                    <>
                      <Input
                        value={buscaRetorno}
                        onChange={(e) => setBuscaRetorno(e.target.value)}
                        placeholder="Buscar ex-jogador pelo nome"
                      />
                      {sugestoesRetorno.length > 0 ? (
                        <div className="grid gap-1">
                          {sugestoesRetorno.map((j) => (
                            <button
                              key={j.id}
                              type="button"
                              onClick={() => selecionarRetorno(j)}
                              className="rounded-lg border border-border px-3 py-2 text-left text-sm transition-colors hover:border-primary"
                            >
                              {j.nome}{" "}
                              <span className="text-xs text-muted-foreground">
                                {j.posicao_principal ?? ""} {j.overall ? `· ${j.overall}` : ""}
                              </span>
                            </button>
                          ))}
                        </div>
                      ) : null}
                      <Button variant="secondary" size="sm" onClick={() => setJogadorNovo(true)}>
                        É um jogador novo
                      </Button>
                    </>
                  )}
                </div>
              ) : null}

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
                <ClubAutocomplete
                  value={clubeContraparte}
                  onChange={setClubeContraparte}
                  placeholder="Nome do clube"
                />
              </div>

              {modalidade === "emprestimo" ? (
                <>
                  <div className="grid gap-1">
                    <Label>Duração (data de término)</Label>
                    <Input
                      type="date"
                      value={duracao}
                      onChange={(e) => setDuracao(e.target.value)}
                    />
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-border p-3">
                    <Label htmlFor="opcao-compra">Com opção de compra?</Label>
                    <Switch id="opcao-compra" checked={temOpcao} onCheckedChange={setTemOpcao} />
                  </div>
                  {temOpcao ? (
                    <>
                      <div className="grid gap-1">
                        <Label>Valor da opção de compra</Label>
                        <Input
                          type="number"
                          value={valorOpcao}
                          onChange={(e) => setValorOpcao(e.target.value)}
                          placeholder="0"
                        />
                      </div>
                      <div className="flex items-center justify-between rounded-lg border border-border p-3">
                        <Label htmlFor="obrigacao-compra">É obrigação de compra?</Label>
                        <Switch
                          id="obrigacao-compra"
                          checked={obrigacaoCompra}
                          onCheckedChange={setObrigacaoCompra}
                        />
                      </div>
                    </>
                  ) : null}
                </>
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

              <div className="grid gap-1">
                <Label>Data da negociação</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="date"
                    value={dataNeg}
                    onChange={(e) => definirData(e.target.value)}
                  />
                  {(["verao", "inverno"] as const).map((j) => (
                    <button
                      key={j}
                      type="button"
                      aria-label={`Janela de ${ROTULO_JANELA[j]}`}
                      title={`Janela de ${ROTULO_JANELA[j]}`}
                      onClick={() => {
                        setJanela(j);
                        setJanelaManual(true);
                      }}
                      className={cn(
                        "rounded-lg border px-3 py-2 text-lg transition-colors",
                        janela === j
                          ? "border-primary bg-primary/10"
                          : "border-border opacity-60 hover:opacity-100",
                      )}
                    >
                      {ICONE_JANELA[j]}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Janela definida automaticamente pelo mês — clique nos ícones para trocar.
                </p>
              </div>
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

      <Dialog open={editando !== null} onOpenChange={(v) => !v && setEditando(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar transferência</DialogTitle>
            <DialogDescription>{editando ? rotuloJogador(editando) : ""}</DialogDescription>
          </DialogHeader>
          {editando ? (
            <div className="grid gap-3">
              <div className="grid gap-1">
                <Label>Modalidade</Label>
                <Select
                  value={editando.modalidade ?? "definitiva"}
                  onValueChange={(v) => setEditando((p) => (p ? { ...p, modalidade: v } : p))}
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
                  value={editando.clube_contraparte ?? ""}
                  onChange={(v) => setEditando((p) => (p ? { ...p, clube_contraparte: v } : p))}
                />
              </div>
              <div className="grid gap-1">
                <Label>Valor</Label>
                <Input
                  type="number"
                  value={editando.valor ?? ""}
                  onChange={(e) =>
                    setEditando((p) =>
                      p
                        ? { ...p, valor: e.target.value === "" ? null : Number(e.target.value) }
                        : p,
                    )
                  }
                />
              </div>
              {editando.modalidade === "emprestimo" ? (
                <div className="grid gap-1">
                  <Label>Duração (data de término)</Label>
                  <Input
                    type="date"
                    value={editando.duracao_emprestimo ?? ""}
                    onChange={(e) =>
                      setEditando((p) => (p ? { ...p, duracao_emprestimo: e.target.value } : p))
                    }
                  />
                </div>
              ) : null}
              <div className="grid gap-1">
                <Label>Data da negociação</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="date"
                    value={editando.data.slice(0, 10)}
                    onChange={(e) =>
                      setEditando((p) =>
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
                      onClick={() => setEditando((p) => (p ? { ...p, janela: j } : p))}
                      className={cn(
                        "rounded-lg border px-3 py-2 text-lg transition-colors",
                        (editando.janela ?? janelaDoDia(editando.data.slice(0, 10))) === j
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
            <Button variant="ghost" onClick={() => setEditando(null)}>
              Cancelar
            </Button>
            <Button onClick={() => void salvarEdicao()} disabled={salvandoEdicao}>
              {salvandoEdicao ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={excluindo !== null} onOpenChange={(v) => !v && setExcluindo(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Excluir transferência</DialogTitle>
            <DialogDescription>
              A negociação será removida do histórico. Jogadores que saíram por ela voltam ao
              elenco.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setExcluindo(null)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={() => void excluirTransferencia()}>
              Excluir
            </Button>
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

      <JogadorFormDialog
        open={retornoAberto}
        onOpenChange={setRetornoAberto}
        titulo="Retorno ao clube"
        descricao="Confirme os dados atualizados do atleta que está voltando."
        valorInicial={cadastroInicial}
        salvando={salvandoCadastro}
        textoConfirmar="Reativar no elenco"
        onConfirmar={salvarRetornoJogador}
      />
    </AppShell>
  );
}
