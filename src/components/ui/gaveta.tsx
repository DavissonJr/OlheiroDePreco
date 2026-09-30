"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

// Painel que sobe de baixo no celular e desliza da direita no computador.
export function Gaveta({
  aberta,
  aoFechar,
  titulo,
  children,
}: {
  aberta: boolean;
  aoFechar: () => void;
  titulo: string;
  children: React.ReactNode;
}) {
  const reduzir = useReducedMotion();
  const painel = useRef<HTMLDivElement>(null);
  const [desktop, setDesktop] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const atualizar = () => setDesktop(mq.matches);
    atualizar();
    mq.addEventListener("change", atualizar);
    return () => mq.removeEventListener("change", atualizar);
  }, []);

  useEffect(() => {
    if (!aberta) return;
    const anterior = document.activeElement as HTMLElement | null;
    const tecla = (e: KeyboardEvent) => e.key === "Escape" && aoFechar();
    window.addEventListener("keydown", tecla);
    document.body.style.overflow = "hidden";
    setTimeout(() => painel.current?.focus(), 50);
    return () => {
      window.removeEventListener("keydown", tecla);
      document.body.style.overflow = "";
      anterior?.focus();
    };
  }, [aberta, aoFechar]);

  const inicial = reduzir ? { opacity: 0 } : desktop ? { x: "100%" } : { y: "100%" };
  const final = reduzir ? { opacity: 1 } : desktop ? { x: 0 } : { y: 0 };

  return (
    <AnimatePresence>
      {aberta && (
        <div className="fixed inset-0 z-50">
          <motion.div
            className="absolute inset-0 bg-[#0a1028]/45 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={aoFechar}
          />
          <motion.div
            ref={painel}
            role="dialog"
            aria-modal="true"
            aria-label={titulo}
            tabIndex={-1}
            initial={inicial}
            animate={final}
            exit={inicial}
            transition={{ type: "spring", stiffness: 380, damping: 38 }}
            drag={desktop || reduzir ? false : "y"}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 120 || info.velocity.y > 600) aoFechar();
            }}
            className="absolute inset-x-0 bottom-0 max-h-[92dvh] overflow-hidden rounded-t-[26px] bg-surface outline-none lg:inset-y-0 lg:right-0 lg:left-auto lg:max-h-none lg:w-[480px] lg:rounded-none lg:rounded-l-[26px]"
          >
            <div className="mx-auto mt-2.5 h-1.5 w-11 rounded-full bg-line lg:hidden" aria-hidden />
            <div className="flex items-center justify-between px-5 pt-3 pb-2 lg:px-7 lg:pt-6">
              <h2 className="text-xl font-bold">{titulo}</h2>
              <button onClick={aoFechar} className="rounded-full p-2 text-muted hover:bg-surface-2 hover:text-ink" aria-label="Fechar">
                <X className="size-5" />
              </button>
            </div>
            <div className="scroll-quiet max-h-[calc(92dvh-4.5rem)] overflow-y-auto px-5 pb-[calc(env(safe-area-inset-bottom,0px)+1.5rem)] lg:max-h-[calc(100dvh-5.5rem)] lg:px-7">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
