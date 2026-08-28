import type { LucideIcon } from "lucide-react";
import { AlertTriangle, Construction, Flag } from "lucide-react";
import { motion } from "framer-motion";
import { Link, useRouter } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { transicaoRapida } from "@/components/motion";

type Props = {
  icone: LucideIcon;
  titulo: string;
  texto: string;
  children?: React.ReactNode;
};

/** Área central padrão das telas de sistema (404, erro, em breve). */
export function SystemPage({ icone: Icone, titulo, texto, children }: Props) {
  return (
    <div className="pitch-lines flex min-h-full items-center justify-center px-4 py-16">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={transicaoRapida}
        className="max-w-md text-center"
      >
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-border bg-card">
          <Icone className="h-7 w-7 text-primary" aria-hidden />
        </span>
        <h1 className="mt-5 font-display text-3xl tracking-wide text-foreground">{titulo}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{texto}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">{children}</div>
      </motion.div>
    </div>
  );
}

export function BotaoDashboard() {
  return (
    <Button asChild>
      <Link to="/dashboard">Voltar ao Dashboard</Link>
    </Button>
  );
}

/** 404 — rota não encontrada. */
export function PaginaNaoEncontrada() {
  return (
    <SystemPage
      icone={Flag}
      titulo="Página fora de campo"
      texto="O endereço que você tentou acessar não foi encontrado."
    >
      <BotaoDashboard />
    </SystemPage>
  );
}

/** Fallback de erro genérico. */
export function PaginaErro({ reset }: { reset?: (() => void) | undefined }) {
  const router = useRouter();
  return (
    <SystemPage
      icone={AlertTriangle}
      titulo="Algo deu errado"
      texto="Não conseguimos carregar essa parte do app. Tente novamente em instantes."
    >
      <Button
        onClick={() => {
          void router.invalidate();
          reset?.();
        }}
      >
        Tentar novamente
      </Button>
      <Button asChild variant="outline">
        <Link to="/dashboard">Voltar ao Dashboard</Link>
      </Button>
    </SystemPage>
  );
}

/** Funcionalidade ainda não implementada. */
export function PaginaEmBreve() {
  return (
    <SystemPage
      icone={Construction}
      titulo="Em construção"
      texto="Essa funcionalidade ainda está sendo implementada."
    >
      <BotaoDashboard />
    </SystemPage>
  );
}
