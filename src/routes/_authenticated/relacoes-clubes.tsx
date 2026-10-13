import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowDownLeft, ArrowUpRight, ChevronDown, Handshake } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { ClubBadge } from "@/components/club-badge";
import { Collapse } from "@/components/motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useSaveAtual } from "@/lib/use-save";
import { formatarMoeda } from "@/lib/moeda";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/relacoes-clubes")({
  head: () => ({
    meta: [
      { title: "Relações com clubes | Carreira FC Manager" },
      {
        name: "description",
        content:
          "Veja com quais clubes você mais negocia, o saldo financeiro de cada relação e o histórico completo de negócios.",
      },
      { property: "og:title", content: "Relações com clubes | Carreira FC Manager" },
      {
        property: "og:description",
        content: "Parceiros, compradores e fornecedores da sua carreira, com saldo por clube.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RelacoesClubesPage,
});

type Transfer = {
  id: string;
  tipo: string;
  modalidade: string | null;
  clube_contraparte: string | null;
  valor: number | null;
  player_id: string | null;
  jogador_troca_id: string | null;
  season_id: string | null;
  data: string;
};

type Grupo = {
  clube: string;
  negocios: Transfer[];
  entradas: number;
  saidas: number;
  saldo: number;
  selos: string[];
};

function calcularSelos(negocios: Transfer[], seasonsRecentes: Set<string>): string[] {
  const selos: string[] = [];
  const total = negocios.length;
  const entradas = negocios.filter((t) => t.tipo === "entrada").length;
  const saidas = negocios.filter((t) => t.tipo === "saida").length;
  const emprestimos = negocios.filter((t) => t.modalidade === "emprestimo").length;
  const trocas = negocios.filter((t) => t.modalidade === "troca").length;
  const recentes = negocios.filter((t) => t.season_id && seasonsRecentes.has(t.season_id)).length;

  if (recentes >= 3) selos.push("Clube Parceiro");
  if (entradas > total / 2) selos.push("Fornecedor Frequente");
  if (saidas > total / 2) selos.push("Comprador Frequente");
  if (emprestimos > total / 2) selos.push("Parceiro de Empréstimos");
  if (trocas > 1) selos.push("Rival Comercial");
  return selos;
}

function RelacoesClubesPage() {
  const { save } = useSaveAtual();
  const moeda = (v: number | null) => formatarMoeda(v, save?.moeda ?? "EUR");
  const [carregando, setCarregando] = useState(true);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [nomePorId, setNomePorId] = useState<Record<string, string>>({});
  const [nomeSeason, setNomeSeason] = useState<Record<string, string>>({});
  const [seasonsRecentes, setSeasonsRecentes] = useState<Set<string>>(new Set());
  const [ordem, setOrdem] = useState<"negocios" | "saldo">("negocios");
  const [expandido, setExpandido] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!save) return;
    let ativo = true;
    void (async () => {
      setCarregando(true);
      const [{ data: tData }, { data: pData }, { data: sData }] = await Promise.all([
        supabase
          .from("transfers")
          .select(
            "id, tipo, modalidade, clube_contraparte, valor, player_id, jogador_troca_id, season_id, data",
          )
          .eq("stint_id", save.stintId ?? "")
          .order("data", { ascending: false }),
        supabase.from("players").select("id, nome").eq("stint_id", save.stintId ?? ""),
        supabase
          .from("seasons")
          .select("id, nome, criado_em")
          .eq("stint_id", save.stintId ?? "")
          .order("criado_em", { ascending: false }),
      ]);
      if (!ativo) return;
      setTransfers((tData ?? []) as Transfer[]);
      setNomePorId(
        Object.fromEntries(((pData ?? []) as { id: string; nome: string }[]).map((p) => [p.id, p.nome])),
      );
      const seasons = (sData ?? []) as { id: string; nome: string }[];
      setNomeSeason(Object.fromEntries(seasons.map((s) => [s.id, s.nome])));
      setSeasonsRecentes(new Set(seasons.slice(0, 2).map((s) => s.id)));
      setCarregando(false);
    })();
    return () => {
      ativo = false;
    };
  }, [save]);

  const grupos = useMemo<Grupo[]>(() => {
    const mapa = new Map<string, Transfer[]>();
    for (const t of transfers) {
      const clube = t.clube_contraparte?.trim();
      if (!clube) continue;
      const atual = mapa.get(clube) ?? [];
      atual.push(t);
      mapa.set(clube, atual);
    }
    const lista: Grupo[] = [...mapa.entries()].map(([clube, negocios]) => {
      const entradas = negocios
        .filter((t) => t.tipo === "entrada")
        .reduce((s, t) => s + (t.valor ?? 0), 0);
      const saidas = negocios
        .filter((t) => t.tipo === "saida")
        .reduce((s, t) => s + (t.valor ?? 0), 0);
      return {
        clube,
        negocios,
        entradas,
        saidas,
        saldo: saidas - entradas,
        selos: calcularSelos(negocios, seasonsRecentes),
      };
    });
    lista.sort((a, b) =>
      ordem === "saldo" ? b.saldo - a.saldo : b.negocios.length - a.negocios.length,
    );
    return lista;
  }, [transfers, ordem, seasonsRecentes]);

  function rotuloJogador(t: Transfer) {
    const entra = t.player_id ? nomePorId[t.player_id] : null;
    const sai = t.jogador_troca_id ? nomePorId[t.jogador_troca_id] : null;
    if (t.modalidade === "troca" && entra && sai) return `${sai} ⇄ ${entra}`;
    return entra ?? sai ?? "Jogador";
  }

  return (
    <AppShell titulo="Relações com Clubes">
      <div className="pitch-lines min-h-full px-4 py-8 sm:px-8">
        <div className="mx-auto max-w-5xl space-y-6">
          <header className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-gradient-pitch text-4xl">Relações com Clubes</h1>
              <p className="text-sm text-muted-foreground">
                {grupos.length} clube(s) com histórico de negociações na carreira.
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={ordem === "negocios" ? "default" : "outline"}
                onClick={() => setOrdem("negocios")}
              >
                Nº de negócios
              </Button>
              <Button
                size="sm"
                variant={ordem === "saldo" ? "default" : "outline"}
                onClick={() => setOrdem("saldo")}
              >
                Saldo financeiro
              </Button>
            </div>
          </header>

          {carregando ? (
            <Skeleton className="h-64 w-full rounded-xl" />
          ) : grupos.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-14 text-center">
                <Handshake className="mx-auto h-8 w-8 text-muted-foreground" />
                <p className="mt-2 text-sm text-muted-foreground">
                  Nenhuma negociação registrada ainda.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {grupos.map((g) => {
                const aberto = !!expandido[g.clube];
                return (
                  <Card key={g.clube} className="hq-card">
                    <CardContent className="space-y-3 py-4">
                      <button
                        type="button"
                        aria-expanded={aberto}
                        onClick={() =>
                          setExpandido((a) => ({ ...a, [g.clube]: !a[g.clube] }))
                        }
                        className="flex w-full flex-wrap items-center justify-between gap-3 text-left"
                      >
                        <div className="min-w-0 space-y-1">
                          <ClubBadge nome={g.clube} tamanho="md" className="font-display text-lg" />
                          <div className="flex flex-wrap gap-1">
                            {g.selos.map((s) => (
                              <Badge key={s} variant="outline" className="text-[10px]">
                                {s}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground">
                              {g.negocios.length} negócio(s)
                            </p>
                            <p
                              className={cn(
                                "font-display text-lg",
                                g.saldo >= 0 ? "text-emerald-400" : "text-red-400",
                              )}
                            >
                              {g.saldo >= 0 ? "+" : "-"} {moeda(Math.abs(g.saldo))}
                            </p>
                          </div>
                          <ChevronDown
                            className={cn(
                              "h-5 w-5 text-muted-foreground transition-transform",
                              aberto ? "rotate-180" : "",
                            )}
                          />
                        </div>
                      </button>

                      <Collapse aberto={aberto}>
                        <ul className="divide-y divide-border/60 border-t border-border/60 pt-2">
                          {g.negocios.map((t) => (
                            <li
                              key={t.id}
                              className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm"
                            >
                              <span className="flex min-w-0 items-center gap-2">
                                {t.tipo === "entrada" ? (
                                  <ArrowDownLeft className="h-4 w-4 shrink-0 text-emerald-400" />
                                ) : (
                                  <ArrowUpRight className="h-4 w-4 shrink-0 text-red-400" />
                                )}
                                <span className="truncate">{rotuloJogador(t)}</span>
                              </span>
                              <span className="flex items-center gap-3 text-xs text-muted-foreground">
                                <span className="capitalize">{t.modalidade ?? "—"}</span>
                                <span>{t.season_id ? (nomeSeason[t.season_id] ?? "—") : "—"}</span>
                                <span className="text-foreground">{moeda(t.valor)}</span>
                              </span>
                            </li>
                          ))}
                        </ul>
                      </Collapse>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
