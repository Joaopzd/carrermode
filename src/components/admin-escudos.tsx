import { useCallback, useEffect, useState } from "react";
import { RefreshCw, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ClubBadge } from "@/components/club-badge";
import { supabase } from "@/integrations/supabase/client";
import { carregarClubes } from "@/lib/clubes";
import {
  contarEscudosPendentes,
  definirEscudoClube,
  sincronizarEscudos,
} from "@/lib/crests.functions";

type Liga = { id: string; nome: string; pais: string };
type Clube = { id: string; nome: string; escudo_url: string | null };

type Props = { leagueIdPadrao?: string | null | undefined };

/** Seção administrativa: sincroniza escudos e permite correção manual. */
export function AdminEscudos({ leagueIdPadrao }: Props) {
  const [ligas, setLigas] = useState<Liga[]>([]);
  const [ligaId, setLigaId] = useState<string | null>(leagueIdPadrao ?? null);
  const [clubes, setClubes] = useState<Clube[]>([]);
  const [pendentes, setPendentes] = useState<number | null>(null);
  const [sincronizando, setSincronizando] = useState(false);
  const [progresso, setProgresso] = useState<string>("");
  const [rascunho, setRascunho] = useState<Record<string, string>>({});
  const [salvandoId, setSalvandoId] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const { data } = await supabase.from("leagues").select("id, nome, pais").order("pais");
      setLigas((data as Liga[]) ?? []);
    })();
    void contarEscudosPendentes({ data: undefined }).then((r) => setPendentes(r.pendentes));
  }, []);

  useEffect(() => {
    if (leagueIdPadrao && !ligaId) setLigaId(leagueIdPadrao);
  }, [leagueIdPadrao, ligaId]);

  const carregarLista = useCallback(async (id: string | null) => {
    if (!id) return setClubes([]);
    const { data } = await supabase
      .from("clubs")
      .select("id, nome, escudo_url")
      .eq("league_id", id)
      .order("nome");
    setClubes((data as Clube[]) ?? []);
    setRascunho({});
  }, []);

  useEffect(() => {
    void carregarLista(ligaId);
  }, [ligaId, carregarLista]);

  async function atualizarPendentes() {
    try {
      const { pendentes: p } = await contarEscudosPendentes({ data: undefined });
      setPendentes(p);
      return p;
    } catch {
      return pendentes ?? 0;
    }
  }

  async function sincronizar() {
    setSincronizando(true);
    setProgresso("Consultando clubes sem escudo…");
    try {
      let voltas = 0;
      let restantes = await atualizarPendentes();
      if (restantes === 0) {
        toast.success("Todos os clubes já têm escudo.");
      }
      while (restantes > 0 && voltas < 40) {
        setProgresso(`Sincronizando… ${restantes} clube(s) pendente(s)`);
        voltas++;

        // Cada lote tem até 3 tentativas; falhas de rede não interrompem o processo.
        let resultado: Awaited<ReturnType<typeof sincronizarEscudos>> | null = null;
        for (let tentativa = 1; tentativa <= 3; tentativa++) {
          try {
            resultado = await sincronizarEscudos({ data: { limite: 10, delayMs: 2000 } });
            break;
          } catch (e) {
            console.error("Falha no lote de escudos (tentativa " + tentativa + ")", e);
            if (tentativa === 3) break;
            setProgresso(`Falha no lote — nova tentativa (${tentativa + 1}/3) em 3s…`);
            await new Promise((r) => setTimeout(r, 3000));
          }
        }

        if (!resultado) {
          toast.error("Lote falhou 3 vezes. Você pode retomar a sincronização depois.");
          break;
        }
        if (resultado.processados === 0) break;
        restantes = resultado.pendentes;
        setPendentes(restantes);
        if (resultado.atualizados === 0 && resultado.naoEncontrados === resultado.processados) {
          toast.info("Os clubes restantes não foram encontrados na base externa.");
          break;
        }
      }
      await carregarClubes(true);
      await carregarLista(ligaId);
      const finais = await atualizarPendentes();
      if (finais === 0) toast.success("Sincronização concluída: nenhum clube pendente.");
      else toast.info(`Sincronização pausada: ainda há ${finais} clube(s) pendente(s).`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao sincronizar escudos.");
      void atualizarPendentes();
    } finally {
      setProgresso("");
      setSincronizando(false);
    }
  }

  async function salvarEscudo(clube: Clube) {
    const url = rascunho[clube.id];
    if (url === undefined) return;
    setSalvandoId(clube.id);
    try {
      await definirEscudoClube({ data: { clubId: clube.id, url } });
      await carregarClubes(true);
      await carregarLista(ligaId);
      toast.success(`Escudo do ${clube.nome} atualizado.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível salvar o escudo.");
    } finally {
      setSalvandoId(null);
    }
  }

  return (
    <Card className="hq-card">
      <CardHeader>
        <CardTitle className="font-display text-2xl tracking-wide">Escudos dos clubes</CardTitle>
        <p className="text-sm text-muted-foreground">
          Busca automática de escudos na base pública TheSportsDB.
          {pendentes !== null ? ` ${pendentes} clube(s) sem escudo.` : ""}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={() => void sincronizar()} disabled={sincronizando}>
            <RefreshCw className={`mr-2 h-4 w-4 ${sincronizando ? "animate-spin" : ""}`} />
            {sincronizando ? "Sincronizando…" : "Sincronizar escudos"}
          </Button>
          {progresso ? <span className="text-xs text-muted-foreground">{progresso}</span> : null}
        </div>

        <div className="grid gap-2 sm:max-w-xs">
          <Select value={ligaId ?? ""} onValueChange={(v) => setLigaId(v)}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione a liga" />
            </SelectTrigger>
            <SelectContent>
              {ligas.map((l) => (
                <SelectItem key={l.id} value={l.id}>
                  {l.nome} · {l.pais}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          {clubes.map((c) => (
            <div key={c.id} className="flex flex-wrap items-center gap-2 rounded-lg border p-2">
              <ClubBadge
                nome={c.nome}
                escudoUrl={c.escudo_url}
                tamanho="md"
                className="w-52 shrink-0 text-sm"
              />
              <Input
                className="min-w-40 flex-1"
                placeholder="Escudo (URL)"
                value={rascunho[c.id] ?? c.escudo_url ?? ""}
                onChange={(e) => setRascunho((r) => ({ ...r, [c.id]: e.target.value }))}
              />
              <Button
                size="sm"
                variant="outline"
                disabled={rascunho[c.id] === undefined || salvandoId === c.id}
                onClick={() => void salvarEscudo(c)}
              >
                <Save className="mr-1 h-4 w-4" /> Salvar
              </Button>
            </div>
          ))}
          {ligaId && clubes.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum clube nesta liga.</p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
