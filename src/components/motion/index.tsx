import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useInView, type Transition } from "framer-motion";
import { cn } from "@/lib/utils";

export const transicaoRapida: Transition = { duration: 0.25, ease: [0.22, 1, 0.36, 1] };

/** Fade + slide vertical leve na entrada de cada tela. */
export function PageTransition({
  chave,
  children,
  className,
}: {
  chave: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={chave}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={transicaoRapida}
        className={className}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

/** Item de lista com fade-in escalonado (delay incremental). */
export function StaggerItem({
  index = 0,
  step = 0.04,
  max = 0.5,
  children,
  className,
}: {
  index?: number;
  step?: number;
  max?: number;
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...transicaoRapida, delay: Math.min(index * step, max) }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/** Crossfade entre duas visualizações (ex.: grade x lista). */
export function CrossFade({
  chave,
  children,
  className,
}: {
  chave: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={chave}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
        className={className}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

/** Slide horizontal leve ao trocar de aba. */
export function TabSlide({
  chave,
  children,
  className,
}: {
  chave: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={chave}
        initial={{ opacity: 0, x: 12 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -12 }}
        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        className={className}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

/** Expansão/colapso de altura suave. */
export function Collapse({ aberto, children }: { aberto: boolean; children: ReactNode }) {
  return (
    <AnimatePresence initial={false}>
      {aberto ? (
        <motion.div
          key="conteudo"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
          style={{ overflow: "hidden" }}
        >
          {children}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

/** Card clicável com hover em scale + sombra. */
export function HoverCard({
  children,
  className,
  onClick,
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      onClick={onClick}
      className={cn("transition-shadow duration-150 hover:shadow-xl", className)}
    >
      {children}
    </motion.div>
  );
}

/** Contagem animada de 0 até o valor final. */
export function CountUp({
  valor,
  duracao = 900,
  decimais = 0,
  prefixo = "",
  sufixo = "",
  className,
}: {
  valor: number;
  duracao?: number;
  decimais?: number;
  prefixo?: string;
  sufixo?: string;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const visivel = useInView(ref, { once: true, amount: 0.4 });
  const [atual, setAtual] = useState(0);

  useEffect(() => {
    if (!visivel) return;
    let frame = 0;
    const inicio = performance.now();
    const passo = (t: number) => {
      const p = Math.min(1, (t - inicio) / duracao);
      const eased = 1 - Math.pow(1 - p, 3);
      setAtual(valor * eased);
      if (p < 1) frame = requestAnimationFrame(passo);
    };
    frame = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(frame);
  }, [visivel, valor, duracao]);

  return (
    <span ref={ref} className={cn("tabular-nums", className)}>
      {prefixo}
      {atual.toLocaleString("pt-BR", {
        minimumFractionDigits: decimais,
        maximumFractionDigits: decimais,
      })}
      {sufixo}
    </span>
  );
}
