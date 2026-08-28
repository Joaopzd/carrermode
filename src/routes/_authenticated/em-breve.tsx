import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { PaginaEmBreve } from "@/components/system-page";

export const Route = createFileRoute("/_authenticated/em-breve")({
  head: () => ({
    meta: [
      { title: "Em construção | Carreira FC Manager" },
      {
        name: "description",
        content: "Essa funcionalidade do Carreira FC Manager ainda está sendo implementada.",
      },
      { property: "og:title", content: "Em construção | Carreira FC Manager" },
      {
        property: "og:description",
        content: "Essa funcionalidade do Carreira FC Manager ainda está sendo implementada.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <AppShell titulo="Em construção">
      <PaginaEmBreve />
    </AppShell>
  ),
});
