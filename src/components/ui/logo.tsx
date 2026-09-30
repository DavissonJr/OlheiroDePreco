import clsx from "clsx";

export function MarcaRadar({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect width="32" height="32" rx="9" fill="var(--cobalt)" />
      <circle cx="16" cy="16" r="9.5" fill="none" stroke="#fff" strokeOpacity=".35" strokeWidth="1.6" />
      <circle cx="16" cy="16" r="5" fill="none" stroke="#fff" strokeOpacity=".55" strokeWidth="1.6" />
      <path d="M16 16 L16 6.5 A9.5 9.5 0 0 1 24.2 11.2 Z" fill="#fff" fillOpacity=".9" />
      <circle cx="21.6" cy="19.4" r="2.3" fill="var(--tag)" />
    </svg>
  );
}

export function Logo({ className, tamanho = "md" }: { className?: string; tamanho?: "sm" | "md" }) {
  return (
    <span className={clsx("inline-flex items-center gap-2 font-display font-bold text-ink", className)}>
      <MarcaRadar className={tamanho === "sm" ? "size-7" : "size-8"} />
      <span className={tamanho === "sm" ? "text-lg" : "text-xl"}>Radar</span>
    </span>
  );
}
