import clsx from "clsx";

// Marca: um olho atento. A íris é cobalto (a cor das suas ações no app)
// e o brilho é a bolinha amarela das etiquetas de preço dos concorrentes.
export function MarcaOlheiro({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect width="32" height="32" rx="9" fill="var(--cobalt)" />
      <path d="M4 16c3.3-5.6 7.3-8.2 12-8.2s8.7 2.6 12 8.2c-3.3 5.6-7.3 8.2-12 8.2S7.3 21.6 4 16Z" fill="#fff" />
      <circle cx="16" cy="16" r="5.6" fill="var(--cobalt)" />
      <circle cx="16" cy="16" r="2.5" fill="#0d1531" />
      <circle cx="18.6" cy="13.5" r="1.7" fill="var(--tag)" />
    </svg>
  );
}

export function Logo({
  className,
  tamanho = "md",
  curto = false,
}: {
  className?: string;
  tamanho?: "sm" | "md";
  curto?: boolean;
}) {
  return (
    <span className={clsx("inline-flex items-center gap-2 font-display font-bold text-ink", className)}>
      <MarcaOlheiro className={tamanho === "sm" ? "size-7 shrink-0" : "size-8 shrink-0"} />
      <span className={clsx("whitespace-nowrap", tamanho === "sm" ? "text-lg" : "text-xl")}>
        {curto ? "Olheiro" : "Olheiro de Preço"}
      </span>
    </span>
  );
}
