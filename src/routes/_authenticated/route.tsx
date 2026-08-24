import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { SplashScreen } from "@/components/loading";
import { useSaveAtual } from "@/lib/use-save";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AreaAutenticada,
});

function AreaAutenticada() {
  const { save, carregando } = useSaveAtual();

  return (
    <>
      <AnimatePresence>
        {carregando ? (
          <SplashScreen key="splash" escudo={save?.escudo ?? null} clube={save?.clubeNome ?? null} />
        ) : null}
      </AnimatePresence>
      <Outlet />
    </>
  );
}
