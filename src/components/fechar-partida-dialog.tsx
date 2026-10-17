import { Collapse } from "@/components/motion";
import { ehGoleiro, posEn, GRUPOS_POSICAO, grupoDaPosicao } from "@/lib/posicoes";
import { Fragment, useEffect, useMemo, useState } from "react";
import { Camera, ChevronDown, ChevronRight, Loader2, Save, Star } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ICONE_COMPETICAO } from "@/lib/match-data";
import {
  montarPreenchimento,
  outroLado,
  reduzirImagem,
  type ExtracaoPartida,
  type Preenchimento,
} from "@/lib/partida-foto";
import { extrairPartidaDeFotos } from "@/lib/partida-foto.functions";

export type PartidaBase = {
  id: string;
  stint_id?: string | null;
  data_hora: string | null;
  competicao: string | null;
  fase?: string | null;
  adversario: string | null;
  status: string;
  placar_time: number | null;
  placar_adversario: number | null;
  posse: number | null;
  tempo_recuperacao: number | null;
  chutes: number | null;
  xg: number | null;
  passes: number | null;
  passes_pct: number | null;
  desarmes: number | null;
  cartoes_amarelos: number | null;
  cartoes_vermelhos: number | null;
  mvp_player_id?: string | null;
  mando?: string | null;
  gols_adversario_detalhe?: string | null;
};

type Jogador = {
  id: string;
  nome: string;
  posicao_principal: string | null;
  status: string | null;
  overall: number | null;
};

type StatJogador = {
  titular: boolean;
  clean_sheet: boolean;
  defesas: string;
  gols: string;
  chutes: string;
  assistencias: string;
  passes: string;
  passes_pct: string;
  desarmes: string;
  cartao_amarelo: boolean;
  cartao_vermelho: boolean;
  nota: string;
};

const STAT_VAZIA: StatJogador = {
  titular: true,
  clean_sheet: false,
  defesas: "",
  gols: "",
  chutes: "",
  assistencias: "",
  passes: "",
  passes_pct: "",
  desarmes: "",
  cartao_amarelo: false,
  cartao_vermelho: false,
  nota: "",
};

const CAMPOS_NUMERICOS: (keyof StatJogador)[] = [
  "defesas",
  "gols",
  "chutes",
  "assistencias",
  "passes",
  "passes_pct",
  "desarmes",
];

const num = (v: string) => (v.trim() === "" ? null : Number(v));

