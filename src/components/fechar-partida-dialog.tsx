import { useEffect, useMemo, useState } from "react";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ICONE_COMPETICAO } from "@/lib/match-data";
import { checarEventosPosPartida } from "@/lib/eventos";

export type PartidaBase = {
  id: string;
  data_hora: string | null;
  competicao: string | null;
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
};

type Jogador = { id: string; nome: string; posicao_principal: string | null; status: string | null };

type StatJogador = {
  clean_sheet: boolean;
  defesas: string;
  gols: string;
  xg: string;
  chutes: string;
  assistencias: string;
  xa: string;
  passes: string;
  passes_pct: string;
  desarmes: string;
  cartao_amarelo: boolean;
  cartao_vermelho: boolean;
  nota: string;
};

const STAT_VAZIA: StatJogador = {
  clean_sheet: false,
  defesas: "",
  gols: "",
  xg: "",
  chutes: "",
  assistencias: "",
  xa: "",
  passes: "",
  passes_pct: "",
  desarmes: "",
  cartao_amarelo: false,
  cartao_vermelho: false,
  nota: "",
};

const num = (v: string) => (v.trim() === "" ? null : Number(v));

export function FecharPartidaDialog({
  partida,
  saveId,
  clubeNome,
  aberto,
  onOpenChange,
  onSalvo,
}: {
  partida: PartidaBase | null;
  saveId: string;
  clubeNome: string | null;
  aberto: boolean;
  onOpenChange: (v: boolean) => void;
  onSalvo: () => void;
}) {
  const [jogadores, setJogadores] = useState<Jogador[]>([]);
  const [selecionados, setSelecionados] = useState<string[]>([]);
  const [stats, setStats] = useState<Record<string, StatJogador>>({});
  const [salvando, setSalvando] = useState(false);
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

    void (async () => {
      const [{ data: elenco }, { data: existentes }] = await Promise.all([
        supabase
          .from("players")
          .select("id, nome, posicao_principal, status")
          .eq("save_id", saveId)
          .order("nome"),
        supabase.from("match_player_stats").select("*").eq("match_id", partida.id),
      ]);

      setJogadores(
        ((elenco ?? []) as Jogador[]).filter(
          (j) => j.status === "Liberado" || j.status === "Convocado" || !j.status,
        ),
      );

      const mapa: Record<string, StatJogador> = {};
      const ids: string[] = [];
      type LinhaStat = {
        player_id: string | null;
        clean_sheet: boolean | null;
        defesas: number | null;
        gols: number | null;
        xg: number | null;
        chutes: number | null;
        assistencias: number | null;
        xa: number | null;
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
          clean_sheet: Boolean(s.clean_sheet),
          defesas: s.defesas?.toString() ?? "",
          gols: s.gols?.toString() ?? "",
          xg: s.xg?.toString() ?? "",
          chutes: s.chutes?.toString() ?? "",
          assistencias: s.assistencias?.toString() ?? "",
          xa: s.xa?.toString() ?? "",
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
    })();
  }, [aberto, partida, saveId]);

  const escalados = useMemo(
    () => jogadores.filter((j) => selecionados.includes(j.id)),
    [jogadores, selecionados],
  );

  function alternar(id: string) {
    setSelecionados((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
    );
    setStats((prev) => (prev[id] ? prev : { ...prev, [id]: { ...STAT_VAZIA } }));
  }

  function setStat(id: string, campo: keyof StatJogador, valor: string | boolean) {
    setStats((prev) => ({
      ...prev,
      [id]: { ...(prev[id] ?? STAT_VAZIA), [campo]: valor },
    }));
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
        const goleiro = j.posicao_principal === "GOL";
        return {
          match_id: partida.id,
          player_id: j.id,
          clean_sheet: goleiro ? s.clean_sheet : false,
          defesas: goleiro ? num(s.defesas) : null,
          gols: num(s.gols),
          xg: goleiro ? null : num(s.xg),
          chutes: goleiro ? null : num(s.chutes),
          assistencias: num(s.assistencias),
          xa: goleiro ? null : num(s.xa),
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

    void checarEventosPosPartida(saveId, partida.id);

    setSalvando(false);
    toast.success("Partida finalizada!");
    onOpenChange(false);
    onSalvo();
  }

  return (
    <Dialog open={aberto} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
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
          <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Escalação ({selecionados.length})
          </h3>
          {jogadores.length === 0 ? (
            <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
              Nenhum jogador disponível (status Liberado ou Convocado) no elenco.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {jogadores.map((j) => (
                <label
                  key={j.id}
                  className="flex cursor-pointer items-center gap-2 rounded-lg border p-2 text-sm transition-colors hover:bg-accent/40"
                >
                  <Checkbox
                    checked={selecionados.includes(j.id)}
                    onCheckedChange={() => alternar(j.id)}
                  />
                  <span className="truncate">
                    <span className="text-xs text-muted-foreground">
                      {j.posicao_principal ?? "—"}
                    </span>{" "}
                    {j.nome}
                  </span>
                </label>
              ))}
            </div>
          )}
        </section>

        {escalados.length > 0 ? (
          <section className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Estatísticas individuais
            </h3>
            {escalados.map((j) => {
              const s = stats[j.id] ?? STAT_VAZIA;
              const goleiro = j.posicao_principal === "GOL";
              const campos: [keyof StatJogador, string][] = goleiro
                ? [
                    ["defesas", "Defesas"],
                    ["passes", "Passes"],
                    ["passes_pct", "% passes"],
                    ["gols", "Gols"],
                    ["assistencias", "Assistências"],
                    ["nota", "Nota (0-10)"],
                  ]
                : [
                    ["gols", "Gols"],
                    ["xg", "xG"],
                    ["chutes", "Chutes"],
                    ["assistencias", "Assistências"],
                    ["xa", "xA"],
                    ["passes", "Passes"],
                    ["passes_pct", "% passes"],
                    ["desarmes", "Desarmes"],
                    ["nota", "Nota (0-10)"],
                  ];
              return (
                <div key={j.id} className="rounded-xl border p-3">
                  <p className="mb-2 font-semibold">
                    <span className="mr-2 rounded bg-primary/15 px-1.5 py-0.5 text-xs text-primary">
                      {j.posicao_principal ?? "—"}
                    </span>
                    {j.nome}
                  </p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {campos.map(([campo, rotulo]) => (
                      <div key={campo} className="space-y-1">
                        <Label htmlFor={`${j.id}-${campo}`} className="text-xs">
                          {rotulo}
                        </Label>
                        <Input
                          id={`${j.id}-${campo}`}
                          type="number"
                          step="any"
                          value={s[campo] as string}
                          onChange={(e) => setStat(j.id, campo, e.target.value)}
                        />
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-4">
                    {goleiro ? (
                      <label className="flex items-center gap-2 text-sm">
                        <Switch
                          checked={s.clean_sheet}
                          onCheckedChange={(v) => setStat(j.id, "clean_sheet", v)}
                        />
                        Clean sheet
                      </label>
                    ) : (
                      <>
                        <label className="flex items-center gap-2 text-sm">
                          <Switch
                            checked={s.cartao_amarelo}
                            onCheckedChange={(v) => setStat(j.id, "cartao_amarelo", v)}
                          />
                          🟨 Amarelo
                        </label>
                        <label className="flex items-center gap-2 text-sm">
                          <Switch
                            checked={s.cartao_vermelho}
                            onCheckedChange={(v) => setStat(j.id, "cartao_vermelho", v)}
                          />
                          🟥 Vermelho
                        </label>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
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
