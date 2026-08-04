import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CARGOS_STAFF,
  ESTILOS_TATICOS,
  PAISES,
  POSICOES,
  STATUS_JOGADOR,
  nomeAleatorio,
} from "@/lib/onboarding-data";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({
    meta: [
      { title: "Montar carreira | Carreira FC Manager" },
      {
        name: "description",
        content:
          "Escolha liga e clube, crie seu treinador, monte a comissão técnica e cadastre o elenco inicial.",
      },
      { property: "og:title", content: "Montar carreira | Carreira FC Manager" },
      {
        property: "og:description",
        content: "Wizard de início de carreira: liga, clube, treinador, comissão e elenco.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Onboarding,
});

type Liga = { id: string; nome: string; pais: string; nivel: number };
type Clube = { id: string; nome: string; escudo_url: string | null };

type Jogador = {
  key: string;
  nome: string;
  nacionalidade: string;
  posicao_principal: string;
  posicoes_secundarias: string[];
  overall: string;
  valor_mercado: string;
  salario: string;
  idade: string;
  altura: string;
  playstyle: string;
  status: string;
};

const PASSOS = ["Liga", "Clube", "Treinador", "Comissão", "Elenco"];

function jogadorVazio(): Jogador {
  return {
    key: crypto.randomUUID(),
    nome: "",
    nacionalidade: "",
    posicao_principal: "",
    posicoes_secundarias: [],
    overall: "",
    valor_mercado: "",
    salario: "",
    idade: "",
    altura: "",
    playstyle: "",
    status: "Liberado",
  };
}

function num(v: string): number | null {
  const n = Number(v);
  return v.trim() === "" || Number.isNaN(n) ? null : n;
}

function Onboarding() {
  const navigate = useNavigate();
  const [passo, setPasso] = useState(0);
  const [salvando, setSalvando] = useState(false);

  const [ligas, setLigas] = useState<Liga[]>([]);
  const [clubes, setClubes] = useState<Clube[]>([]);
  const [carregandoClubes, setCarregandoClubes] = useState(false);

  const [ligaId, setLigaId] = useState<string | null>(null);
  const [clubeId, setClubeId] = useState<string | null>(null);
  const [temporada, setTemporada] = useState("2025/26");

  const [manager, setManager] = useState({
    nome: "",
    sobrenome: "",
    nome_usado: "",
    nacionalidade: "",
    estilo_tatico: "Standard",
  });

  const [staff, setStaff] = useState<Record<string, string>>(() =>
    Object.fromEntries(CARGOS_STAFF.map((c) => [c, ""])),
  );

  const [jogadores, setJogadores] = useState<Jogador[]>([jogadorVazio()]);

  useEffect(() => {
    void (async () => {
      const { data, error } = await supabase
        .from("leagues")
        .select("id, nome, pais, nivel")
        .order("pais")
        .order("nivel");
      if (error) toast.error("Não foi possível carregar as ligas.");
      setLigas((data as Liga[]) ?? []);
    })();
  }, []);

  useEffect(() => {
    if (!ligaId) return;
    setCarregandoClubes(true);
    void (async () => {
      const { data, error } = await supabase
        .from("clubs")
        .select("id, nome, escudo_url")
        .eq("league_id", ligaId)
        .order("nome");
      if (error) toast.error("Não foi possível carregar os clubes.");
      setClubes((data as Clube[]) ?? []);
      setCarregandoClubes(false);
    })();
  }, [ligaId]);

  const liga = useMemo(() => ligas.find((l) => l.id === ligaId) ?? null, [ligas, ligaId]);
  const clube = useMemo(() => clubes.find((c) => c.id === clubeId) ?? null, [clubes, clubeId]);

  function atualizarJogador(key: string, patch: Partial<Jogador>) {
    setJogadores((prev) => prev.map((j) => (j.key === key ? { ...j, ...patch } : j)));
  }

  function alternarSecundaria(key: string, pos: string) {
    setJogadores((prev) =>
      prev.map((j) => {
        if (j.key !== key) return j;
        const jaTem = j.posicoes_secundarias.includes(pos);
        if (jaTem) {
          return { ...j, posicoes_secundarias: j.posicoes_secundarias.filter((p) => p !== pos) };
        }
        if (j.posicoes_secundarias.length >= 3) {
          toast.error("Máximo de 3 posições secundárias.");
          return j;
        }
        return { ...j, posicoes_secundarias: [...j.posicoes_secundarias, pos] };
      }),
    );
  }

  const podeAvancar = (() => {
    if (passo === 0) return !!ligaId;
    if (passo === 1) return !!clubeId;
    if (passo === 2)
      return (
        manager.nome.trim().length > 0 &&
        manager.sobrenome.trim().length > 0 &&
        manager.nacionalidade.length > 0
      );
    return true;
  })();

  async function finalizar() {
    const validos = jogadores.filter((j) => j.nome.trim() && j.posicao_principal);
    if (validos.length === 0) {
      toast.error("Cadastre ao menos um jogador com nome e posição principal.");
      return;
    }
    setSalvando(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) throw new Error("Sessão expirada.");

      const { data: save, error: saveErr } = await supabase
        .from("saves")
        .insert({
          user_id: userId,
          league_id: ligaId,
          club_id: clubeId,
          temporada,
        })
        .select("id")
        .single();
      if (saveErr || !save) throw saveErr ?? new Error("Falha ao criar o save.");

      const saveId = save.id as string;

      const { data: season, error: seasonErr } = await supabase
        .from("seasons")
        .insert({
          save_id: saveId,
          nome: `Temporada ${temporada}`,
          status: "ativa",
          data_inicio: new Date().toISOString().slice(0, 10),
        })
        .select("id")
        .single();
      if (seasonErr) throw seasonErr;
      void season;

      const { error: mgrErr } = await supabase.from("managers").insert({
        save_id: saveId,
        nome: manager.nome.trim(),
        sobrenome: manager.sobrenome.trim(),
        nome_usado:
          manager.nome_usado.trim() || `${manager.nome.trim()} ${manager.sobrenome.trim()}`,
        nacionalidade: manager.nacionalidade,
        estilo_tatico: manager.estilo_tatico,
      });
      if (mgrErr) throw mgrErr;

      const staffRows = CARGOS_STAFF.filter((cargo) => staff[cargo]?.trim()).map((cargo) => ({
        save_id: saveId,
        cargo,
        nome: staff[cargo]!.trim(),
      }));
      if (staffRows.length > 0) {
        const { error } = await supabase.from("staff").insert(staffRows);
        if (error) throw error;
      }

      const { error: playersErr } = await supabase.from("players").insert(
        validos.map((j) => ({
          save_id: saveId,
          nome: j.nome.trim(),
          nacionalidade: j.nacionalidade || null,
          posicao_principal: j.posicao_principal,
          posicoes_secundarias: j.posicoes_secundarias,
          overall: num(j.overall),
          valor_mercado: num(j.valor_mercado),
          salario: num(j.salario),
          idade: num(j.idade),
          altura: num(j.altura),
          playstyle: j.playstyle.trim() || null,
          status: j.status,
          criado_via: "onboarding",
        })),
      );
      if (playersErr) throw playersErr;

      toast.success("Carreira criada! Bem-vindo ao comando do clube.");
      navigate({ to: "/dashboard" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível concluir o onboarding.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <main className="hq-surface min-h-screen bg-background">
      <div className="pitch-lines min-h-screen px-4 py-8">
        <div className="mx-auto max-w-5xl">
          <header className="mb-8">
            <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground">
              Central de gestão
            </p>
            <h1 className="text-gradient-pitch mt-1 text-4xl sm:text-5xl">Montar carreira</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {liga ? `${liga.nome} · ${liga.pais}` : "Defina onde sua história começa."}
              {clube ? ` · ${clube.nome}` : ""}
            </p>

            <ol className="mt-6 grid grid-cols-5 gap-2">
              {PASSOS.map((nome, i) => (
                <li key={nome} className="space-y-2">
                  <div
                    className={`h-1.5 rounded-full ${
                      i <= passo ? "bg-primary" : "bg-border"
                    } transition-colors`}
                  />
                  <span
                    className={`block text-[11px] uppercase tracking-wider ${
                      i === passo ? "text-primary" : "text-muted-foreground"
                    }`}
                  >
                    {i + 1}. {nome}
                  </span>
                </li>
              ))}
            </ol>
          </header>

          {passo === 0 && (
            <section className="space-y-4">
              <h2 className="text-2xl">Escolha a liga</h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {ligas.map((l) => (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => {
                      setLigaId(l.id);
                      setClubeId(null);
                    }}
                    className={`rounded-lg border bg-card p-4 text-left transition-all hover:-translate-y-0.5 hover:border-primary ${
                      ligaId === l.id ? "glow-panel border-primary" : "border-border"
                    }`}
                  >
                    <span className="block font-display text-2xl leading-none">{l.nome}</span>
                    <span className="mt-2 block text-xs uppercase tracking-widest text-muted-foreground">
                      {l.pais} · Divisão {l.nivel}
                    </span>
                  </button>
                ))}
              </div>
            </section>
          )}

          {passo === 1 && (
            <section className="space-y-4">
              <h2 className="text-2xl">Escolha o clube</h2>
              {carregandoClubes ? (
                <p className="text-sm text-muted-foreground">Carregando clubes…</p>
              ) : clubes.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="py-10 text-center text-sm text-muted-foreground">
                    Nenhum clube cadastrado para {liga?.nome ?? "esta liga"} ainda. Assim que a
                    lista de clubes for carregada no banco, eles aparecem aqui.
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {clubes.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setClubeId(c.id)}
                      className={`flex flex-col items-center gap-3 rounded-lg border bg-card p-4 transition-all hover:-translate-y-0.5 hover:border-primary ${
                        clubeId === c.id ? "glow-panel border-primary" : "border-border"
                      }`}
                    >
                      {c.escudo_url ? (
                        <img
                          src={c.escudo_url}
                          alt={`Escudo do ${c.nome}`}
                          loading="lazy"
                          className="h-16 w-16 object-contain"
                        />
                      ) : (
                        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted font-display text-xl">
                          {c.nome.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <span className="text-center text-sm font-semibold">{c.nome}</span>
                    </button>
                  ))}
                </div>
              )}
            </section>
          )}

          {passo === 2 && (
            <section className="space-y-4">
              <h2 className="text-2xl">Crie seu treinador</h2>
              <Card className="glow-panel">
                <CardContent className="grid gap-4 pt-6 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="nome">Nome</Label>
                    <Input
                      id="nome"
                      maxLength={60}
                      value={manager.nome}
                      onChange={(e) => setManager({ ...manager, nome: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sobrenome">Sobrenome</Label>
                    <Input
                      id="sobrenome"
                      maxLength={60}
                      value={manager.sobrenome}
                      onChange={(e) => setManager({ ...manager, sobrenome: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="nome_usado">Nome usado (opcional)</Label>
                    <Input
                      id="nome_usado"
                      maxLength={60}
                      placeholder="Ex.: Pep"
                      value={manager.nome_usado}
                      onChange={(e) => setManager({ ...manager, nome_usado: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Nacionalidade</Label>
                    <Select
                      value={manager.nacionalidade}
                      onValueChange={(v) => setManager({ ...manager, nacionalidade: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o país" />
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
                  <div className="space-y-2">
                    <Label>Estilo tático</Label>
                    <Select
                      value={manager.estilo_tatico}
                      onValueChange={(v) => setManager({ ...manager, estilo_tatico: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ESTILOS_TATICOS.map((e) => (
                          <SelectItem key={e} value={e}>
                            {e}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="temporada">Temporada inicial</Label>
                    <Input
                      id="temporada"
                      maxLength={12}
                      value={temporada}
                      onChange={(e) => setTemporada(e.target.value)}
                    />
                  </div>
                </CardContent>
              </Card>
            </section>
          )}

          {passo === 3 && (
            <section className="space-y-4">
              <h2 className="text-2xl">Comissão técnica</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {CARGOS_STAFF.map((cargo) => (
                  <Card key={cargo}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base uppercase tracking-wide">{cargo}</CardTitle>
                    </CardHeader>
                    <CardContent className="flex gap-2">
                      <Input
                        maxLength={80}
                        value={staff[cargo] ?? ""}
                        placeholder="Nome do profissional"
                        onChange={(e) => setStaff({ ...staff, [cargo]: e.target.value })}
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => setStaff({ ...staff, [cargo]: nomeAleatorio() })}
                      >
                        🎲
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          )}

          {passo === 4 && (
            <section className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-2xl">Elenco inicial</h2>
                <span className="text-xs uppercase tracking-widest text-muted-foreground">
                  {jogadores.length} jogador(es)
                </span>
              </div>

              <div className="space-y-3">
                {jogadores.map((j, i) => (
                  <Card key={j.key} className="glow-panel">
                    <CardHeader className="flex-row items-center justify-between pb-2">
                      <CardTitle className="text-base">
                        #{i + 1} {j.nome || "Novo jogador"}
                      </CardTitle>
                      {jogadores.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setJogadores((prev) => prev.filter((p) => p.key !== j.key))
                          }
                        >
                          Remover
                        </Button>
                      )}
                    </CardHeader>
                    <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <div className="space-y-2 lg:col-span-2">
                        <Label>Nome</Label>
                        <Input
                          maxLength={80}
                          value={j.nome}
                          onChange={(e) => atualizarJogador(j.key, { nome: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Nacionalidade</Label>
                        <Select
                          value={j.nacionalidade}
                          onValueChange={(v) => atualizarJogador(j.key, { nacionalidade: v })}
                        >
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
                      <div className="space-y-2">
                        <Label>Posição principal</Label>
                        <Select
                          value={j.posicao_principal}
                          onValueChange={(v) => atualizarJogador(j.key, { posicao_principal: v })}
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

                      <div className="space-y-2 sm:col-span-2 lg:col-span-4">
                        <Label>Posições secundárias (até 3)</Label>
                        <div className="flex flex-wrap gap-1.5">
                          {POSICOES.map((p) => {
                            const ativo = j.posicoes_secundarias.includes(p);
                            return (
                              <button
                                key={p}
                                type="button"
                                onClick={() => alternarSecundaria(j.key, p)}
                                className={`rounded-md border px-2.5 py-1 text-xs font-semibold transition-colors ${
                                  ativo
                                    ? "border-primary bg-primary text-primary-foreground"
                                    : "border-border bg-muted text-muted-foreground hover:border-primary"
                                }`}
                              >
                                {p}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Overall (0-99)</Label>
                        <Input
                          type="number"
                          min={0}
                          max={99}
                          value={j.overall}
                          onChange={(e) => atualizarJogador(j.key, { overall: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Valor de mercado</Label>
                        <Input
                          type="number"
                          min={0}
                          value={j.valor_mercado}
                          onChange={(e) =>
                            atualizarJogador(j.key, { valor_mercado: e.target.value })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Salário</Label>
                        <Input
                          type="number"
                          min={0}
                          value={j.salario}
                          onChange={(e) => atualizarJogador(j.key, { salario: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Idade</Label>
                        <Input
                          type="number"
                          min={14}
                          max={50}
                          value={j.idade}
                          onChange={(e) => atualizarJogador(j.key, { idade: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Altura (cm)</Label>
                        <Input
                          type="number"
                          min={140}
                          max={220}
                          value={j.altura}
                          onChange={(e) => atualizarJogador(j.key, { altura: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Playstyle</Label>
                        <Input
                          maxLength={60}
                          placeholder="Ex.: Finalizador"
                          value={j.playstyle}
                          onChange={(e) => atualizarJogador(j.key, { playstyle: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2 lg:col-span-2">
                        <Label>Status</Label>
                        <Select
                          value={j.status}
                          onValueChange={(v) => atualizarJogador(j.key, { status: v })}
                        >
                          <SelectTrigger>
                            <SelectValue />
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
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Button
                type="button"
                variant="secondary"
                onClick={() => setJogadores((prev) => [...prev, jogadorVazio()])}
              >
                + Adicionar outro jogador
              </Button>
            </section>
          )}

          <footer className="mt-10 flex items-center justify-between gap-3 border-t border-border pt-6">
            <Button
              type="button"
              variant="ghost"
              disabled={passo === 0 || salvando}
              onClick={() => setPasso((p) => Math.max(0, p - 1))}
            >
              Voltar
            </Button>

            {passo < PASSOS.length - 1 ? (
              <Button
                type="button"
                disabled={!podeAvancar}
                onClick={() => setPasso((p) => p + 1)}
              >
                Continuar
              </Button>
            ) : (
              <Button type="button" disabled={salvando} onClick={finalizar}>
                {salvando ? "Salvando…" : "Finalizar elenco e ir para o dashboard"}
              </Button>
            )}
          </footer>
        </div>
      </div>
    </main>
  );
}
