"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, AlertTriangle, X } from "lucide-react";
import { createContext, useCallback, useContext, useState } from "react";

interface Aviso {
  id: number;
  texto: string;
  tipo: "ok" | "erro";
}

const Ctx = createContext<(texto: string, tipo?: "ok" | "erro") => void>(() => {});

export function AvisosProvider({ children }: { children: React.ReactNode }) {
  const [lista, setLista] = useState<Aviso[]>([]);

  const avisar = useCallback((texto: string, tipo: "ok" | "erro" = "ok") => {
    const id = Date.now() + Math.random();
    setLista((l) => [...l.slice(-2), { id, texto, tipo }]);
    setTimeout(() => setLista((l) => l.filter((a) => a.id !== id)), 4200);
  }, []);

  return (
    <Ctx.Provider value={avisar}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 z-[60] flex flex-col items-center gap-2 px-4 bottom-[calc(env(safe-area-inset-bottom,0px)+5.5rem)] lg:bottom-6 lg:items-end lg:pr-6"
      >
        <AnimatePresence initial={false}>
          {lista.map((a) => (
            <motion.div
              key={a.id}
              layout
              initial={{ opacity: 0, y: 24, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.96, transition: { duration: 0.18 } }}
              transition={{ type: "spring", stiffness: 420, damping: 32 }}
              className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl bg-ink px-4 py-3 text-[15px] text-bg shadow-[0_12px_32px_-12px_rgba(10,16,40,.45)]"
            >
              {a.tipo === "ok" ? (
                <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-up" aria-hidden />
              ) : (
                <AlertTriangle className="mt-0.5 size-5 shrink-0 text-tag" aria-hidden />
              )}
              <p className="flex-1 leading-snug">{a.texto}</p>
              <button
                onClick={() => setLista((l) => l.filter((x) => x.id !== a.id))}
                className="-mr-1 rounded-md p-0.5 opacity-60 hover:opacity-100"
                aria-label="Fechar aviso"
              >
                <X className="size-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </Ctx.Provider>
  );
}

export const useAviso = () => useContext(Ctx);
