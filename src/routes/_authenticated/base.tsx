import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/base")({
  head: () => ({
    meta: [
      { title: "Categorias de Base | Carreira FC Manager" },
      { name: "description", content: "Promoções e joias da academia do clube." },
      { property: "og:title", content: "Categorias de Base | Carreira FC Manager" },
      { property: "og:description", content: "Promoções e joias da academia do clube." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: BasePage,
});

function BasePage() {
  return (
    <AppShell titulo="Categorias de Base">
      <div className="pitch-lines min-h-full px-4 py-8 sm:px-8">
        <div className="mx-auto max-w-4xl">
          <h1 className="text-gradient-pitch text-4xl">Categorias de base</h1>
          <Card className="mt-6 border-dashed">
            <CardContent className="py-12 text-center text-sm text-muted-foreground">
              Promoções e joias da academia do clube. Esta seção entra no ar nos próximos passos da construção.
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
