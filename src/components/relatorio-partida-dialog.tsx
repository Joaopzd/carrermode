import { useEffect, useState } from "react";
import { Pencil, Save, Star, Square } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ClubBadge } from "@/components/club-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ICONE_COMPETICAO } from "@/lib/match-data";
import type { PartidaBase } from "@/components/fechar-partida-dialog";
import { cn } from "@/lib/utils";

type LinhaStat = {
  player_id: string | null;
  gols: number | null;
  assistencias: number | null;
  cartao_amarelo: boolean;
  cartao_vermelho: boolean;
  nota: number | null;
  nome: string;
  posicao: string | null;
};

type Props = {
  partida: PartidaBase | null;
  clubeNome?: string | null;
  escudoClube?: string | null;
  aberto: boolean;
  onOpenChange: (v: boolean) => void;
  onEditar: (p: PartidaBase) => void;
  onAtualizado?: () => void;
};

const num = (v: number | null | undefined, sufixo = "") => (v == null ? "—" : `${v}${sufixo}`);

/** Visão de leitura de uma partida finalizada: placar, goleadores, números e notas. */
export function RelatorioPartidaDialog({
  partida,
  clubeNome,
  escudoClube,
  aberto,
  onOpenChange,
  onEditar,
  onAtualizado,
}: Props) {
  const [stats, setStats] = useState<LinhaStat[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [golsAdv, setGolsAdv] = useState("");
  const [salvandoGols, setSalvandoGols] = useState(false);

  useEffect(() => {
    if (!partida || !aberto) return;
    setGolsAdv(partida.gols_adversario_detalhe ?? "");
    setCarregando(true);
    void (async () => {
      const { data } = await supabase
        .from("match_player_stats")
        .select("player_id, gols, assistencias, cartao_amarelo, cartao_vermelho, nota")
        .eq("match_id", partida.id);
      const linhas = (data ?? []) as Omit<LinhaStat, "nome" | "posicao">[];
      const ids = linhas.map((l) => l.player_id).filter((x): x is string => Boolean(x));
      let mapa: Record<string, { nome: string; posicao_principal: string | null }> = {};
      if (ids.length > 0) {
        const { data: jogadores } = await supabase
          .from("players")
          .select("id, nome, posicao_principal")
          .in("id", ids);
        mapa = Object.fromEntries(
          ((jogadores ?? []) as { id: string; nome: string; posicao_principal: string | null }[]).map(
            (j) => [j.id, { nome: j.nome, posicao_principal: j.posicao_principal }],
          ),
        );
      }
      const completas: LinhaStat[] = linhas.map((l) => ({
        ...l,
        nome: (l.player_id && mapa[l.player_id]?.nome) || "Jogador",
        posicao: (l.player_id && mapa[l.player_id]?.posicao_principal) || null,
      }));
      completas.sort((a, b) => (b.nota ?? -1) - (a.nota ?? -1));
      setStats(completas);
      setCarregando(false);
    })();
  }, [partida, aberto]);

  async function salvarGolsAdversario() {
    if (!partida) return;
    setSalvandoGols(true);
    const { error } = await supabase
      .from("matches")
      .update({ gols_adversario_detalhe: golsAdv.trim() || null })
      .eq("id", partida.id);
    setSalvandoGols(false);
    if (error) {
      toast.error("Não foi possível salvar os goleadores do adversário.");
      return;
    }
    toast.success("Goleadores do adversário salvos.");
    onAtualizado?.();
  }

  const goleadores = stats.filter((s) => (s.gols ?? 0) > 0);
  const numeros: [string, string][] = partida
    ? [
        ["Posse", num(partida.posse, "%")],
        ["Tempo de recuperação", num(partida.tempo_recuperacao, "s")],
        ["Chutes", num(partida.chutes)],
        ["xG", num(partida.xg)],
        ["Passes", num(partida.passes)],
        ["% acerto de passes", num(partida.passes_pct, "%")],
        ["Desarmes", num(partida.desarmes)],
        ["Cartões amarelos", num(partida.cartoes_amarelos)],
        ["Cartões vermelhos", num(partida.cartoes_vermelhos)],
      ]
    : [];

  return (
    <Dialog open={aberto} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Relatório da partida</DialogTitle>
          <DialogDescription>
            {partida ? `${ICONE_COMPETICAO[partida.competicao ?? ""] ?? "⚽"} ${partida.competicao ?? "—"}` : ""}
          </DialogDescription>
        </DialogHeader>

        {partida ? (
          <div className="space-y-6">
            <div className="rounded-xl border border-border bg-muted/30 p-4 text-center">
              <div className="flex items-center justify-center gap-4">
                <ClubBadge
                  nome={clubeNome}
                  escudoUrl={escudoClube}
                  tamanho="lg"
                  semNome
                  className="shrink-0"
                />
                <p className="font-display text-4xl tracking-wide">
                  {partida.placar_time ?? 0} <span className="text-muted-foreground">x</span>{" "}
                  {partida.placar_adversario ?? 0}
                </p>
                <ClubBadge nome={partida.adversario} tamanho="lg" semNome className="shrink-0" />
              </div>
              <div className="mt-2 flex flex-wrap items-center justify-center gap-x-3 text-xs text-muted-foreground">
                <span className="font-medium">{clubeNome ?? "Meu clube"}</span>
                <span>vs</span>
                <span className="font-medium">{partida.adversario ?? "—"}</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {partida.competicao ?? "—"}
                {partida.fase ? ` · ${partida.fase}` : ""}
                {partida.data_hora
                  ? ` · ${new Date(partida.data_hora).toLocaleDateString("pt-BR")}`
                  : ""}
              </p>
            </div>

            <section className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Goleadores · {clubeNome ?? "Meu clube"}
                </h3>
                {carregando ? (
                  <Skeleton className="h-16 w-full rounded-lg" />
                ) : goleadores.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sem gols registrados.</p>
                ) : (
                  <ul className="space-y-1 text-sm">
                    {goleadores.map((g) => (
                      <li key={g.player_id ?? g.nome}>
                        ⚽ {g.nome}
                        {(g.gols ?? 0) > 1 ? ` (${g.gols})` : ""}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Goleadores · {partida.adversario ?? "Adversário"}
                </h3>
                <div className="space-y-2">
                  <Label htmlFor="gols-adv" className="text-xs text-muted-foreground">
                    Gols do adversário (opcional)
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="gols-adv"
                      value={golsAdv}
                      placeholder="Ex.: Haaland (2), Foden"
                      onChange={(e) => setGolsAdv(e.target.value)}
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      aria-label="Salvar goleadores do adversário"
                      disabled={salvandoGols}
                      onClick={() => void salvarGolsAdversario()}
                    >
                      <Save className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </section>

            <Separator />

            <section className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Números do jogo
              </h3>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {numeros.map(([rot, val]) => (
                  <div key={rot} className="rounded-lg border border-border px-3 py-2">
                    <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
                      {rot}
                    </p>
                    <p className="font-display text-xl">{val}</p>
                  </div>
                ))}
              </div>
            </section>

            <Separator />

            <section className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Notas dos jogadores
              </h3>
              {carregando ? (
                <Skeleton className="h-40 w-full rounded-lg" />
              ) : stats.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nenhuma estatística individual registrada.
                </p>
              ) : (
                <div className="overflow-hidden rounded-lg border border-border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Jogador</TableHead>
                        <TableHead>Pos.</TableHead>
                        <TableHead className="text-right">G</TableHead>
                        <TableHead className="text-right">A</TableHead>
                        <TableHead className="text-center">Cartões</TableHead>
                        <TableHead className="text-right">Nota</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stats.map((s) => {
                        const mvp = !!s.player_id && s.player_id === partida.mvp_player_id;
                        return (
                          <TableRow
                            key={s.player_id ?? s.nome}
                            className={cn(mvp && "bg-accent/10")}
                          >
                            <TableCell className="font-medium">
                              <span className="flex items-center gap-1.5">
                                {mvp ? (
                                  <Star className="h-3.5 w-3.5 fill-accent text-accent" />
                                ) : null}
                                {s.nome}
                              </span>
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {s.posicao ?? "—"}
                            </TableCell>
                            <TableCell className="text-right">{s.gols ?? 0}</TableCell>
                            <TableCell className="text-right">{s.assistencias ?? 0}</TableCell>
                            <TableCell>
                              <span className="flex items-center justify-center gap-1">
                                {s.cartao_amarelo ? (
                                  <Square
                                    aria-label="Cartão amarelo"
                                    className="h-3.5 w-3.5 fill-amber-400 text-amber-400"
                                  />
                                ) : null}
                                {s.cartao_vermelho ? (
                                  <Square
                                    aria-label="Cartão vermelho"
                                    className="h-3.5 w-3.5 fill-red-500 text-red-500"
                                  />
                                ) : null}
                                {!s.cartao_amarelo && !s.cartao_vermelho ? (
                                  <span className="text-muted-foreground">—</span>
                                ) : null}
                              </span>
                            </TableCell>
                            <TableCell className="text-right font-semibold">
                              {s.nota ?? "—"}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </section>

            <div className="flex justify-end">
              <Button variant="outline" onClick={() => onEditar(partida)}>
                <Pencil className="mr-1 h-4 w-4" /> Editar
              </Button>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
