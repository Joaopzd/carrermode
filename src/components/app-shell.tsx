import type { ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";


export function AppShell({ titulo, children }: { titulo: string; children: ReactNode }) {
  const navigate = useNavigate();

  async function sair() {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <div className="flex flex-1 flex-col">
          <header className="flex h-14 items-center gap-3 border-b border-border px-3">
            <SidebarTrigger />
            <span className="font-display text-xl tracking-wide">{titulo}</span>
            <div className="ml-auto flex items-center gap-1">
              <ThemeToggle />
              <Button variant="ghost" size="sm" onClick={sair}>
                Sair
              </Button>
            </div>
          </header>

          <main className="hq-surface flex-1">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
