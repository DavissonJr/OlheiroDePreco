/* eslint-disable @next/next/no-img-element -- imagens fixas e pequenas em public/, sem ganho com next/image */
import clsx from "clsx";

// Marca: o olho com a etiqueta de preço, no quadrado azul-marinho (mesmo desenho do favicon).
export function MarcaOlheiro({ className }: { className?: string }) {
  return <img src="/marca.png" alt="" aria-hidden="true" width={256} height={256} className={className} />;
}

// Logo completo. No tema escuro, troca pela versão com o azul-marinho claro.
export function Logo({ className, tamanho = "md" }: { className?: string; tamanho?: "sm" | "md" }) {
  return (
    <picture className={clsx("inline-flex shrink-0", className)}>
      <source srcSet="/logo-escuro.png" media="(prefers-color-scheme: dark)" />
      <img
        src="/logo.png"
        alt="Olheiro de Preço"
        width={1155}
        height={358}
        className={clsx("w-auto", tamanho === "sm" ? "h-8" : "h-10")}
      />
    </picture>
  );
}
