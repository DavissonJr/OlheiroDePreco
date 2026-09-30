"use client";

import { useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import clsx from "clsx";
import { BellRing, TrendingDown, TrendingUp } from "lucide-react";
import { useDados } from "@/components/app/dados";
import { Cabecalho } from "@/components/app/cabecalho";
import { CanaisAviso } from "@/components/app/canais-aviso";
import { Botao } from "@/components/ui/botao";
import { Etiqueta } from "@/components/ui/etiqueta";
import { Esqueleto } from "@/components/ui/esqueleto";
import { tempoRelativo } from "@/lib/format";
import type { Alerta } from "@/lib/types";

function grupoDoDia(iso: string) {
  const d = new Date(iso);
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const dias = Math.floor((hoje.getTime() - new Date(d).setHours(0, 0, 0, 0)) / 86400000);
  if (dias <= 0) return "Hoje";
  if (dias === 1) return "Ontem";
  if (dias < 7) return "Nesta semana";
  return "Mais antigos";
}

const ICONES = {
  abaixo_do_meu: { icone: TrendingDown, classe: "bg-drop-soft text-drop", rotulo: "Ficou mais barato que você" },
  queda: { icone: TrendingDown, classe: "bg-tag/25 text-tag-ink dark:text-tag", rotulo: "Baixou o preço" },
  subiu: { icone: TrendingUp, classe: "bg-up-soft text-up", rotulo: "Subiu o preço" },
};

export default function Avisos() {
  const { carregando, alertas, marcarAlertasLidos } = useDados();
  const naoLidos = alertas.filter((a) => !a.lido).length;

  const grupos = useMemo(() => {
    const m = new Map<string, Alerta[]>();
    for (const a of alertas) {
      const g = grupoDoDia(a.created_at);
      m.set(g, [...(m.get(g) ?? []), a]);
    }
    return [...m.entries()];
  }, [alertas]);

  if (carregando) return <Esqueleto className="h-96 rounded-[26px]" />;

  return (
    <>
      <Cabecalho
        titulo="Avisos"
        descricao={naoLidos ? `${naoLidos} ${naoLidos === 1 ? "aviso novo" : "avisos novos"}` : "Tudo em dia"}
        acoes={naoLidos > 0 && <Botao variante="secundario" tamanho="sm" onClick={marcarAlertasLidos}>Marcar todos como lidos</Botao>}
      />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div>
          {alertas.length === 0 ? (
            <div className="rounded-[26px] border-2 border-dashed border-line px-6 py-16 text-center">
              <BellRing className="mx-auto size-10 text-muted" aria-hidden />
              <h2 className="mt-4 text-2xl font-bold">Nenhum aviso ainda</h2>
              <p className="mx-auto mt-2 max-w-[40ch] text-muted">Quando um concorrente mudar o preço, o aviso aparece aqui e nos canais que você escolheu.</p>
            </div>
          ) : (
            <div className="space-y-8">
              {grupos.map(([grupo, lista]) => (
                <section key={grupo}>
                  <h2 className="mb-3 font-sans text-sm font-semibold tracking-normal text-muted">{grupo}</h2>
                  <ul className="overflow-hidden rounded-[22px] bg-surface ring-1 ring-line">
                    {lista.map((a) => {
                      const t = ICONES[a.tipo];
                      return (
                        <li key={a.id} className="relative flex gap-4 border-b border-line p-5 last:border-b-0">
                          <AnimatePresence>
                            {!a.lido && (
                              <motion.span
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                exit={{ scale: 0, opacity: 0 }}
                                className="absolute top-6 left-2 size-2 rounded-full bg-cobalt"
                                aria-label="Não lido"
                              />
                            )}
                          </AnimatePresence>
                          <span className={clsx("grid size-10 shrink-0 place-items-center rounded-xl", t.classe)}>
                            <t.icone className="size-5" aria-hidden />
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                              <p className="font-semibold">{t.rotulo}</p>
                              <p className="text-sm text-muted">{tempoRelativo(a.created_at)}</p>
                            </div>
                            <p className={clsx("mt-1 max-w-[60ch]", a.lido ? "text-muted" : "text-ink")}>{a.mensagem}</p>
                            {a.preco_novo != null && (
                              <div className="mt-3">
                                <Etiqueta valor={a.preco_novo} riscado={a.preco_antigo} tom={a.tipo === "abaixo_do_meu" ? "drop" : a.tipo === "subiu" ? "quiet" : "rival"} tamanho="sm" />
                              </div>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </div>

        <aside>
          <h2 className="mb-3 font-sans text-sm font-semibold tracking-normal text-muted">Onde avisar</h2>
          <CanaisAviso />
          <p className="mt-3 px-1 text-sm text-muted">Aumentos de preço ficam só aqui no app. Quedas vão também pro Telegram e e-mail.</p>
        </aside>
      </div>
    </>
  );
}