function StatInput({
  id,
  valor,
  onChange,
  larguraClasse = "w-16",
}: {
  id: string;
  valor: string;
  onChange: (v: string) => void;
  larguraClasse?: string;
}) {
  return (
    <Input
      id={id}
      type="number"
      step="any"
      className={`h-8 ${larguraClasse} px-2 text-center text-sm`}
      value={valor}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

export function FecharPartidaDialog({
  partida,
  saveId,
  stintId,
  clubeNome,
  aberto,
  marcarEditadoAposArquivamento = false,
  extracaoInicial = null,
  onOpenChange,
  onSalvo,
}: {
  partida: PartidaBase | null;
  saveId: string;
  stintId?: string | null;
  clubeNome: string | null;
  aberto: boolean;
  marcarEditadoAposArquivamento?: boolean;
  /** Leitura de fotos já feita (fluxo "Registrar por foto"): preenche o formulário ao abrir. */
  extracaoInicial?: ExtracaoPartida | null;
  onOpenChange: (v: boolean) => void;
  onSalvo: () => void;
}) {
  const [importando, setImportando] = useState(false);
  const [extracao, setExtracao] = useState<ExtracaoPartida | null>(null);
  const [importado, setImportado] = useState<Preenchimento | null>(null);

  const [jogadores, setJogadores] = useState<Jogador[]>([]);
  const [selecionados, setSelecionados] = useState<string[]>([]);
  const [stats, setStats] = useState<Record<string, StatJogador>>({});
  const [salvando, setSalvando] = useState(false);
  const [gruposAbertos, setGruposAbertos] = useState<string[]>(
    GRUPOS_POSICAO.map((g) => g.chave),
  );
  const [linhasAbertas, setLinhasAbertas] = useState<string[]>([]);
  const [mvp, setMvp] = useState<string>("");
  const [mvpTocado, setMvpTocado] = useState(false);
  const [jogo, setJogo] = useState({
    placar_time: "",
    placar_adversario: "",
    posse: "",
    tempo_recuperacao: "",
    chutes: "",
    xg: "",
    passes: "",
    passes_pct: "",
    desarmes: "",
    cartoes_amarelos: "",
    cartoes_vermelhos: "",
  });

  useEffect(() => {
    if (!aberto || !partida) return;
    setJogo({
      placar_time: partida.placar_time?.toString() ?? "",
      placar_adversario: partida.placar_adversario?.toString() ?? "",
      posse: partida.posse?.toString() ?? "",
      tempo_recuperacao: partida.tempo_recuperacao?.toString() ?? "",
      chutes: partida.chutes?.toString() ?? "",
      xg: partida.xg?.toString() ?? "",
      passes: partida.passes?.toString() ?? "",
      passes_pct: partida.passes_pct?.toString() ?? "",
      desarmes: partida.desarmes?.toString() ?? "",
      cartoes_amarelos: partida.cartoes_amarelos?.toString() ?? "",
      cartoes_vermelhos: partida.cartoes_vermelhos?.toString() ?? "",
    });
    setMvp(partida.mvp_player_id ?? "");
    setMvpTocado(Boolean(partida.mvp_player_id));
    setLinhasAbertas([]);

    void (async () => {
      const [{ data: elenco }, { data: existentes }] = await Promise.all([
        supabase
          .from("players")
          .select("id, nome, posicao_principal, status, overall")
          .eq("stint_id", partida.stint_id ?? stintId ?? "00000000-0000-0000-0000-000000000000")
          .order("nome"),
        supabase.from("match_player_stats").select("*").eq("match_id", partida.id),
      ]);

      const lista = ((elenco ?? []) as Jogador[]).filter(
        (j) => marcarEditadoAposArquivamento || j.status === "Liberado" || j.status === "Convocado" || !j.status,
      );
      setJogadores(lista);

      const mapa: Record<string, StatJogador> = {};
      const ids: string[] = [];
      type LinhaStat = {
        player_id: string | null;
        titular: boolean | null;
        clean_sheet: boolean | null;
        defesas: number | null;
        gols: number | null;
        chutes: number | null;
        assistencias: number | null;
        passes: number | null;
        passes_pct: number | null;
        desarmes: number | null;
        cartao_amarelo: boolean | null;
        cartao_vermelho: boolean | null;
        nota: number | null;
      };
      for (const s of (existentes ?? []) as unknown as LinhaStat[]) {
        const pid = s.player_id;
        if (!pid) continue;
        ids.push(pid);
        mapa[pid] = {
          titular: s.titular ?? true,
          clean_sheet: Boolean(s.clean_sheet),
          defesas: s.defesas?.toString() ?? "",
          gols: s.gols?.toString() ?? "",
          chutes: s.chutes?.toString() ?? "",
          assistencias: s.assistencias?.toString() ?? "",
          passes: s.passes?.toString() ?? "",
          passes_pct: s.passes_pct?.toString() ?? "",
          desarmes: s.desarmes?.toString() ?? "",
          cartao_amarelo: Boolean(s.cartao_amarelo),
          cartao_vermelho: Boolean(s.cartao_vermelho),
          nota: s.nota?.toString() ?? "",
        };
      }

      setSelecionados(ids);
      setStats(mapa);
      setExtracao(null);
      setImportado(null);

      // Fluxo "Registrar por foto": aplica a leitura sobre o que já estava salvo.
      if (extracaoInicial) {
        const res = montarPreenchimento({
          extracao: extracaoInicial,
          elenco: lista,
          meuClube: clubeNome,
          adversario: partida.adversario,
          mando: partida.mando,
          ehGoleiro,
        });
        setExtracao(extracaoInicial);
        aplicarPreenchimento(res, mapa, ids);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto, partida, saveId, stintId, marcarEditadoAposArquivamento, extracaoInicial]);

  const escalados = useMemo(
    () => jogadores.filter((j) => selecionados.includes(j.id)),
    [jogadores, selecionados],
  );
  const goleiros = useMemo(
    () => escalados.filter((j) => ehGoleiro(j.posicao_principal)),
    [escalados],
  );
  const linha = useMemo(
    () => escalados.filter((j) => !ehGoleiro(j.posicao_principal)),
    [escalados],
  );

  const sugestaoMvp = useMemo(() => {
    let melhor: { id: string; nota: number } | null = null;
    for (const j of escalados) {
      const n = Number(stats[j.id]?.nota ?? "");
      if (!Number.isFinite(n) || (stats[j.id]?.nota ?? "") === "") continue;
      if (!melhor || n > melhor.nota) melhor = { id: j.id, nota: n };
    }
    return melhor?.id ?? "";
  }, [escalados, stats]);

  useEffect(() => {
    if (!mvpTocado && sugestaoMvp) setMvp(sugestaoMvp);
  }, [sugestaoMvp, mvpTocado]);

  /** Aplica no formulário o que foi lido das fotos. O usuário confere e salva. */
  function aplicarPreenchimento(
    res: Preenchimento,
    baseStats?: Record<string, StatJogador>,
    baseIds?: string[],
  ) {
    setJogo((prev) => ({ ...prev, ...res.jogo }));
    const novosIds = Object.keys(res.jogadores);
    setSelecionados((prev) => Array.from(new Set([...(baseIds ?? prev), ...novosIds])));
    setStats((prev) => {
      const base = baseStats ?? prev;
      const proximo = { ...base };
      for (const [id, s] of Object.entries(res.jogadores)) {
        proximo[id] = {
          ...STAT_VAZIA,
          ...(base[id] ?? {}),
          titular: s.titular,
          gols: s.gols,
          assistencias: s.assistencias,
          nota: s.nota,
          ...(s.clean_sheet !== undefined ? { clean_sheet: s.clean_sheet } : {}),
          ...(s.defesas !== undefined ? { defesas: s.defesas } : {}),
        };
      }
      return proximo;
    });
    if (res.mvpId) {
      setMvp(res.mvpId);
      setMvpTocado(true);
    }
    setImportado(res);
  }

  async function importarFotos(arquivos: FileList | null) {
    if (!arquivos || arquivos.length === 0 || !partida) return;
    if (arquivos.length > 4) {
      toast.error("Envie no máximo 4 fotos por vez.");
      return;
    }
    setImportando(true);
    try {
      const imagens = await Promise.all(Array.from(arquivos).map((f) => reduzirImagem(f)));
      const lida = await extrairPartidaDeFotos({ data: { imagens } });
      setExtracao(lida);
      const res = montarPreenchimento({
        extracao: lida,
        elenco: jogadores,
        meuClube: clubeNome,
        adversario: partida.adversario,
        mando: partida.mando,
        ehGoleiro,
      });
      aplicarPreenchimento(res);
      toast.success("Fotos lidas! Confira os dados e salve.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível ler as fotos.");
    }
    setImportando(false);
  }

  function inverterLados() {
    if (!extracao || !importado) return;
    const res = montarPreenchimento({
      extracao,
      elenco: jogadores,
      meuClube: clubeNome,
      adversario: partida?.adversario,
      mando: partida?.mando,
      ehGoleiro,
      lado: outroLado(importado.lado),
    });
    aplicarPreenchimento(res);
  }

  function alternar(id: string) {
    setSelecionados((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));
    setStats((prev) => (prev[id] ? prev : { ...prev, [id]: { ...STAT_VAZIA } }));
  }

  function setStat(id: string, campo: keyof StatJogador, valor: string | boolean) {
    setStats((prev) => ({
      ...prev,
      [id]: { ...(prev[id] ?? STAT_VAZIA), [campo]: valor },
    }));
  }

  function alternarGrupo(chave: string) {
    setGruposAbertos((prev) =>
      prev.includes(chave) ? prev.filter((c) => c !== chave) : [...prev, chave],
    );
  }

  function alternarLinha(id: string) {
    setLinhasAbertas((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id],
    );
  }

  function aplicarNotaPadrao() {
    setStats((prev) => {
      const proximo = { ...prev };
      for (const j of escalados) {
        proximo[j.id] = { ...(proximo[j.id] ?? STAT_VAZIA), nota: "6.0" };
      }
      return proximo;
    });
    toast.success("Nota 6.0 aplicada a todos os escalados.");
  }

  function zerarEstatisticas() {
    setStats((prev) => {
      const proximo = { ...prev };
      for (const j of escalados) {
        const atual = { ...(proximo[j.id] ?? STAT_VAZIA) } as Record<string, unknown>;
        for (const campo of CAMPOS_NUMERICOS) {
          if (String(atual[campo] ?? "").trim() === "") atual[campo] = "0";
        }
        proximo[j.id] = atual as unknown as StatJogador;
      }
      return proximo;
    });
    toast.success("Campos numéricos vazios preenchidos com 0.");
  }

  async function salvar() {
    if (!partida) return;
    if (jogo.placar_time === "" || jogo.placar_adversario === "") {
      toast.error("Informe o placar final.");
      return;
    }
    setSalvando(true);

    const { error: errMatch } = await supabase
      .from("matches")
      .update({
        status: "finalizada",
        placar_time: Number(jogo.placar_time),
        placar_adversario: Number(jogo.placar_adversario),
        posse: num(jogo.posse),
        tempo_recuperacao: num(jogo.tempo_recuperacao),
        chutes: num(jogo.chutes),
        xg: num(jogo.xg),
        passes: num(jogo.passes),
        passes_pct: num(jogo.passes_pct),
        desarmes: num(jogo.desarmes),
        cartoes_amarelos: num(jogo.cartoes_amarelos),
        cartoes_vermelhos: num(jogo.cartoes_vermelhos),
        mvp_player_id: mvp && selecionados.includes(mvp) ? mvp : null,
        ...(marcarEditadoAposArquivamento ? { editado_apos_arquivamento: true } : {}),
      })
      .eq("id", partida.id);

    if (errMatch) {
      setSalvando(false);
      toast.error("Erro ao salvar a partida.");
      return;
    }

    await supabase.from("match_player_stats").delete().eq("match_id", partida.id);

    if (escalados.length > 0) {
      const linhas = escalados.map((j) => {
        const s = stats[j.id] ?? STAT_VAZIA;
        const goleiro = ehGoleiro(j.posicao_principal);
        return {
          match_id: partida.id,
          player_id: j.id,
          titular: s.titular,
          clean_sheet: goleiro ? s.clean_sheet : false,
          defesas: goleiro ? num(s.defesas) : null,
          gols: num(s.gols),
          chutes: goleiro ? null : num(s.chutes),
          assistencias: num(s.assistencias),
          passes: num(s.passes),
          passes_pct: num(s.passes_pct),
          desarmes: goleiro ? null : num(s.desarmes),
          cartao_amarelo: goleiro ? false : s.cartao_amarelo,
          cartao_vermelho: goleiro ? false : s.cartao_vermelho,
          nota: num(s.nota),
        };
      });
      const { error } = await supabase.from("match_player_stats").insert(linhas);
      if (error) {
        setSalvando(false);
        toast.error("Partida salva, mas houve erro nas estatísticas dos jogadores.");
        onSalvo();
        return;
      }
    }

    setSalvando(false);
    toast.success("Partida finalizada!");
    onOpenChange(false);
    onSalvo();
  }

  return (
    <Dialog open={aberto} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>
            {ICONE_COMPETICAO[partida?.competicao ?? ""] ?? "⚽"} {clubeNome ?? "Meu clube"} x{" "}
            {partida?.adversario}
          </DialogTitle>
          <DialogDescription>
            {partida?.competicao ?? "Partida"}
            {partida?.data_hora
              ? ` · ${new Date(partida.data_hora).toLocaleDateString("pt-BR")}`
              : ""}
          </DialogDescription>
        </DialogHeader>

        <section className="space-y-3 rounded-xl border border-primary/40 bg-primary/5 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Preencher por foto
              </h3>
              <p className="text-xs text-muted-foreground">
                Fotografe as telas de Resumo e Desempenho individual (até 4 fotos). Você confere
                tudo antes de salvar.
              </p>
            </div>
            <label>
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                disabled={importando}
                onChange={(e) => {
                  void importarFotos(e.target.files);
                  e.target.value = "";
                }}
              />
              <Button asChild variant="secondary" disabled={importando}>
                <span className="cursor-pointer">
                  {importando ? (
                    <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                  ) : (
                    <Camera className="mr-1 h-4 w-4" />
                  )}
                  {importando ? "Lendo fotos…" : "Escolher fotos"}
                </span>
              </Button>
            </label>
          </div>
          {importado ? (
            <div className="space-y-1 text-xs">
              <p>
                Reconhecidos: {Object.keys(importado.jogadores).length} jogador(es) · lado do seu
                clube: <span className="font-semibold">{importado.lado}</span>
                {importado.adversarioLido ? ` · adversário lido: ${importado.adversarioLido}` : ""}
              </p>
              {!importado.ladoConfiavel ? (
                <p className="text-warning">
                  Não deu para confirmar qual lado é o seu clube. Se o placar ficou invertido, use
                  o botão abaixo.
                </p>
              ) : null}
              {importado.naoEncontrados.length > 0 ? (
                <p className="text-warning">
                  Não encontrados no elenco: {importado.naoEncontrados.join(", ")}. Marque-os na
                  escalação, se for o caso.
                </p>
              ) : null}
              {Object.keys(importado.jogadores).length === 0 ? (
                <p className="text-warning">
                  Nenhum jogador do seu elenco foi reconhecido. As fotos de Desempenho individual
                  são do seu time?
                </p>
              ) : null}
              <Button type="button" variant="outline" size="sm" onClick={inverterLados}>
                Inverter lados
              </Button>
            </div>
          ) : null}
        </section>

        <Separator />

        <section className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Placar final
          </h3>
          <div className="flex items-center justify-center gap-4">
            <Input
              aria-label="Gols do meu clube"
              type="number"
              className="h-16 w-24 text-center text-3xl font-bold"
              value={jogo.placar_time}
              onChange={(e) => setJogo({ ...jogo, placar_time: e.target.value })}
            />
            <span className="text-2xl text-muted-foreground">x</span>
            <Input
              aria-label="Gols do adversário"
              type="number"
              className="h-16 w-24 text-center text-3xl font-bold"
              value={jogo.placar_adversario}
              onChange={(e) => setJogo({ ...jogo, placar_adversario: e.target.value })}
            />
          </div>
        </section>

        <Separator />

        <section className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Números do jogo
          </h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {(
              [
                ["posse", "Posse de bola (%)"],
                ["tempo_recuperacao", "Tempo de recuperação"],
                ["chutes", "Chutes"],
                ["xg", "xG"],
                ["passes", "Passes"],
                ["passes_pct", "% acerto de passes"],
                ["desarmes", "Desarmes"],
                ["cartoes_amarelos", "Cartões amarelos"],
                ["cartoes_vermelhos", "Cartões vermelhos"],
              ] as const
            ).map(([campo, rotulo]) => (
              <div key={campo} className="space-y-1">
                <Label htmlFor={`jogo-${campo}`} className="text-xs">
                  {rotulo}
                </Label>
                <Input
                  id={`jogo-${campo}`}
                  type="number"
                  step="any"
                  value={jogo[campo]}
                  onChange={(e) => setJogo({ ...jogo, [campo]: e.target.value })}
                />
              </div>
            ))}
          </div>
        </section>

        <Separator />

        <section className="space-y-3">
          <div className="sticky top-0 z-10 -mx-1 flex items-center justify-between gap-2 bg-background/95 px-1 py-2 backdrop-blur">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Escalação
            </h3>
            <span className="rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold text-primary">
              {selecionados.length} selecionado(s)
            </span>
          </div>

          {jogadores.length === 0 ? (
            <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
              Nenhum jogador disponível (status Liberado ou Convocado) no elenco.
            </p>
          ) : (
            <div className="space-y-2">
              {GRUPOS_POSICAO.map((grupo) => {
                const doGrupo = jogadores.filter(
                  (j) => grupoDaPosicao(j.posicao_principal) === grupo.chave,
                );
                if (doGrupo.length === 0) return null;
                const abertoGrupo = gruposAbertos.includes(grupo.chave);
                const marcados = doGrupo.filter((j) => selecionados.includes(j.id)).length;
                return (
                  <div key={grupo.chave} className="rounded-xl border">
                    <button
                      type="button"
                      onClick={() => alternarGrupo(grupo.chave)}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-semibold"
                    >
                      {abertoGrupo ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                      {grupo.rotulo}
                      <span className="text-xs font-normal text-muted-foreground">
                        ({marcados}/{doGrupo.length})
                      </span>
                    </button>
                    <Collapse aberto={abertoGrupo}>
                      <div className="grid gap-2 border-t p-3 sm:grid-cols-2">
                        {doGrupo.map((j) => {
                          const marcado = selecionados.includes(j.id);
                          return (
                            <div
                              key={j.id}
                              className="flex items-center gap-2 rounded-lg border p-2 text-sm"
                            >
                              <Checkbox
                                checked={marcado}
                                onCheckedChange={() => alternar(j.id)}
                                aria-label={`Jogou: ${j.nome}`}
                              />
                              <span className="truncate">
                                <span className="text-xs text-muted-foreground">
                                  {posEn(j.posicao_principal) ?? "—"}
                                </span>{" "}
                                {j.nome}
                                <span className="ml-1 text-xs text-muted-foreground">
                                  ({j.overall ?? "—"})
                                </span>
                              </span>
                              {marcado ? (
                                <label className="ml-auto flex shrink-0 items-center gap-1.5 text-[11px] text-muted-foreground">
                                  <Switch
                                    checked={!(stats[j.id]?.titular ?? true)}
                                    onCheckedChange={(v) => setStat(j.id, "titular", !v)}
                                  />
                                  Entrou do banco
                                </label>
                              ) : null}
                            </div>
                          );
                        })}
                      </div>
                    </Collapse>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {escalados.length > 0 ? (
          <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Estatísticas individuais
              </h3>
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={aplicarNotaPadrao}>
                  Aplicar nota 6.0 a todos
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={zerarEstatisticas}>
                  Zerar estatísticas
                </Button>
              </div>
            </div>

            {goleiros.length > 0 ? (
              <div className="overflow-x-auto rounded-xl border border-primary/40 bg-primary/5">
                <table className="w-full text-sm">
                  <thead className="text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 text-left">Goleiro</th>
                      <th className="px-2 py-2">Clean sheet</th>
                      <th className="px-2 py-2">Defesas</th>
                      <th className="px-2 py-2">Passes</th>
                      <th className="px-2 py-2">% passes</th>
                      <th className="px-2 py-2">Gols</th>
                      <th className="px-2 py-2">Assist.</th>
                      <th className="px-2 py-2">Nota</th>
                    </tr>
                  </thead>
                  <tbody>
                    {goleiros.map((j) => {
                      const s = stats[j.id] ?? STAT_VAZIA;
                      return (
                        <tr key={j.id} className="border-t">
                          <td className="px-3 py-2">
                            <span className="font-semibold">{j.nome}</span>
                            {mvp === j.id ? (
                              <Star className="ml-1 inline h-3.5 w-3.5 fill-accent text-accent" />
                            ) : null}
                            {!s.titular ? (
                              <span className="ml-1 text-[10px] text-muted-foreground">
                                (banco)
                              </span>
                            ) : null}
                          </td>
                          <td className="px-2 py-2 text-center">
                            <Switch
                              checked={s.clean_sheet}
                              onCheckedChange={(v) => setStat(j.id, "clean_sheet", v)}
                              aria-label={`Clean sheet de ${j.nome}`}
                            />
                          </td>
                          {(
                            [
                              "defesas",
                              "passes",
                              "passes_pct",
                              "gols",
                              "assistencias",
                              "nota",
                            ] as const
                          ).map((campo) => (
                            <td key={campo} className="px-2 py-2 text-center">
                              <StatInput
                                id={`${j.id}-${campo}`}
                                valor={s[campo] as string}
                                onChange={(v) => setStat(j.id, campo, v)}
                              />
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : null}

            {linha.length > 0 ? (
              <div className="overflow-x-auto rounded-xl border">
                <table className="w-full text-sm">
                  <thead className="text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="w-8 px-2 py-2" />
                      <th className="px-3 py-2 text-left">Jogador</th>
                      <th className="px-2 py-2">Pos.</th>
                      <th className="px-2 py-2">Gols</th>
                      <th className="px-2 py-2">Assist.</th>
                      <th className="px-2 py-2">🟨</th>
                      <th className="px-2 py-2">🟥</th>
                      <th className="px-2 py-2">Nota</th>
                    </tr>
                  </thead>
                  <tbody>
                    {linha.map((j) => {
                      const s = stats[j.id] ?? STAT_VAZIA;
                      const expandido = linhasAbertas.includes(j.id);
                      return (
                        <Fragment key={j.id}>
                          <tr className={`border-t ${mvp === j.id ? "bg-accent/10" : ""}`}>
                            <td className="px-2 py-2">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                aria-label={`Detalhar ${j.nome}`}
                                onClick={() => alternarLinha(j.id)}
                              >
                                {expandido ? (
                                  <ChevronDown className="h-4 w-4" />
                                ) : (
                                  <ChevronRight className="h-4 w-4" />
                                )}
                              </Button>
                            </td>
                            <td className="px-3 py-2">
                              <span className="font-medium">{j.nome}</span>
                              {mvp === j.id ? (
                                <Star className="ml-1 inline h-3.5 w-3.5 fill-accent text-accent" />
                              ) : null}
                              {!s.titular ? (
                                <span className="ml-1 text-[10px] text-muted-foreground">
                                  (banco)
                                </span>
                              ) : null}
                            </td>
                            <td className="px-2 py-2 text-center text-xs text-muted-foreground">
                              {posEn(j.posicao_principal) ?? "—"}
                            </td>
                            {(["gols", "assistencias"] as const).map((campo) => (
                              <td key={campo} className="px-2 py-2 text-center">
                                <StatInput
                                  id={`${j.id}-${campo}`}
                                  valor={s[campo] as string}
                                  onChange={(v) => setStat(j.id, campo, v)}
                                />
                              </td>
                            ))}
                            <td className="px-2 py-2 text-center">
                              <Switch
                                checked={s.cartao_amarelo}
                                onCheckedChange={(v) => setStat(j.id, "cartao_amarelo", v)}
                                aria-label={`Cartão amarelo de ${j.nome}`}
                              />
                            </td>
                            <td className="px-2 py-2 text-center">
                              <Switch
                                checked={s.cartao_vermelho}
                                onCheckedChange={(v) => setStat(j.id, "cartao_vermelho", v)}
                                aria-label={`Cartão vermelho de ${j.nome}`}
                              />
                            </td>
                            <td className="px-2 py-2 text-center">
                              <StatInput
                                id={`${j.id}-nota`}
                                valor={s.nota}
                                onChange={(v) => setStat(j.id, "nota", v)}
                              />
                            </td>
                          </tr>
                          <tr className="border-t bg-muted/30">
                              <td colSpan={8} className="p-0">
                                <Collapse aberto={expandido}>
                                <div className="grid px-3 py-3 grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                                  {(
                                    [
                                      ["chutes", "Chutes"],
                                      ["passes", "Passes"],
                                      ["passes_pct", "% passes"],
                                      ["desarmes", "Desarmes"],
                                    ] as const
                                  ).map(([campo, rotulo]) => (
                                    <div key={campo} className="space-y-1">
                                      <Label htmlFor={`${j.id}-${campo}`} className="text-xs">
                                        {rotulo}
                                      </Label>
                                      <StatInput
                                        id={`${j.id}-${campo}`}
                                        valor={s[campo] as string}
                                        onChange={(v) => setStat(j.id, campo, v)}
                                        larguraClasse="w-full"
                                      />
                                    </div>
                                  ))}
                                </div>
                                </Collapse>
                              </td>
                            </tr>
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : null}

            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-accent/40 bg-accent/10 p-3">
              <Star className="h-4 w-4 text-accent" />
              <Label htmlFor="mvp-partida" className="text-sm font-semibold">
                Craque da partida (MVP)
              </Label>
              <Select
                value={mvp}
                onValueChange={(v) => {
                  setMvpTocado(true);
                  setMvp(v);
                }}
              >
                <SelectTrigger id="mvp-partida" className="w-full sm:w-72">
                  <SelectValue placeholder="Selecione o MVP" />
                </SelectTrigger>
                <SelectContent>
                  {escalados.map((j) => (
                    <SelectItem key={j.id} value={j.id}>
                      {j.nome}
                      {stats[j.id]?.nota ? ` · nota ${stats[j.id]?.nota}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {sugestaoMvp && mvp === sugestaoMvp ? (
                <span className="text-xs text-muted-foreground">Sugerido pela maior nota</span>
              ) : null}
            </div>
          </section>
        ) : null}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={() => void salvar()} disabled={salvando}>
            {salvando ? (
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-1 h-4 w-4" />
            )}
            Salvar partida
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
