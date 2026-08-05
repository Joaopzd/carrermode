import { posEn } from "@/lib/posicoes";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Archive, UserMinus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { Bandeira } from "@/components/bandeira";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { MOTIVOS_SAIDA, rotuloMotivo } from "@/lib/season";
import { useSaveAtual } from "@/lib/use-save";

export const Route = createFileRoute("/_authenticated/ex-jogadores")({
  head: () => ({
    meta: [
      { title: "Ex-jogadores | Carreira FC Manager" },
      {
        name: "description",
        content: "Histórico completo dos jogadores que já deixaram o clube na sua carreira.",
      },
      { property: "og:title", content: "Ex-jogadores | Carreira FC Manager" },
      {
        property: "og:description",
        content: "Consulte estatísticas e o resumo da saída de cada ex-jogador do clube.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ExJogadoresPage,
});

type ExJogador = {
  id: string;
  nome: string;
  nacionalidade: string | null;
  posicao_principal: string | null;
  overall: number | null;
  idade: number | null;
  data_saida: string | null;
  motivo_saida: string | null;
  clube_destino: string | null;
  transfer_saida_id: string | null;
};

type Stat = {
  match_id: string;
  gols: number | null;
  assistencias: number | null;
  nota: number | null;
  defesas: number | null;
  cartao_amarelo: boolean;
  cartao_vermelho: boolean;
};

type Season = { id: string; nome: string };
type Transfer = { id: string; valor: number | null; modalidade: string | null; season_id: string | null };

const TODOS = "__todos__";

function ExJogadoresPage() {
  const { save, carregando: carregandoSave } = useSaveAtual();
  const [lista, setLista] = useState<ExJogador[]>([]);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [fTemporada, setFTemporada] = useState(TODOS);
  const [fMotivo, setFMotivo] = useState(TODOS);
  const [selecionado, setSelecionado] = useState<ExJogador | null>(null);
  const [stats, setStats] = useState<Stat[]>([]);

  useEffect(() => {
    if (!save) {
      if (!carregandoSave) setCarregando(false);
      return;
    }
    void (async () => {
      const [{ data: pls }, { data: ses }, { data: trs }] = await Promise.all([
        supabase
          .from("players")
          .select(
            "id, nome, nacionalidade, posicao_principal, overall, idade, data_saida, motivo_saida, clube_destino, transfer_saida_id",
          )
          .eq("save_id", save.id)
          .eq("ativo", false)
          .order("data_saida", { ascending: false }),
        supabase.from("seasons").select("id, nome").eq("save_id", save.id),
        supabase
          .from("transfers")
          .select("id, valor, modalidade, season_id")
          .eq("save_id", save.id),
      ]);
      setLista((pls ?? []) as ExJogador[]);
      setSeasons((ses ?? []) as Season[]);
      setTransfers((trs ?? []) as Transfer[]);
      setCarregando(false);
    })();
  }, [save, carregandoSave]);

  const transferPorId = useMemo(
    () => Object.fromEntries(transfers.map((t) => [t.id, t])),
    [transfers],
  );
  const seasonPorId = useMemo(
    () => Object.fromEntries(seasons.map((s) => [s.id, s.nome])),
    [seasons],
  );

  const filtrados = useMemo(
    () =>
      lista.filter((j) => {
        if (fMotivo !== TODOS && j.motivo_saida !== fMotivo) return false;
        if (fTemporada !== TODOS) {
          const t = j.transfer_saida_id ? transferPorId[j.transfer_saida_id] : null;
          if (t?.season_id !== fTemporada) return false;
        }
        return true;
      }),
    [lista, fMotivo, fTemporada, transferPorId],
  );

  async function abrir(j: ExJogador) {
    setSelecionado(j);
    setStats([]);
    const { data } = await supabase
      .from("match_player_stats")
      .select("match_id, gols, assistencias, nota, defesas, cartao_amarelo, cartao_vermelho")
      .eq("player_id", j.id);
    setStats((data ?? []) as Stat[]);
  }

  const agregado = useMemo(() => {
    const notas = stats.map((s) => s.nota).filter((n): n is number => n != null);
    return {
      jogos: stats.length,
      gols: stats.reduce((a, s) => a + (s.gols ?? 0), 0),
      assistencias: stats.reduce((a, s) => a + (s.assistencias ?? 0), 0),
      defesas: stats.reduce((a, s) => a + (s.defesas ?? 0), 0),
      amarelos: stats.filter((s) => s.cartao_amarelo).length,
      vermelhos: stats.filter((s) => s.cartao_vermelho).length,
      nota: notas.length ? (notas.reduce((a, b) => a + b, 0) / notas.length).toFixed(2) : "—",
    };
  }, [stats]);

  const transferSaida = selecionado?.transfer_saida_id
    ? transferPorId[selecionado.transfer_saida_id]
    : null;

  return (
    <AppShell titulo="Ex-jogadores">
      <div className="pitch-lines min-h-full px-4 py-8 sm:px-8">
        <div className="mx-auto max-w-5xl space-y-6">
          <header>
            <h1 className="text-gradient-pitch text-4xl">Ex-jogadores</h1>
            <p className="text-sm text-muted-foreground">
              Todos os atletas que já vestiram a camisa e hoje estão fora do elenco.
            </p>
          </header>

          <Card>
            <CardContent className="grid gap-3 py-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Temporada de saída</Label>
                <Select value={fTemporada} onValueChange={setFTemporada}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={TODOS}>Todas</SelectItem>
                    {seasons.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Motivo da saída</Label>
                <Select value={fMotivo} onValueChange={setFMotivo}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={TODOS}>Todos</SelectItem>
                    {MOTIVOS_SAIDA.map((m) => (
                      <SelectItem key={m.valor} value={m.valor}>
                        {m.rotulo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {carregando ? (
            <Skeleton className="h-64 w-full rounded-xl" />
          ) : filtrados.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-14 text-center">
                <UserMinus className="mx-auto h-8 w-8 text-muted-foreground" />
                <p className="mt-3 text-lg font-semibold">Nenhum ex-jogador por aqui</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Quando um atleta deixar o clube, ele aparece nesta sala de troféus.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filtrados.map((j) => (
                <button key={j.id} type="button" onClick={() => void abrir(j)} className="text-left">
                  <Card className="hq-card h-full transition-colors hover:border-primary/60">
                    <CardContent className="space-y-2 py-4">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-display text-xl leading-tight tracking-wide">
                            {j.nome}
                          </p>
                          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Bandeira pais={j.nacionalidade} />
                            {posEn(j.posicao_principal) ?? "—"} · {j.idade ?? "—"} anos
                          </p>
                        </div>
                        <span className="rounded-lg bg-muted px-2 py-1 font-display text-lg">
                          {j.overall ?? "—"}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <Badge variant="secondary">{rotuloMotivo(j.motivo_saida)}</Badge>
                        {j.clube_destino ? (
                          <span className="text-muted-foreground">→ {j.clube_destino}</span>
                        ) : null}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {j.data_saida
                          ? new Date(j.data_saida).toLocaleDateString("pt-BR")
                          : "Data não informada"}
                      </p>
                    </CardContent>
                  </Card>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <Sheet open={!!selecionado} onOpenChange={(v) => !v && setSelecionado(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          {selecionado ? (
            <>
              <SheetHeader>
                <SheetTitle className="font-display text-2xl tracking-wide">
                  {selecionado.nome}
                </SheetTitle>
              </SheetHeader>
              <div className="mt-4 space-y-5">
                <div className="rounded-xl border border-border p-4">
                  <p className="flex items-center gap-2 text-sm font-semibold">
                    <Archive className="h-4 w-4 text-primary" /> Resumo da saída
                  </p>
                  <dl className="mt-2 grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <dt className="text-xs text-muted-foreground">Motivo</dt>
                      <dd>{rotuloMotivo(selecionado.motivo_saida)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">Destino</dt>
                      <dd>{selecionado.clube_destino ?? "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">Data</dt>
                      <dd>
                        {selecionado.data_saida
                          ? new Date(selecionado.data_saida).toLocaleDateString("pt-BR")
                          : "—"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">Temporada</dt>
                      <dd>
                        {transferSaida?.season_id
                          ? (seasonPorId[transferSaida.season_id] ?? "—")
                          : "—"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">Valor</dt>
                      <dd>
                        {transferSaida?.valor != null
                          ? Number(transferSaida.valor).toLocaleString("pt-BR")
                          : "—"}
                      </dd>
                    </div>
                  </dl>
                </div>

                <div className="grid grid-cols-3 gap-3 text-center">
                  {[
                    ["Jogos", agregado.jogos],
                    ["Gols", agregado.gols],
                    ["Assist.", agregado.assistencias],
                    ["Nota média", agregado.nota],
                    ["Defesas", agregado.defesas],
                    ["Cartões", `${agregado.amarelos}A / ${agregado.vermelhos}V`],
                  ].map(([rot, val]) => (
                    <div key={String(rot)} className="rounded-lg border border-border py-3">
                      <p className="font-display text-2xl">{val}</p>
                      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                        {rot}
                      </p>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Estatísticas somadas de todas as temporadas em que o jogador atuou pelo clube.
                </p>
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </AppShell>
  );
}
