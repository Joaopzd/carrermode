import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/calendario")({
  head: () => ({
    meta: [
      { title: "Calendário | Carreira FC Manager" },
      { name: "description", content: "Agenda completa de jogos da sua temporada." },
      { property: "og:title", content: "Calendário | Carreira FC Manager" },
      { property: "og:description", content: "Agenda completa de jogos da sua temporada." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CalendarioPage,
});

function CalendarioPage() {
  return (
    <AppShell titulo="Calendário">
      <div className="pitch-lines min-h-full px-4 py-8 sm:px-8">
        <div className="mx-auto max-w-4xl">
          <h1 className="text-gradient-pitch text-4xl">Calendário da temporada</h1>
          <Card className="mt-6 border-dashed">
            <CardContent className="py-12 text-center text-sm text-muted-foreground">
              Agenda completa de jogos da sua temporada. Esta seção entra no ar nos próximos passos da construção.
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
