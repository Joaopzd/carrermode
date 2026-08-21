import { AnimatePresence, motion } from "framer-motion";
import { useRouterState } from "@tanstack/react-router";
import { useCarregamentosAtivos } from "@/lib/loading-bus";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/** Barra fina de progresso no topo da tela. */
export function TopProgressBar() {
  const navegando = useRouterState({ select: (s) => s.status === "pending" || s.isLoading });
  const ativos = useCarregamentosAtivos();
  const visivel = navegando || ativos > 0;

  return (
    <AnimatePresence>
      {visivel ? (
        <motion.div
          className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-0.5 overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="h-full bg-primary shadow-[0_0_8px_var(--color-primary)]"
            initial={{ width: "8%" }}
            animate={{ width: ["8%", "62%", "88%"] }}
            transition={{ duration: 2.2, ease: "easeOut" }}
          />
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

/** Splash inicial com escudo do clube (ou nome do app). */
export function SplashScreen({
  escudo,
  clube,
}: {
  escudo?: string | null;
  clube?: string | null;
}) {
  return (
    <motion.div
      className="fixed inset-0 z-[80] flex flex-col items-center justify-center gap-4 bg-background"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
    >
      <motion.div
        animate={{ scale: [1, 1.06, 1], opacity: [0.85, 1, 0.85] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
        className="flex flex-col items-center gap-3"
      >
        {escudo ? (
          <img src={escudo} alt={`Escudo do ${clube ?? "clube"}`} className="h-24 w-24 object-contain" />
        ) : (
          <span className="font-display text-4xl tracking-wide text-primary">Career Mode</span>
        )}
        {escudo && clube ? (
          <span className="font-display text-xl tracking-wide">{clube}</span>
        ) : null}
      </motion.div>
      <div className="h-0.5 w-40 overflow-hidden rounded-full bg-muted">
        <motion.div
          className="h-full w-1/3 bg-primary"
          animate={{ x: ["-120%", "320%"] }}
          transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>
    </motion.div>
  );
}

/* ------------------------- Skeletons por tela ------------------------- */

export function SkeletonDashboard() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-28 w-full rounded-xl" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-full rounded-xl" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
      <div className="space-y-2 rounded-xl border border-border p-4">
        <Skeleton className="h-4 w-32" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 py-1.5">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3.5 w-3/4" />
              <Skeleton className="h-3 w-1/3" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonLinhasTabela({ linhas = 8, colunas = 8 }: { linhas?: number; colunas?: number }) {
  return (
    <div className="space-y-2 rounded-xl border border-border p-4">
      <div className="flex gap-3 border-b border-border pb-2">
        {Array.from({ length: colunas }).map((_, i) => (
          <Skeleton key={i} className={cn("h-3.5", i === 0 ? "flex-[2]" : "flex-1")} />
        ))}
      </div>
      {Array.from({ length: linhas }).map((_, l) => (
        <div key={l} className="flex items-center gap-3 py-1.5">
          {Array.from({ length: colunas }).map((_, c) => (
            <Skeleton key={c} className={cn("h-4", c === 0 ? "flex-[2]" : "flex-1")} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function SkeletonCardsElenco({ itens = 8 }: { itens?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: itens }).map((_, i) => (
        <div key={i} className="space-y-3 rounded-xl border border-border p-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-1/3" />
            </div>
            <Skeleton className="h-8 w-10 rounded-lg" />
          </div>
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-4/5" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonListaElenco({ itens = 10 }: { itens?: number }) {
  return <SkeletonLinhasTabela linhas={itens} colunas={6} />;
}

export function SkeletonGraficos({ graficos = 4 }: { graficos?: number }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {Array.from({ length: graficos }).map((_, i) => (
        <div key={i} className="space-y-3 rounded-xl border border-border p-4">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-56 w-full rounded-lg" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonListaItens({ itens = 6 }: { itens?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: itens }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 rounded-xl border border-border p-4">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-3 w-1/4" />
          </div>
          <Skeleton className="h-8 w-16 rounded-lg" />
        </div>
      ))}
    </div>
  );
}
