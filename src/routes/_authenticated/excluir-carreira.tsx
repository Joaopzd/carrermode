import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useSaveAtual } from "@/lib/use-save";

export const Route = createFileRoute("/_authenticated/excluir-carreira")({
  head: () => ({ meta: [
    { title: "Excluir carreira | Carreira FC Manager" },
    { name: "description", content: "Exclua sua carreira e comece uma nova, mantendo sua conta." },
    { property: "og:title", content: "Excluir carreira | Carreira FC Manager" },
    { property: "og:description", content: "Reinicie sua trajetória com confirmação de exclusão da carreira." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: ExcluirCarreiraPage,
});

function ExcluirCarreiraPage() {
  const { save, carregando } = useSaveAtual();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [aberto, setAberto] = useState(false);
  const [confirmacao, setConfirmacao] = useState("");
  const [excluindo, setExcluindo] = useState(false);

  async function excluir() {
    if (!save || confirmacao !== "EXCLUIR" || excluindo) return;
    setExcluindo(true);
    try {
      const { data: auth, error: authError } = await supabase.auth.getUser();
      if (authError || !auth.user) throw new Error("Entre novamente para excluir sua carreira.");
      await queryClient.cancelQueries();
      // One owner-scoped statement; existing FK cascades delete the entire career atomically.
      const { data, error } = await supabase.from("saves").delete()
        .eq("id", save.id).eq("user_id", auth.user.id).select("id").single();
      if (error || !data) throw new Error("Não foi possível excluir a carreira. Tente novamente.");
      queryClient.clear();
      toast.success("Carreira excluída. Vamos começar do zero!");
      await navigate({ to: "/onboarding", replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível excluir a carreira.");
      setExcluindo(false);
    }
  }

  return <AppShell titulo="Excluir carreira">
    <section className="mx-auto max-w-2xl space-y-6 px-4 py-8 sm:px-8">
      <Trash2 className="h-8 w-8 text-destructive" />
      <h1 className="text-4xl">Excluir carreira e começar do zero</h1>
      {carregando ? <p className="text-muted-foreground">Carregando carreira…</p> : save ? <>
        <p>Clube atual: <strong>{save.clubeNome ?? "Sem clube"}</strong> · {save.temporada}</p>
        <p className="text-muted-foreground">Todas as passagens, temporadas, treinador, comissão, jogadores, partidas, estatísticas, transferências, metas, notícias e troféus desta carreira serão excluídos permanentemente.</p>
        <p className="text-muted-foreground">Sua conta e o catálogo de clubes e ligas serão mantidos. Esta ação não pode ser desfeita.</p>
        <Button variant="destructive" onClick={() => { setConfirmacao(""); setAberto(true); }}><Trash2 className="mr-2 h-4 w-4" />Excluir carreira</Button>
      </> : <><p>Nenhuma carreira encontrada.</p><Button asChild><Link to="/onboarding">Começar nova carreira</Link></Button></>}
    </section>
    <AlertDialog open={aberto} onOpenChange={(value) => { if (!excluindo) setAberto(value); }}>
      <AlertDialogContent>
        <AlertDialogHeader><AlertDialogTitle>Excluir toda a carreira?</AlertDialogTitle><AlertDialogDescription>O histórico de todos os clubes desta carreira será apagado definitivamente. Sua conta será mantida.</AlertDialogDescription></AlertDialogHeader>
        <div className="space-y-2"><Label htmlFor="confirmar-exclusao">Digite EXCLUIR para confirmar</Label><Input id="confirmar-exclusao" value={confirmacao} onChange={(e) => setConfirmacao(e.target.value)} disabled={excluindo} autoComplete="off" /></div>
        <AlertDialogFooter><AlertDialogCancel disabled={excluindo}>Cancelar</AlertDialogCancel><Button variant="destructive" disabled={confirmacao !== "EXCLUIR" || excluindo} onClick={excluir}>{excluindo ? "Excluindo…" : "Excluir definitivamente"}</Button></AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </AppShell>;
}