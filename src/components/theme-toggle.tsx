import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

const CHAVE = "carreira:tema";

/** Alterna entre o tema escuro (padrão) e o tema claro. */
export function ThemeToggle() {
  const [claro, setClaro] = useState(false);

  useEffect(() => {
    const salvo = window.localStorage.getItem(CHAVE);
    const usarClaro = salvo === "claro";
    setClaro(usarClaro);
    document.documentElement.classList.toggle("light", usarClaro);
  }, []);

  function alternar() {
    const proximo = !claro;
    setClaro(proximo);
    document.documentElement.classList.toggle("light", proximo);
    window.localStorage.setItem(CHAVE, proximo ? "claro" : "escuro");
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={alternar}
      aria-label={claro ? "Ativar modo escuro" : "Ativar modo claro"}
      title={claro ? "Modo escuro" : "Modo claro"}
    >
      {claro ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
    </Button>
  );
}
