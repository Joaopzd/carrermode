import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar | Carreira FC Manager" },
      {
        name: "description",
        content:
          "Acesse sua conta para gerenciar seus saves de modo carreira: elenco, partidas, transferências e objetivos da diretoria.",
      },
      { property: "og:title", content: "Entrar | Carreira FC Manager" },
      {
        property: "og:description",
        content: "Acesse sua conta e continue sua trajetória no modo carreira.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [username, setUsername] = useState("");
  const [esqueci, setEsqueci] = useState(false);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
    setLoading(false);
    if (error) toast.error(error.message);
  }

  async function recuperar(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) {
      toast.error("Informe seu email.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) toast.error(error.message);
    else toast.success("Se o email existir, enviamos um link para redefinir a senha.");
  }


  async function cadastrar(e: React.FormEvent) {
    e.preventDefault();
    const handle = username.trim().toLowerCase();
    if (!/^[a-z0-9_]{3,20}$/.test(handle)) {
      toast.error("Nome de usuário: 3-20 caracteres, apenas letras, números e _");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password: senha,
      options: {
        emailRedirectTo: window.location.origin,
        data: { username: handle, display_name: handle },
      },
    });
    setLoading(false);
    if (error) toast.error(error.message);
    else toast.success("Conta criada!");
  }

  async function google() {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error("Não foi possível entrar com o Google.");
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/dashboard" });
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-6 block text-center">
          <span className="font-display text-3xl tracking-wide text-primary">CARREIRA FC</span>
        </Link>
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Acesse sua carreira</CardTitle>
            <CardDescription>Entre ou crie uma conta para gerenciar seus saves.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="secondary" className="w-full" onClick={google} disabled={loading}>
              Continuar com Google
            </Button>

            <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
              <span className="h-px flex-1 bg-border" />
              OU
              <span className="h-px flex-1 bg-border" />
            </div>

            <Tabs defaultValue="entrar">
              <TabsList className="w-full">
                <TabsTrigger value="entrar" className="flex-1">
                  Entrar
                </TabsTrigger>
                <TabsTrigger value="cadastrar" className="flex-1">
                  Cadastrar
                </TabsTrigger>
              </TabsList>

              <TabsContent value="entrar">
                {esqueci ? (
                  <form onSubmit={recuperar} className="space-y-4 pt-4">
                    <p className="text-sm text-muted-foreground">
                      Informe o email da sua conta e enviaremos um link para criar uma nova senha.
                    </p>
                    <div className="space-y-2">
                      <Label htmlFor="rec-email">Email</Label>
                      <Input
                        id="rec-email"
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}>
                      Enviar link de recuperação
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      className="w-full"
                      onClick={() => setEsqueci(false)}
                    >
                      Voltar para o login
                    </Button>
                  </form>
                ) : (
                  <form onSubmit={entrar} className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label htmlFor="login-email">Email</Label>
                      <Input
                        id="login-email"
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="login-senha">Senha</Label>
                        <button
                          type="button"
                          className="text-xs text-muted-foreground underline"
                          onClick={() => setEsqueci(true)}
                        >
                          Esqueci minha senha
                        </button>
                      </div>
                      <Input
                        id="login-senha"
                        type="password"
                        required
                        value={senha}
                        onChange={(e) => setSenha(e.target.value)}
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}>
                      Entrar
                    </Button>
                  </form>
                )}
              </TabsContent>


              <TabsContent value="cadastrar">
                <form onSubmit={cadastrar} className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="reg-user">Nome de usuário</Label>
                    <Input
                      id="reg-user"
                      required
                      placeholder="ex: tecnico_2026"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reg-email">Email</Label>
                    <Input
                      id="reg-email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reg-senha">Senha</Label>
                    <Input
                      id="reg-senha"
                      type="password"
                      required
                      minLength={6}
                      value={senha}
                      onChange={(e) => setSenha(e.target.value)}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    Criar conta
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
