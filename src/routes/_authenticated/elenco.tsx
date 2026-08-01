import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/elenco")({
  head: () => ({
    meta: [
      { title: "Elenco | Carreira FC Manager" },
      { name: "description", content: "Ficha completa de todos os seus jogadores." },
      { property: "og:title", content: "Elenco | Carreira FC Manager" },
      { property: "og:description", content: "Ficha completa de todos os seus jogadores." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ElencoPage,
});

function ElencoPage() {
  return (
    <AppShell titulo="Elenco">
      <div className="pitch-lines min-h-full px-4 py-8 sm:px-8">
        <div className="mx-auto max-w-4xl">
          <h1 className="text-gradient-pitch text-4xl">Elenco</h1>
          <Card className="mt-6 border-dashed">
            <CardContent className="py-12 text-center text-sm text-muted-foreground">
              Ficha completa de todos os seus jogadores. Esta seção entra no ar nos próximos passos da construção.
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
