"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { RotateCcw, Send } from "lucide-react";
import { useEffect, useState } from "react";
import { Etiqueta } from "@/components/ui/etiqueta";
import { Miniatura } from "@/components/ui/miniatura";

const RIVAIS = [
  { nome: "CASADOFONE", preco: 189.9, novo: 174.9 },
  { nome: "TECHMAIS_OFICIAL", preco: 194.9 },
  { nome: "LOJA.ALFA", preco: 199.0 },
];

// Um único momento orquestrado: o concorrente baixa o preço e o aviso chega.
export function CenaHero() {
  const reduzir = useReducedMotion();
  const [etapa, setEtapa] = useState(0); // 0 parado, 1 preço caiu, 2 aviso chegou
  const [rodada, setRodada] = useState(0);

  useEffect(() => {
    if (reduzir) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setEtapa(2);
      return;
    }
    setEtapa(0);
    const a = setTimeout(() => setEtapa(1), 1500);
    const b = setTimeout(() => setEtapa(2), 2300);
    return () => {
      clearTimeout(a);
      clearTimeout(b);
    };
  }, [reduzir, rodada]);

  return (
    <div className="relative mx-auto w-full max-w-[520px]">
      {/* Anéis de radar ao fundo */}
      <svg viewBox="0 0 400 400" className="pointer-events-none absolute -top-16 -right-20 w-[130%] max-w-none text-cobalt opacity-[.13] sm:-right-24" aria-hidden>
        {[60, 110, 160, 200].map((r) => (
          <circle key={r} cx="200" cy="200" r={r} fill="none" stroke="currentColor" strokeWidth="1.2" />
        ))}
        <line x1="200" y1="0" x2="200" y2="400" stroke="currentColor" strokeWidth="1" />
        <line x1="0" y1="200" x2="400" y2="200" stroke="currentColor" strokeWidth="1" />
      </svg>

      <div className="relative rounded-[26px] bg-surface p-4 shadow-[0_30px_60px_-30px_rgba(19,27,51,.35)] ring-1 ring-line sm:p-6">
        <div className="flex items-center gap-3">
          <Miniatura titulo="Fone Bluetooth TWS" className="size-12 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-sm text-muted">Seu anúncio</p>
            <p className="truncate font-semibold">Fone Bluetooth TWS Pro</p>
          </div>
          <Etiqueta valor={189.9} tom="mine" />
        </div>

        <div className="mt-5 border-t border-line pt-4">
          <p className="mb-2 text-sm text-muted">Concorrentes que você acompanha</p>
          <ul className="space-y-1">
            {RIVAIS.map((r, i) => {
              const caiu = i === 0 && etapa >= 1;
              return (
                <li key={r.nome} className="relative flex items-center justify-between gap-3 rounded-xl px-2 py-2.5">
                  <AnimatePresence>
                    {caiu && (
                      <motion.span
                        className="absolute inset-0 rounded-xl bg-drop-soft"
                        initial={{ opacity: 0, scale: 0.96 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.35 }}
                        aria-hidden
                      />
                    )}
                  </AnimatePresence>
                  <span className="relative truncate text-[15px] font-medium">{r.nome}</span>
                  <span className="relative">
                    <AnimatePresence mode="popLayout" initial={false}>
                      {caiu ? (
                        <motion.span
                          key="novo"
                          initial={{ y: -18, opacity: 0, rotate: -4 }}
                          animate={{ y: 0, opacity: 1, rotate: 0 }}
                          transition={{ type: "spring", stiffness: 380, damping: 18 }}
                          className="inline-block"
                        >
                          <Etiqueta valor={r.novo!} riscado={r.preco} tom="drop" />
                        </motion.span>
                      ) : (
                        <motion.span key="antigo" exit={{ y: 18, opacity: 0 }} transition={{ duration: 0.2 }} className="inline-block">
                          <Etiqueta valor={r.preco} tom="rival" />
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      <AnimatePresence>
        {etapa >= 2 && (
          <motion.div
            key={`aviso-${rodada}`}
            initial={{ opacity: 0, y: 30, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ type: "spring", stiffness: 300, damping: 24 }}
            className="relative z-10 -mt-6 ml-auto mr-2 w-[88%] rounded-2xl bg-ink p-4 text-bg shadow-[0_24px_48px_-20px_rgba(10,16,40,.6)] sm:-mt-8 sm:-mr-6 sm:w-[80%]"
            role="status"
          >
            <div className="mb-1.5 flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 font-semibold">
                <span className="grid size-6 place-items-center rounded-full bg-[#2aabee] text-white">
                  <Send className="size-3.5 -translate-x-px" aria-hidden />
                </span>
                Radar no Telegram
              </span>
              <span className="opacity-60">agora</span>
            </div>
            <p className="text-[15px] leading-snug">
              CASADOFONE baixou o fone TWS Pro para <strong className="num">R$ 174,90</strong>. Agora está <strong className="num">R$ 15,00</strong> abaixo do seu anúncio.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {!reduzir && (
        <div className="mt-3 flex justify-end pr-2 sm:-mr-6">
          <button
            onClick={() => setRodada((r) => r + 1)}
            className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm text-muted transition-opacity hover:text-ink disabled:opacity-0"
            disabled={etapa < 2}
          >
            <RotateCcw className="size-3.5" aria-hidden />
            Ver de novo
          </button>
        </div>
      )}
    </div>
  );
}
