import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Camera, Flame, Loader2, Trash2, Trophy, UserRound } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { Bandeira } from "@/components/bandeira";
import { ClubBadge } from "@/components/club-badge";
import { ESTILOS_INFO, EstiloIcone, LISTA_ESTILOS } from "@/components/estilo-icones";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { rotuloMotivoStint } from "@/lib/stint";
import {
  carregarTreinador,
  prepararFoto,
  salvarFotoTreinador,
  type DadosTreinador,
  type ResumoJogos,
  type UsoFormacao,
} from "@/lib/treinador";
import { useSaveAtual } from "@/lib/use-save";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/treinador")({
  head: () => ({
    meta: [
      { title: "Treinador | Carreira FC Manager" },
      {
        name: "description",
        content: "A carreira do treinador: passagens, aproveitamento, títulos e estilo de jogo.",
      },
    ],
  }),
  component: TreinadorPage,
});

const dec = (n: number, casas = 2) =>
  n.toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas });

function Estatistica({
  rotulo,
  valor,
  classe,
  detalhe,
}: {
  rotulo: string;
  valor: string | number;
  classe?: string;
  detalhe?: string;
}) {
  return (
    <div className="rounded-lg border border-border p-3">
      <p className="text-[0.65rem] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        {rotulo}
      </p>
      <p className={cn("font-display text-3xl leading-tight", classe)}>{valor}</p>
      {detalhe ? <p className="text-xs text-muted-foreground">{detalhe}</p> : null}
    </div>
  );
}

function BlocoResultados({ r }: { r: ResumoJogos }) {
  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
      <Estatistica rotulo="Jogos" valor={r.jogos} />
      <Estatistica rotulo="Vitórias" valor={r.vitorias} classe="text-success" />
      <Estatistica rotulo="Empates" valor={r.empates} classe="text-warning" />
      <Estatistica rotulo="Derrotas" valor={r.derrotas} classe="text-destructive" />
      <Estatistica rotulo="Gols feitos" valor={r.golsPro} />
      <Estatistica
        rotulo="Gols sofridos"
        valor={r.golsContra}
        detalhe={`Saldo ${r.golsPro - r.golsContra > 0 ? "+" : ""}${r.golsPro - r.golsContra}`}
      />
    </div>
  );
}

