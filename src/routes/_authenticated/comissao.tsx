import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/comissao")({
  head: () => ({
    meta: [
      { title: "Comissão Técnica | Carreira FC Manager" },
      { name: "description", content: "Sua equipe de trabalho nos bastidores." },
      { property: "og:title", content: "Comissão Técnica | Carreira FC Manager" },
      { property: "og:description", content: "Sua equipe de trabalho nos bastidores." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ComissaoPage,
});

function ComissaoPage() {
  return (
    <AppShell titulo="Comissão Técnica">
      <div className="pitch-lines min-h-full px-4 py-8 sm:px-8">
        <div className="mx-auto max-w-4xl">
          <h1 className="text-gradient-pitch text-4xl">Comissão técnica</h1>
          <Card className="mt-6 border-dashed">
            <CardContent className="py-12 text-center text-sm text-muted-foreground">
              Sua equipe de trabalho nos bastidores. Esta seção entra no ar nos próximos passos da construção.
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
