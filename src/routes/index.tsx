import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Carreira FC Manager | Companion do modo carreira" },
      {
        name: "description",
        content:
          "Companion app para gerenciar seu modo carreira: elenco, partidas, estatísticas, transferências, tabela e objetivos da diretoria.",
      },
      { property: "og:title", content: "Carreira FC Manager" },
      {
        property: "og:description",
        content: "Gerencie seu modo carreira de futebol: elenco, partidas, transferências e mais.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center">
      <span className="mb-4 rounded-full border border-border px-3 py-1 text-xs tracking-widest text-muted-foreground uppercase">
        Companion do modo carreira
      </span>
      <h1 className="max-w-2xl text-5xl leading-none text-foreground sm:text-7xl">
        Carreira <span className="text-primary">FC</span> Manager
      </h1>
      <p className="mt-5 max-w-lg text-muted-foreground">
        Registre elenco, partidas, estatísticas, transferências, classificação e os objetivos da
        diretoria — tudo salvo na sua conta.
      </p>
      <Link
        to="/auth"
        className="mt-8 inline-flex items-center justify-center rounded-md bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
      >
        Começar
      </Link>
    </main>
  );
}