function Formacoes({ lista }: { lista: UsoFormacao[] }) {
  if (lista.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Ainda sem esquemas registrados. Informe a formação ao fechar as partidas.
      </p>
    );
  }
  return (
    <ul className="space-y-2">
      {lista.map((f, i) => (
        <li key={f.formacao} className="space-y-1">
          <div className="flex items-baseline justify-between text-sm">
            <span className={cn("font-display text-xl", i === 0 && "text-primary")}>
              {f.formacao}
            </span>
            <span className="text-xs text-muted-foreground">
              {f.jogos} jogo(s) · {Math.round(f.pct)}%
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary" style={{ width: `${f.pct}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

function TreinadorPage() {
  const { save, carregando: carregandoSave } = useSaveAtual();
  const [dados, setDados] = useState<DadosTreinador | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const entradaArquivo = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!save) {
      if (!carregandoSave) setCarregando(false);
      return;
    }
    void (async () => {
      setDados(await carregarTreinador(save.id));
      setCarregando(false);
    })();
  }, [save, carregandoSave]);

  async function enviarFoto(file: File) {
    if (!dados?.treinador.id) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("A foto deve ter no máximo 5 MB.");
      return;
    }
    setEnviando(true);
    try {
      const url = await prepararFoto(file);
      await salvarFotoTreinador(dados.treinador.id, url);
      setDados({ ...dados, treinador: { ...dados.treinador, fotoUrl: url } });
      toast.success("Foto do treinador atualizada!");
    } catch (e) {
      toast.error(
        e instanceof Error && e.message.includes("foto_url")
          ? "O banco ainda não tem a coluna da foto. Rode o SQL do treinador."
          : "Não foi possível salvar a foto.",
      );
    }
    setEnviando(false);
  }

  async function removerFoto() {
    if (!dados?.treinador.id) return;
    setEnviando(true);
    try {
      await salvarFotoTreinador(dados.treinador.id, null);
      setDados({ ...dados, treinador: { ...dados.treinador, fotoUrl: null } });
    } catch {
      toast.error("Não foi possível remover a foto.");
    }
    setEnviando(false);
  }

  const passagensRecentes = dados ? [...dados.passagens].reverse() : [];
  const atual = passagensRecentes.find((p) => p.status === "ativa");

  return (
    <AppShell titulo="Treinador">
      <div className="min-h-full px-4 py-6 sm:px-8">
        <div className="mx-auto max-w-5xl space-y-6">
          {carregando ? (
            <Skeleton className="h-96 w-full rounded-xl" />
          ) : !save || !dados ? (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center text-sm text-muted-foreground">
                Crie uma carreira para ver o perfil do treinador.
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Identidade: foto, nome e estilo de jogo */}
              <section className="glow-panel rounded-xl p-5">
                <div className="flex flex-wrap items-center gap-x-8 gap-y-5">
                  <div className="flex min-w-0 flex-1 items-center gap-5">
                    <div className="relative shrink-0">
                      {dados.treinador.fotoUrl ? (
                        <img
                          src={dados.treinador.fotoUrl}
                          alt={`Foto de ${dados.treinador.nome}`}
                          className="h-28 w-28 rounded-xl border border-border object-cover"
                        />
                      ) : (
                        <div className="flex h-28 w-28 items-center justify-center rounded-xl border border-dashed border-border bg-muted text-muted-foreground">
                          <UserRound className="h-12 w-12" />
                        </div>
                      )}
                      <input
                        ref={entradaArquivo}
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          e.target.value = "";
                          if (file) void enviarFoto(file);
                        }}
                      />
                      <Button
                        size="icon"
                        variant="secondary"
                        aria-label="Enviar foto do treinador"
                        disabled={enviando}
                        className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full shadow"
                        onClick={() => entradaArquivo.current?.click()}
                      >
                        {enviando ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Camera className="h-4 w-4" />
                        )}
                      </Button>
                      {dados.treinador.fotoUrl ? (
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label="Remover foto"
                          disabled={enviando}
                          className="absolute -left-2 -top-2 h-7 w-7 rounded-full bg-background/80"
                          onClick={() => void removerFoto()}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      ) : null}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[0.7rem] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                        Treinador
                      </p>
                      <h1 className="break-words font-display text-4xl leading-tight sm:text-5xl">
                        {dados.treinador.nome}
                      </h1>
                      {dados.treinador.nacionalidade ? (
                        <div className="mt-1 text-sm text-muted-foreground">
                          <Bandeira pais={dados.treinador.nacionalidade} comNome />
                        </div>
                      ) : null}
                      {atual ? (
                        <p className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                          Atualmente no <ClubBadge nome={atual.clubeNome} escudoUrl={atual.escudo} />
                        </p>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex max-w-md items-center gap-4 rounded-xl border border-border bg-background/40 p-4">
                    <EstiloIcone estilo={dados.treinador.estiloTatico} className="h-16 w-16 text-primary" />
                    <div>
                      <p className="text-[0.7rem] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                        Estilo de jogo
                      </p>
                      <p className="font-display text-3xl leading-tight">
                        {dados.treinador.estiloTatico ?? "Não definido"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {(dados.treinador.estiloTatico && ESTILOS_INFO[dados.treinador.estiloTatico]) ||
                          "Defina o estilo do treinador na criação da carreira."}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-border pt-4">
                  {LISTA_ESTILOS.map((e) => (
                    <span
                      key={e}
                      title={e}
                      className={cn(
                        "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs",
                        e === dados.treinador.estiloTatico
                          ? "border-primary bg-primary/10 text-foreground"
                          : "border-border text-muted-foreground opacity-60",
                      )}
                    >
                      <EstiloIcone estilo={e} className="h-4 w-4" />
                      {e}
                    </span>
                  ))}
                </div>
              </section>

              {/* O mais importante primeiro */}
              <section className="grid gap-4 lg:grid-cols-3">
                <Card className="glow-panel lg:col-span-2">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-semibold uppercase tracking-[0.06em]">
                      Aproveitamento na carreira
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex flex-wrap items-end gap-x-8 gap-y-3">
                      <div>
                        <p className="font-display text-6xl leading-none text-primary">
                          {dec(dados.carreira.ppg)}
                        </p>
                        <p className="text-xs text-muted-foreground">pontos por jogo</p>
                      </div>
                      <div className="min-w-48 flex-1">
                        <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                          <span>Aproveitamento</span>
                          <span>{dec(dados.carreira.aproveitamento, 1)}%</span>
                        </div>
                        <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-primary transition-all duration-500"
                            style={{ width: `${dados.carreira.aproveitamento}%` }}
                          />
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {dados.carreira.pontos} pontos em {dados.carreira.jogos} jogos
                        </p>
                      </div>
                    </div>
                    <BlocoResultados r={dados.carreira} />
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-2">
                      <Estatistica rotulo="Clubes" valor={dados.passagens.length} />
                      <Estatistica
                        rotulo="Títulos"
                        valor={dados.totalTitulos}
                        classe="text-gold"
                      />
                    </div>
                  </CardContent>
                </Card>

                <div className="space-y-4">
                  <Card className="glow-panel">
                    <CardHeader className="flex-row items-center gap-2 pb-2">
                      <Flame className="h-4 w-4 text-primary" />
                      <CardTitle className="text-base font-semibold uppercase tracking-[0.06em]">
                        Melhor fase
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {dados.melhorFase ? (
                        <div className="space-y-1">
                          <p className="font-display text-4xl leading-none">
                            {dec(dados.melhorFase.ppg)}
                            <span className="ml-1 text-sm text-muted-foreground">pts/jogo</span>
                          </p>
                          <p className="text-sm">
                            Em {dados.melhorFase.jogos} jogos:{" "}
                            <span className="text-success">{dados.melhorFase.vitorias}V</span>{" "}
                            <span className="text-warning">{dados.melhorFase.empates}E</span>{" "}
                            <span className="text-destructive">{dados.melhorFase.derrotas}D</span>
                          </p>
                          {dados.melhorFase.stintId ? (
                            <p className="text-xs text-muted-foreground">
                              Terminou no{" "}
                              {dados.passagens.find((p) => p.id === dados.melhorFase?.stintId)
                                ?.clubeNome ?? "clube"}
                            </p>
                          ) : null}
                          <p className="text-xs text-muted-foreground">
                            Maior sequência de vitórias: {dados.maiorSequenciaVitorias}
                          </p>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          Disponível a partir de 5 jogos finalizados.
                        </p>
                      )}
                    </CardContent>
                  </Card>

                  <Card className="glow-panel">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base font-semibold uppercase tracking-[0.06em]">
                        Esquema mais utilizado
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Formacoes lista={dados.formacoes} />
                    </CardContent>
                  </Card>
                </div>
              </section>

              {/* Passagens pelos clubes */}
              <section className="space-y-3">
                <h2 className="text-2xl">Passagens pelos clubes</h2>
                {passagensRecentes.length === 0 ? (
                  <Card className="border-dashed">
                    <CardContent className="py-8 text-center text-sm text-muted-foreground">
                      Nenhuma passagem registrada ainda.
                    </CardContent>
                  </Card>
                ) : (
                  <Accordion
                    type="multiple"
                    defaultValue={atual ? [atual.id] : []}
                    className="space-y-3"
                  >
                    {passagensRecentes.map((p) => (
                      <AccordionItem
                        key={p.id}
                        value={p.id}
                        className="glow-panel overflow-hidden rounded-xl border-b-0 px-4"
                      >
                        <AccordionTrigger className="gap-3 py-4 hover:no-underline">
                          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-1 text-left">
                            <span className="font-display text-2xl">
                              <ClubBadge nome={p.clubeNome} escudoUrl={p.escudo} tamanho="md" />
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {p.periodo}
                              {p.status === "ativa" ? " · atual" : ""}
                            </span>
                            <span className="ml-auto flex items-center gap-3 text-xs text-muted-foreground">
                              <span>{p.resumo.jogos} jogos</span>
                              <span className="text-foreground">{dec(p.resumo.ppg)} pts/jogo</span>
                              {p.titulos.length > 0 ? (
                                <span className="flex items-center gap-1 text-gold">
                                  <Trophy className="h-3.5 w-3.5" />
                                  {p.titulos.length}
                                </span>
                              ) : null}
                            </span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="space-y-4 pb-4">
                          <BlocoResultados r={p.resumo} />
                          <div className="grid gap-4 md:grid-cols-3">
                            <div>
                              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                                Melhores jogadores
                              </p>
                              {p.destaques.length > 0 ? (
                                <ol className="space-y-1.5">
                                  {p.destaques.map((j, i) => (
                                    <li key={j.id} className="flex items-center gap-2 text-sm">
                                      <span className="w-4 text-muted-foreground">{i + 1}</span>
                                      <span className="min-w-0 flex-1 truncate">{j.nome}</span>
                                      {j.posicao ? (
                                        <span className="text-xs text-muted-foreground">
                                          {j.posicao}
                                        </span>
                                      ) : null}
                                      <span className="font-display text-xl text-primary">
                                        {j.overall}
                                      </span>
                                    </li>
                                  ))}
                                </ol>
                              ) : (
                                <p className="text-sm text-muted-foreground">Sem jogadores.</p>
                              )}
                            </div>
                            <div>
                              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                                Esquema mais usado
                              </p>
                              <Formacoes lista={p.formacoes} />
                            </div>
                            <div>
                              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                                Títulos
                              </p>
                              {p.titulos.length > 0 ? (
                                <ul className="space-y-1 text-sm">
                                  {p.titulos.map((t, i) => (
                                    <li key={`${t}-${i}`} className="flex items-center gap-2">
                                      <Trophy className="h-3.5 w-3.5 shrink-0 text-gold" />
                                      {t}
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <p className="text-sm text-muted-foreground">Nenhum título.</p>
                              )}
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {p.ligaNome ? `${p.ligaNome} · ` : ""}
                            {p.status === "ativa"
                              ? "Passagem em andamento"
                              : `Saída: ${rotuloMotivoStint(p.motivoSaida)}`}
                          </p>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                )}
              </section>
            </>
          )}
        </div>
      </div>
    </AppShell>
  );
}
