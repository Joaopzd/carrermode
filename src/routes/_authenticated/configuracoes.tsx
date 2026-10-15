import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Palette, RotateCcw, Save, Wallet } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  aplicarTema,
  corPadraoDoClube,
  lerCoresManuais,
  salvarCoresManuais,
} from "@/lib/club-theme";
import { calcularCaixa, salvarOrcamentoInicial, type ResumoCaixa } from "@/lib/financas";
import { formatarMoedaCompacta, moedaDoPais } from "@/lib/moeda";
import { useSaveAtual } from "@/lib/use-save";

export const Route = createFileRoute("/_authenticated/configuracoes")({
  head: () => ({
    meta: [
      { title: "Finanças e Tema | Carreira FC Manager" },
      {
        name: "description",
        content: "Defina o orçamento da temporada e a cor do clube.",
      },
    ],
  }),
  component: ConfiguracoesPage,
});

const COR_PADRAO = { primaria: "#4f8fd6", secundaria: "#ffffff" };

function ConfiguracoesPage() {
  const { save, carregando: carregandoSave } = useSaveAtual();
  const [orcamento, setOrcamento] = useState("");
  const [resumo, setResumo] = useState<ResumoCaixa | null>(null);
  const [salvandoOrcamento, setSalvandoOrcamento] = useState(false);
  const [primaria, setPrimaria] = useState(COR_PADRAO.primaria);
  const [secundaria, setSecundaria] = useState(COR_PADRAO.secundaria);
  const [carregando, setCarregando] = useState(true);

  const moeda = moedaDoPais(save?.ligaPais);

  async function carregarFinancas(stintId: string, seasonId: string) {
    const r = await calcularCaixa(stintId, seasonId);
    setResumo(r);
    setOrcamento(r.orcamentoInicial != null ? String(r.orcamentoInicial) : "");
  }

  useEffect(() => {
    if (!save) {
      if (!carregandoSave) setCarregando(false);
      return;
    }
    void (async () => {
      if (save.stintId && save.seasonId) await carregarFinancas(save.stintId, save.seasonId);
      const cores =
        lerCoresManuais(save.id) ?? (await corPadraoDoClube(save.clubeNome, save.escudo));
      if (cores) {
        setPrimaria(cores.primaria);
        setSecundaria(cores.secundaria);
      }
      setCarregando(false);
    })();
  }, [save, carregandoSave]);

  async function salvarOrcamento() {
    if (!save?.seasonId || !save.stintId) return;
    const valor = orcamento.trim() === "" ? null : Number(orcamento);
    if (valor != null && !Number.isFinite(valor)) {
      toast.error("Informe um valor válido.");
      return;
    }
    setSalvandoOrcamento(true);
    try {
      await salvarOrcamentoInicial(save.seasonId, valor);
      await carregarFinancas(save.stintId, save.seasonId);
      toast.success("Orçamento da temporada salvo!");
    } catch {
      toast.error("Não foi possível salvar. O banco já recebeu o SQL de finanças?");
    }
    setSalvandoOrcamento(false);
  }

  function salvarCores() {
    if (!save) return;
    salvarCoresManuais(save.id, { primaria, secundaria });
    aplicarTema({ primaria, secundaria });
    toast.success("Cores do clube atualizadas neste aparelho.");
  }

  async function restaurarCores() {
    if (!save) return;
    salvarCoresManuais(save.id, null);
    const padrao = await corPadraoDoClube(save.clubeNome, save.escudo);
    aplicarTema(padrao);
    setPrimaria(padrao?.primaria ?? COR_PADRAO.primaria);
    setSecundaria(padrao?.secundaria ?? COR_PADRAO.secundaria);
    toast.success("Cores automáticas restauradas.");
  }

  return (
    <AppShell titulo="Finanças e Tema">
      <div className="min-h-full px-4 py-8 sm:px-8">
        <div className="mx-auto max-w-3xl space-y-6">
          <header>
            <h1 className="text-gradient-pitch text-4xl">Finanças e tema</h1>
            <p className="text-sm text-muted-foreground">
              Informe com quanto a temporada começa e ajuste as cores do clube.
            </p>
          </header>

          {carregando ? (
            <Skeleton className="h-64 w-full rounded-xl" />
          ) : !save ? (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center text-sm text-muted-foreground">
                Crie uma carreira para configurar as finanças.
              </CardContent>
            </Card>
          ) : (
            <>
              <Card className="hq-card">
                <CardHeader className="flex-row items-center gap-2 pb-2">
                  <Wallet className="h-4 w-4 text-primary" />
                  <CardTitle className="text-base font-semibold uppercase tracking-[0.06em]">
                    Orçamento · {save.seasonNome ?? save.temporada}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-1">
                    <Label htmlFor="orcamento">Quanto a temporada começa</Label>
                    <Input
                      id="orcamento"
                      type="number"
                      value={orcamento}
                      onChange={(e) => setOrcamento(e.target.value)}
                      placeholder="Ex.: 50000000"
                    />
                    <p className="text-xs text-muted-foreground">
                      Esse valor aparece no dashboard como caixa e é a base do gráfico de
                      transferências. Ao encerrar a temporada, o caixa final vira o orçamento da
                      próxima, e você pode ajustar aqui.
                    </p>
                  </div>

                  {resumo?.caixa != null ? (
                    <div className="grid gap-3 rounded-lg border border-border p-3 text-sm sm:grid-cols-3">
                      <div>
                        <p className="text-xs uppercase tracking-widest text-muted-foreground">
                          Vendas
                        </p>
                        <p className="text-success">
                          +{formatarMoedaCompacta(resumo.receitas, moeda)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-widest text-muted-foreground">
                          Compras
                        </p>
                        <p className="text-destructive">
                          −{formatarMoedaCompacta(resumo.gastos, moeda)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-widest text-muted-foreground">
                          Caixa atual
                        </p>
                        <p className="font-semibold">
                          {resumo.caixa < 0 ? "−" : ""}
                          {formatarMoedaCompacta(Math.abs(resumo.caixa), moeda)}
                        </p>
                      </div>
                    </div>
                  ) : null}

                  <Button onClick={() => void salvarOrcamento()} disabled={salvandoOrcamento}>
                    {salvandoOrcamento ? (
                      <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="mr-1 h-4 w-4" />
                    )}
                    Salvar orçamento
                  </Button>
                </CardContent>
              </Card>

              <Card className="hq-card">
                <CardHeader className="flex-row items-center gap-2 pb-2">
                  <Palette className="h-4 w-4 text-primary" />
                  <CardTitle className="text-base font-semibold uppercase tracking-[0.06em]">
                    Cor do clube
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-xs text-muted-foreground">
                    A cor principal aparece em botões, item ativo do menu, barras e bordas. Se a
                    automática não agradar, escolha outra. A escolha vale para este aparelho.
                  </p>
                  <div className="flex flex-wrap items-end gap-6">
                    <div className="grid gap-1">
                      <Label htmlFor="cor-primaria">Principal</Label>
                      <input
                        id="cor-primaria"
                        type="color"
                        value={primaria}
                        onChange={(e) => setPrimaria(e.target.value)}
                        className="h-10 w-20 cursor-pointer rounded-md border border-border bg-transparent"
                      />
                    </div>
                    <div className="grid gap-1">
                      <Label htmlFor="cor-secundaria">Secundária</Label>
                      <input
                        id="cor-secundaria"
                        type="color"
                        value={secundaria}
                        onChange={(e) => setSecundaria(e.target.value)}
                        className="h-10 w-20 cursor-pointer rounded-md border border-border bg-transparent"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className="rounded-md px-3 py-1.5 text-sm font-medium"
                        style={{ backgroundColor: primaria, color: "#111" }}
                      >
                        Botão
                      </span>
                      <span
                        className="h-2 w-24 rounded-full"
                        style={{ backgroundColor: primaria }}
                      />
                      <span
                        className="h-5 w-5 rounded-full border border-border"
                        style={{ backgroundColor: secundaria }}
                      />
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <Button onClick={salvarCores}>
                      <Save className="mr-1 h-4 w-4" />
                      Aplicar cores
                    </Button>
                    <Button variant="outline" onClick={() => void restaurarCores()}>
                      <RotateCcw className="mr-1 h-4 w-4" />
                      Restaurar automático
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </AppShell>
  );
}
