import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { History } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { ClubBadge } from "@/components/club-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useSaveAtual } from "@/lib/use-save";
import { rotuloMotivoStint } from "@/lib/stint";
import { ArquivoPassagem } from "./arquivo";

export const Route = createFileRoute("/_authenticated/historico-carreira")({
  head: () => ({ meta: [
    { title: "Histórico de carreira | Carreira FC Manager" },
    { name: "description", content: "Reveja clubes, períodos, motivos de saída, temporadas e troféus de cada passagem da carreira." },
    { property: "og:title", content: "Histórico de carreira | Carreira FC Manager" },
    { property: "og:description", content: "O histórico completo das suas passagens por clubes de futebol." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ] }), component: HistoricoCarreiraPage,
});

type Passagem = { id: string; data_inicio: string; data_fim: string | null; motivo_saida: string | null; escudo_url: string | null; clubs: { nome: string; escudo_url: string | null } | null; temporadas: number; trofeus: number };
const dia = (v: string | null) => v ? new Date(`${v}T12:00:00`).toLocaleDateString("pt-BR") : "—";

function HistoricoCarreiraPage() {
  const { save, carregando: carregandoSave } = useSaveAtual();
  const [passagens, setPassagens] = useState<Passagem[]>([]);
  const [aberta, setAberta] = useState<Passagem | null>(null);
  const [carregando, setCarregando] = useState(true);
  useEffect(() => {
    if (!save) { if (!carregandoSave) setCarregando(false); return; }
    let ativo = true;
    void (async () => {
      try {
        const { data, error } = await supabase.from("stints").select("id, data_inicio, data_fim, motivo_saida, escudo_url, clubs(nome, escudo_url)").eq("save_id", save.id).eq("status", "encerrada").order("data_inicio", { ascending: false });
        if (error) throw error;
        const lista = await Promise.all((data ?? []).map(async (st) => {
          const [seasons, trophies] = await Promise.all([
            supabase.from("seasons").select("id", { count: "exact", head: true }).eq("stint_id", st.id),
            supabase.from("trophy_gallery").select("id", { count: "exact", head: true }).eq("stint_id", st.id).eq("e_meu_clube_campeao", true),
          ]);
          if (seasons.error) throw seasons.error;
          if (trophies.error) throw trophies.error;
          return { ...st, temporadas: seasons.count ?? 0, trofeus: trophies.count ?? 0 };
        }));
        if (ativo) setPassagens(lista);
      } catch { toast.error("Não foi possível carregar o histórico de carreira."); }
      finally { if (ativo) setCarregando(false); }
    })();
    return () => { ativo = false; };
  }, [save, carregandoSave]);
  if (aberta) return <><div className="border-b border-border bg-background p-4"><Button variant="outline" onClick={() => setAberta(null)}>Voltar ao histórico de carreira</Button><span className="ml-3 text-sm text-muted-foreground">{aberta.clubs?.nome}</span></div><ArquivoPassagem stintId={aberta.id} clubeNome={aberta.clubs?.nome ?? null} /></>;
  return <AppShell titulo="Histórico de Carreira"><section className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-8"><h1 className="text-gradient-pitch text-4xl">Histórico de carreira</h1>{carregando ? <Skeleton className="h-48 w-full" /> : passagens.length === 0 ? <div className="py-12 text-center"><History className="mx-auto mb-3 h-8 w-8 text-muted-foreground" /><p className="text-muted-foreground">Nenhuma passagem encerrada.</p></div> : <div className="grid gap-4 sm:grid-cols-2">{passagens.map((st) => <Card key={st.id}><CardContent className="space-y-3 py-5"><ClubBadge nome={st.clubs?.nome ?? null} escudoUrl={st.escudo_url ?? st.clubs?.escudo_url ?? null} tamanho="lg" /><p className="text-sm text-muted-foreground">{dia(st.data_inicio)} — {dia(st.data_fim)}</p><p className="text-sm">{rotuloMotivoStint(st.motivo_saida)}</p><p className="text-sm text-muted-foreground">{st.temporadas} temporada(s) · {st.trofeus} troféu(s)</p><Button variant="outline" onClick={() => setAberta(st)}>Ver temporadas</Button></CardContent></Card>)}</div>}</section></AppShell>;
}