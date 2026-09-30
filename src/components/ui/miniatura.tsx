import clsx from "clsx";

const CORES = ["#dfe6ff", "#ffeebe", "#dcf3ea", "#fde2e1", "#e9e1ff", "#dff0ff"];
const TINTAS = ["#2448f0", "#8a5a00", "#0f8a61", "#b3302e", "#6040c8", "#1667b5"];

// Foto do anúncio; sem foto, um bloco com as iniciais.
export function Miniatura({ src, titulo, className }: { src?: string | null; titulo: string; className?: string }) {
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt="" className={clsx("rounded-xl bg-white object-contain ring-1 ring-line", className)} loading="lazy" />;
  }
  const soma = [...titulo].reduce((s, c) => s + c.charCodeAt(0), 0);
  const i = soma % CORES.length;
  const iniciais = titulo
    .split(/\s+/)
    .filter((p) => p.length > 2)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join("");
  return (
    <span
      aria-hidden
      className={clsx("grid place-items-center rounded-xl font-display text-sm font-bold", className)}
      style={{ background: CORES[i], color: TINTAS[i] }}
    >
      {iniciais}
    </span>
  );
}
