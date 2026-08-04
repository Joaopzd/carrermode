import { cn } from "@/lib/utils";
import { isoDoPais } from "@/lib/paises";

type Props = {
  pais?: string | null;
  className?: string;
  /** Mostra o nome do país ao lado da bandeira */
  comNome?: boolean;
};

/**
 * Bandeira renderizada por imagem (flagcdn), evitando emojis que não
 * aparecem no Windows.
 */
export function Bandeira({ pais, className, comNome = false }: Props) {
  const iso = isoDoPais(pais);
  if (!iso) return comNome ? <span className={className}>{pais ?? "—"}</span> : null;

  const img = (
    <img
      src={`https://flagcdn.com/w40/${iso}.png`}
      srcSet={`https://flagcdn.com/w80/${iso}.png 2x`}
      alt={`Bandeira ${pais}`}
      loading="lazy"
      width={20}
      height={14}
      className={cn(
        "inline-block h-3.5 w-5 shrink-0 rounded-[2px] object-cover align-[-1px] ring-1 ring-border/60",
        !comNome && className,
      )}
    />
  );

  if (!comNome) return img;

  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      {img}
      <span>{pais}</span>
    </span>
  );
}
