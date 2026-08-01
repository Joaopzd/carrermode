import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Painel da carreira | Carreira FC Manager" },
      {
        name: "description",
        content: "Painel inicial do seu modo carreira: saves, elenco, partidas e transferências.",
      },
      { property: "og:title", content: "Painel da carreira | Carreira FC Manager" },
      { property: "og:description", content: "Gerencie seus saves de modo carreira." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const navigate = useNavigate();
  const [email, setEmail] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const { data } = await supabase.auth.getUser();
      setEmail(data.user?.email ?? null);
      if (data.user) {
        const { data: perfil } = await supabase
          .from("profiles")
          .select("username")
          .eq("id", data.user.id)
          .maybeSingle();
        setUsername(perfil?.username ?? null);
      }
    })();
  }, []);

  async function sair() {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  }

  return (
    <main className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto max-w-3xl">
        <header className="mb-8 flex items-center justify-between gap-4">
          <h1 className="text-3xl text-primary">Painel da carreira</h1>
          <Button variant="secondary" onClick={sair}>
            Sair
          </Button>
        </header>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Conta conectada</CardTitle>
            <CardDescription>
              A fundação de autenticação e banco de dados está pronta.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <span className="text-muted-foreground">Usuário: </span>
              {username ?? "—"}
            </p>
            <p>
              <span className="text-muted-foreground">Email: </span>
              {email ?? "—"}
            </p>
            <p className="pt-4 text-muted-foreground">
              Próximo passo: as telas de saves, elenco, partidas, transferências e feed.
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
