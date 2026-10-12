import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Repeat } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { CareerOnboarding } from "@/components/career-onboarding";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { useSaveAtual } from "@/lib/use-save";
import { MOTIVOS_SAIDA_STINT, type MotivoSaidaStint } from "@/lib/stint";

export const Route = createFileRoute("/_authenticated/mudar-clube")({
  head: () => ({ meta: [
    { title: "Mudar de clube | Carreira FC Manager" },
    { name: "description", content: "Encerre sua passagem pelo clube e inicie uma nova sem perder o histórico da carreira." },
    { property: "og:title", content: "Mudar de clube | Carreira FC Manager" },
    { property: "og:description", content: "Registre o motivo de saída e monte comissão e elenco do novo clube." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ] }), component: MudarClubePage,
});

function MudarClubePage() {
  const { save, carregando } = useSaveAtual();
  const [motivo, setMotivo] = useState<MotivoSaidaStint | null>(null);
  const [confirmando, setConfirmando] = useState(false);
  const [iniciando, setIniciando] = useState(false);
  if (carregando) return <AppShell titulo="Mudar de clube"><p className="p-8 text-muted-foreground">Carregando carreira…</p></AppShell>;
  if (!save) return <AppShell titulo="Mudar de clube"><div className="space-y-4 p-8"><p>Nenhuma carreira encontrada.</p><Button asChild><Link to="/onboarding">Montar carreira</Link></Button></div></AppShell>;
  if (iniciando || !save.stintId) return <CareerOnboarding saveId={save.id} motivo={motivo} temporadaInicial={save.temporada} />;
  return <AppShell titulo="Mudar de clube">
    <section className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-8">
      <Repeat className="h-8 w-8 text-primary" />
      <h1 className="text-gradient-pitch text-4xl">Encerrar passagem e mudar de clube</h1>
      <p className="text-muted-foreground">Clube atual: <strong className="text-foreground">{save.clubeNome}</strong>. Temporadas, jogadores, partidas, transferências e troféus ficarão preservados no Histórico de Carreira.</p>
      <div className="space-y-2"><Label>Motivo de saída</Label><Select value={motivo ?? ""} onValueChange={(v) => {
        const escolhido = MOTIVOS_SAIDA_STINT.find((m) => m.valor === v);
        if (escolhido) setMotivo(escolhido.valor);
      }}><SelectTrigger><SelectValue placeholder="Selecione o motivo" /></SelectTrigger><SelectContent>{MOTIVOS_SAIDA_STINT.map((m) => <SelectItem key={m.valor} value={m.valor}>{m.rotulo}</SelectItem>)}</SelectContent></Select></div>
      <Button disabled={!motivo} onClick={() => setConfirmando(true)}>Encerrar Passagem e Mudar de Clube</Button>
    </section>
    <AlertDialog open={confirmando} onOpenChange={setConfirmando}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Encerrar a passagem pelo {save.clubeNome}?</AlertDialogTitle><AlertDialogDescription>A temporada atual será arquivada e o treinador continuará na mesma carreira. A mudança só será concluída ao salvar comissão e elenco do novo clube.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => { setConfirmando(false); setIniciando(true); }}>Continuar</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </AppShell>;
}