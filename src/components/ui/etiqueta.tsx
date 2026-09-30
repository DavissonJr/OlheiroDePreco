import clsx from "clsx";
import { reais } from "@/lib/format";

type Tom = "rival" | "mine" | "drop" | "quiet";

// A etiqueta de preço é a peça visual central do Olheiro de Preço:
// amarelo = concorrente, cobalto = você, vermelho = queda que te passou.
export function Etiqueta({
  valor,
  tom = "rival",
  tamanho = "md",
  riscado,
  riscadoSoDesktop,
  className,
}: {
  valor: number | null;
  tom?: Tom;
  tamanho?: "sm" | "md" | "lg" | "xl";
  riscado?: number | null;
  riscadoSoDesktop?: boolean;
  className?: string;
}) {
  const tamanhos = { sm: "text-[13px]", md: "text-[15px]", lg: "text-lg", xl: "text-2xl sm:text-[28px]" };
  return (
    <span className={clsx("price-tag num", tamanhos[tamanho], className)} data-tone={tom}>
      {riscado != null && (
        <s className={clsx("text-[0.72em] font-semibold opacity-70", riscadoSoDesktop && "max-sm:hidden")}>{reais(riscado)}</s>
      )}
      <span>{reais(valor)}</span>
    </span>
  );
}
