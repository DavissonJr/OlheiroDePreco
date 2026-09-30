"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import clsx from "clsx";
import { Check, Sparkles } from "lucide-react";
import { useDados } from "@/components/app/dados";
import { Cabecalho } from "@/components/app/cabecalho";
import { Botao } from "@/components/ui/botao";
import { Etiqueta } from "@/components/ui/etiqueta";
import { Esqueleto } from "@/components/ui/esqueleto";
import { useAviso } from "@/components/ui/aviso";
import { PLANOS } from "@/lib/planos";

export default function Planos() {
  const avisar = useAviso();
  const { carregando, perfil, assinarPro, cancelarProDemo, recarregar, demo } = useDados();
  const [assinando, setAssinando] = useState(false);
  const [voltouDoPagamento, setVoltouDoPagamento] = useState(false);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("assinatura") === "ok") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setVoltouDoPagamento(true);
      const t = setTimeout(recarregar, 4000);
      return () => clearTimeout(t);
    }
  }, [recarregar]);

  if (carregando || !perfil) return <Esqueleto className="h-[480px] rounded-[26px]" />;
  const pro = perfil.plano === "pro";

  async function assinar() {
    setAssinando(true);
    const r = await assinarPro();
    setAssinando(false);
    if (!r.ok) avisar(r.erro, "erro");
    else if (demo) avisar("Pronto, você está no Pro.");
  }

  return (
    <>
      <Cabecalho titulo="Plano" descricao={`Você está no plano ${PLANOS[perfil.plano].nome}.`} />

      <AnimatePresence>
        {voltouDoPagamento && !pro && (
          <motion.p initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mb-6 rounded-2xl bg-cobalt-soft px-5 py-4 text-cobalt">
            Recebemos sua assinatura. O Mercado Pago pode levar alguns minutos pra confirmar; esta página atualiza sozinha.
          </motion.p>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {(["gratis", "pro"] as const).map((id) => {
          const p = PLANOS[id];
          const atual = perfil.plano === id;
          const ehPro = id === "pro";
          return (
            <motion.section
              key={id}
              layout
              className={clsx("relative rounded-[26px] bg-surface p-7 sm:p-8", atual ? "ring-2 ring-cobalt" : "ring-1 ring-line")}
            >
              <AnimatePresence>
                {atual && (
                  <motion.span
                    initial={{ scale: 0.6, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.6, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 500, damping: 22 }}
                    className="absolute -top-3 left-7 rounded-full bg-cobalt px-3 py-1 text-sm font-semibold text-white"
                  >
                    Seu plano
                  </motion.span>
                )}
              </AnimatePresence>
              <div className="flex items-start justify-between gap-4">
                <h2 className="text-2xl font-bold">{p.nome}</h2>
                {ehPro ? <Etiqueta valor={p.preco} tom="rival" tamanho="xl" /> : <span className="font-display text-[28px] font-extrabold num">R$ 0</span>}
              </div>
              <p className="mt-1 text-muted">{ehPro ? "por mês" : "pra sempre"}</p>
              <ul className="mt-6 space-y-3">
                {p.recursos.map((r) => (
                  <li key={r} className="flex gap-3">
                    <Check className={clsx("mt-0.5 size-5 shrink-0", ehPro ? "text-cobalt" : "text-muted")} aria-hidden />
                    {r}
                  </li>
                ))}
              </ul>
              {ehPro && !pro && (
                <>
                  <Botao tamanho="lg" className="mt-8 w-full" carregando={assinando} icone={<Sparkles className="size-5" aria-hidden />} onClick={assinar}>
                    Assinar o Pro
                  </Botao>
                  <p className="mt-3 text-center text-sm text-muted">Pagamento pelo Mercado Pago. Cancele quando quiser.</p>
                </>
              )}
              {ehPro && pro && (
                <p className="mt-8 rounded-xl bg-up-soft px-4 py-3 text-[15px] text-up">
                  Assinatura ativa. Pra cancelar, acesse Assinaturas no app do Mercado Pago.
                </p>
              )}
            </motion.section>
          );
        })}
      </div>

      {demo && pro && (
        <Botao variante="fantasma" className="mt-6" onClick={cancelarProDemo}>
          Voltar pro Grátis (só na demonstração)
        </Botao>
      )}
    </>
  );
}
