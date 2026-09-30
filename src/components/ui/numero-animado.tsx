"use client";

import { animate, useInView, useReducedMotion } from "framer-motion";
import { useEffect, useRef } from "react";

// Anima de um valor pro outro quando ele muda (ex.: trocar o período do painel).
export function NumeroAnimado({ valor, formato, className }: { valor: number; formato: (n: number) => string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const anterior = useRef(0);
  const visivel = useInView(ref, { once: true });
  const reduzir = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el || !visivel) return;
    if (reduzir) {
      el.textContent = formato(valor);
      anterior.current = valor;
      return;
    }
    const controle = animate(anterior.current, valor, {
      duration: 0.7,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => {
        el.textContent = formato(v);
      },
    });
    anterior.current = valor;
    return () => controle.stop();
  }, [valor, formato, visivel, reduzir]);

  return (
    <span ref={ref} className={className ? `num ${className}` : "num"}>
      {formato(valor)}
    </span>
  );
}
