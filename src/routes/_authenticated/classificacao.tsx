import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/classificacao")({
  head: () => ({
    meta: [
      { title: "Classificação | Carreira FC Manager" },
      { name: "description", content: "Tabela da liga atualizada por rodada." },
      { property: "og:title", content: "Classificação | Carreira FC Manager" },
      { property: "og:description", content: "Tabela da liga atualizada por rodada." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ClassificacaoPage,
});

function ClassificacaoPage() {
  return (
    <AppShell titulo="Classificação">
      <div className="pitch-lines min-h-full px-4 py-8 sm:px-8">
        <div className="mx-auto max-w-4xl">
          <h1 className="text-gradient-pitch text-4xl">Classificação</h1>
          <Card className="mt-6 border-dashed">
            <CardContent className="py-12 text-center text-sm text-muted-foreground">
              Tabela da liga atualizada por rodada. Esta seção entra no ar nos próximos passos da construção.
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
