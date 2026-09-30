"use client";

import { motion } from "framer-motion";
import type { Periodo } from "@/lib/metricas";

const OPCOES: { v: Periodo; r: string }[] = [
  { v: 7, r: "7 dias" },
  { v: 30, r: "30 dias" },
  { v: 90, r: "90 dias" },
];

export function SeletorPeriodo({ valor, aoMudar }: { valor: Periodo; aoMudar: (p: Periodo) => void }) {
  return (
    <div className="inline-grid grid-cols-3 rounded-xl bg-surface p-1 ring-1 ring-inset ring-line" role="radiogroup" aria-label="Período">
      {OPCOES.map((o) => (
        <button
          key={o.v}
          role="radio"
          aria-checked={valor === o.v}
          onClick={() => aoMudar(o.v)}
          className="relative h-9 rounded-[9px] px-3.5 text-sm font-semibold"
        >
          {valor === o.v && (
            <motion.span layoutId="periodo" className="absolute inset-0 rounded-[9px] bg-ink" transition={{ type: "spring", stiffness: 500, damping: 38 }} />
          )}
          <span className={valor === o.v ? "relative text-bg" : "relative text-muted"}>{o.r}</span>
        </button>
      ))}
    </div>
  );
}
