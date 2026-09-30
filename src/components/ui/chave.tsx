"use client";

import { motion } from "framer-motion";
import clsx from "clsx";

export function Chave({ ligada, aoMudar, rotulo, desativada }: { ligada: boolean; aoMudar: (v: boolean) => void; rotulo: string; desativada?: boolean }) {
  return (
    <button
      role="switch"
      aria-checked={ligada}
      aria-label={rotulo}
      disabled={desativada}
      onClick={() => aoMudar(!ligada)}
      className={clsx(
        "relative inline-flex h-7 w-12 shrink-0 items-center rounded-full p-0.5 transition-colors disabled:opacity-50",
        ligada ? "bg-cobalt" : "bg-line",
      )}
    >
      <motion.span
        layout
        transition={{ type: "spring", stiffness: 700, damping: 35 }}
        className={clsx("size-6 rounded-full bg-white shadow-sm", ligada && "ml-auto")}
      />
    </button>
  );
}
