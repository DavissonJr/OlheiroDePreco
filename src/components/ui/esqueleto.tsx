import clsx from "clsx";

export function Esqueleto({ className }: { className?: string }) {
  return <div className={clsx("animate-pulse rounded-xl bg-line/60", className)} aria-hidden />;
}
