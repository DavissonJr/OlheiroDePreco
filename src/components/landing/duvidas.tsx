"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Plus } from "lucide-react";
import { useState } from "react";

const PERGUNTAS = [
  {
    p: "O Olheiro tem acesso à minha senha do Mercado Livre?",
    r: "Não. A conexão usa a autorização oficial do Mercado Livre: você entra no site deles e aprova o acesso. Dá pra revogar quando quiser nas configurações da sua conta do Mercado Livre.",
  },
  {
    p: "De quanto em quanto tempo os preços são conferidos?",
    r: "A cada 6 horas no Grátis, 3 horas no Básico, 1 hora no Pro e 30 minutos no Turbo. Quando o preço cai, o aviso sai na mesma rodada.",
  },
  {
    p: "O Olheiro muda o preço dos meus anúncios?",
    r: "Só se você pedir. No plano Turbo dá pra ligar o ajuste automático em cada anúncio: ele acompanha o concorrente mais barato, mas nunca passa do preço mínimo que você definir nem do seu custo. Sem isso ligado, o Olheiro só lê.",
  },
  {
    p: "Posso testar antes de pagar?",
    r: "Pode. O plano Grátis não tem prazo, e o Pro tem 7 dias de teste sem cartão. No fim do teste você volta pro Grátis sozinho, sem cobrança.",
  },
  {
    p: "Funciona com Shopee, Amazon e Magalu?",
    r: "Por enquanto, só Mercado Livre. As próximas integrações vão seguir o que os vendedores mais pedirem no cadastro.",
  },
  {
    p: "Como eu cancelo a assinatura?",
    r: "Na tela de plano, com um toque, ou pelo app do Mercado Pago. Não tem multa, e você continua no plano até o fim do período já pago.",
  },
  {
    p: "Preciso deixar o app aberto pra receber os avisos?",
    r: "Não. A conferência roda nos nossos servidores e o aviso chega no Telegram ou no seu e-mail, mesmo com o celular bloqueado.",
  },
];

export function Duvidas() {
  const [aberta, setAberta] = useState<number | null>(0);
  return (
    <div className="divide-y divide-line border-y border-line">
      {PERGUNTAS.map((q, i) => {
        const ativa = aberta === i;
        return (
          <div key={q.p}>
            <h3 className="font-sans text-base tracking-normal">
              <button
                onClick={() => setAberta(ativa ? null : i)}
                aria-expanded={ativa}
                className="flex w-full items-center justify-between gap-4 py-5 text-left text-[17px] font-semibold"
              >
                {q.p}
                <motion.span animate={{ rotate: ativa ? 45 : 0 }} transition={{ type: "spring", stiffness: 400, damping: 25 }} className="shrink-0 text-muted">
                  <Plus className="size-5" aria-hidden />
                </motion.span>
              </button>
            </h3>
            <AnimatePresence initial={false}>
              {ativa && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                  className="overflow-hidden"
                >
                  <p className="max-w-[62ch] pb-5 text-muted">{q.r}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
