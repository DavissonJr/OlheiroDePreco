"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import clsx from "clsx";
import { Check, Copy, Gift, Sparkles } from "lucide-react";
import { useDados } from "@/components/app/dados";
import { Cabecalho } from "@/components/app/cabecalho";
import { Botao } from "@/components/ui/botao";
import { Etiqueta } from "@/components/ui/etiqueta";
import { Esqueleto } from "@/components/ui/esqueleto";
import { useAviso } from "@/components/ui/aviso";
import {
  DIAS_BONUS_INDICACAO, DIAS_TESTE, MESES_COBRADOS_NO_ANUAL, PLANO_TESTE, PLANOS, PLANOS_PAGOS, precoCiclo,
  type Ciclo, type PlanoId, type PlanoPago,
} from "@/lib/planos";
import { reais } from "@/lib/format";
import { SITE_URL } from "@/lib/config";

const dia = (iso: string) => new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "long" });
const ORDEM: PlanoId[] = ["gratis", ...PLANOS_PAGOS];

export default function Planos() {
  const avisar = useAviso();
  const { carregando, perfil, assinar, iniciarTeste, cancelarAssinatura, recarregar, demo } = useDados();
  const [ciclo, setCiclo] = useState<Ciclo>("mensal");
  const [assinando, setAssinando] = useState<PlanoPago | null>(null);
  const [testando, setTestando] = useState(false);
  const [cancelando, setCancelando] = useState(false);
  const [confirmarCancelamento, setConfirmarCancelamento] = useState(false);
  const [voltouDoPagamento, setVoltouDoPagamento] = useState(false);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("assinatura") === "ok") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setVoltouDoPagamento(true);
      const t = setTimeout(recarregar, 4000);
      return () => clearTimeout(t);
    }
  }, [recarregar]);

  // Quem já assina vê o ciclo da própria assinatura.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (perfil?.assinatura_ativa && perfil.assinatura_ciclo) setCiclo(perfil.assinatura_ciclo);
  }, [perfil?.assinatura_ativa, perfil?.assinatura_ciclo]);

  if (carregando || !perfil) return <Esqueleto className="h-[480px] rounded-[26px]" />;
  const pago = perfil.plano !== "gratis";
  const ativa = perfil.assinatura_ativa;
  // pro_ate só existe pra quem já pagou; sem assinatura ativa, é porque cancelou.
  const cancelado = pago && !ativa && !demo && !!perfil.pro_ate && new Date(perfil.pro_ate) > new Date();
  // Teste grátis ou bônus de indicação, sem assinatura
  const emCortesia = pago && !ativa && !cancelado && !!perfil.cortesia_ate && new Date(perfil.cortesia_ate) > new Date();

  async function escolher(plano: PlanoPago) {
    setAssinando(plano);
    const r = await assinar(plano, ciclo);
    setAssinando(null);
    if (!r.ok) avisar(r.erro, "erro");
    else if (r.trocado) avisar(`Pronto, você está no ${PLANOS[plano].nome}.`);
  }

  async function testar() {
    setTestando(true);
    const r = await iniciarTeste();
    setTestando(false);
    if (!r.ok) return avisar(r.erro, "erro");
    avisar(`Teste liberado: você está no ${PLANOS[PLANO_TESTE].nome} até ${r.ate ? dia(r.ate) : `daqui a ${DIAS_TESTE} dias`}.`);
  }

  async function cancelar() {
    if (!confirmarCancelamento) return setConfirmarCancelamento(true);
    setCancelando(true);
    const r = await cancelarAssinatura();
    setCancelando(false);
    setConfirmarCancelamento(false);
    if (!r.ok) return avisar(r.erro, "erro");
    avisar(r.ate ? `Assinatura cancelada. Seu plano continua até ${dia(r.ate)}.` : "Assinatura cancelada.");
  }

  return (
    <>
      <Cabecalho
        titulo="Plano"
        descricao={
          <>
            Você está no plano {PLANOS[perfil.plano].nome}
            {emCortesia ? ` até ${dia(perfil.cortesia_ate!)}, sem cobrança` : ""}.
          </>
        }
        acoes={
          <div className="grid grid-cols-2 gap-1 rounded-xl bg-surface p-1 ring-1 ring-line" role="radiogroup" aria-label="Ciclo de cobrança">
            {(["mensal", "anual"] as const).map((c) => (
              <button
                key={c}
                role="radio"
                aria-checked={ciclo === c}
                onClick={() => setCiclo(c)}
                className={clsx("h-9 rounded-lg px-4 text-sm font-semibold transition-colors", ciclo === c ? "bg-cobalt text-white" : "text-muted hover:text-ink")}
              >
                {c === "mensal" ? "Mensal" : `Anual · ${12 - MESES_COBRADOS_NO_ANUAL} meses grátis`}
              </button>
            ))}
          </div>
        }
      />

      <AnimatePresence>
        {voltouDoPagamento && !ativa && (
          <motion.p initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mb-6 rounded-2xl bg-cobalt-soft px-5 py-4 text-cobalt">
            Recebemos sua assinatura. O Mercado Pago pode levar alguns minutos pra confirmar; esta página atualiza sozinha.
          </motion.p>
        )}
      </AnimatePresence>

      {perfil.plano === "gratis" && !perfil.teste_usado && (
        <section className="mb-6 flex flex-col items-start gap-4 rounded-[22px] bg-tag/25 p-5 sm:flex-row sm:items-center sm:p-6">
          <Sparkles className="size-7 shrink-0 text-tag-ink dark:text-tag" aria-hidden />
          <div className="flex-1">
            <h2 className="text-lg font-bold">Teste o {PLANOS[PLANO_TESTE].nome} grátis por {DIAS_TESTE} dias</h2>
            <p className="text-[15px] text-muted">Sem cartão. Quando acabar, você volta pro Grátis sozinho, sem cobrança.</p>
          </div>
          <Botao variante="etiqueta" carregando={testando} onClick={testar}>Começar o teste</Botao>
        </section>
      )}

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
        {ORDEM.map((id) => {
          const p = PLANOS[id];
          const atual = perfil.plano === id;
          const ehPago = id !== "gratis";
          const valor = ehPago ? precoCiclo(id, ciclo) : 0;
          return (
            <motion.section
              key={id}
              layout
              className={clsx("relative flex flex-col rounded-[26px] bg-surface p-6", atual ? "ring-2 ring-cobalt" : "ring-1 ring-line", id === "pro" && !atual && "ring-cobalt/40")}
            >
              <AnimatePresence>
                {atual && (
                  <motion.span
                    initial={{ scale: 0.6, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.6, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 500, damping: 22 }}
                    className="absolute -top-3 left-6 rounded-full bg-cobalt px-3 py-1 text-sm font-semibold text-white"
                  >
                    Seu plano
                  </motion.span>
                )}
                {!atual && id === "pro" && (
                  <span className="absolute -top-3 left-6 rounded-full bg-tag px-3 py-1 text-sm font-semibold text-tag-ink">Mais escolhido</span>
                )}
              </AnimatePresence>
              <h2 className="text-xl font-bold">{p.nome}</h2>
              <div className="mt-3">
                {ehPago ? (
                  <Etiqueta valor={ciclo === "anual" ? valor / 12 : valor} tom="rival" tamanho="xl" />
                ) : (
                  <span className="font-display text-[28px] font-extrabold num">R$ 0</span>
                )}
              </div>
              <p className="mt-1 text-sm text-muted">
                {!ehPago ? "pra sempre" : ciclo === "anual" ? `por mês, cobrado ${reais(valor)} por ano` : "por mês"}
              </p>
              <ul className="mt-5 flex-1 space-y-2.5 text-[15px]">
                {p.recursos.map((r) => (
                  <li key={r} className="flex gap-2.5">
                    <Check className={clsx("mt-0.5 size-4.5 shrink-0", ehPago ? "text-cobalt" : "text-muted")} aria-hidden />
                    {r}
                  </li>
                ))}
              </ul>

              {ehPago && (
                <div className="mt-6">
                  {atual && ativa ? (
                    <p className="rounded-xl bg-up-soft px-4 py-3 text-sm text-up">
                      Assinatura {perfil.assinatura_ciclo === "anual" ? "anual" : "mensal"} ativa
                      {perfil.pro_ate ? `. Próxima cobrança em ${dia(perfil.pro_ate)}.` : "."}
                    </p>
                  ) : (
                    <Botao
                      tamanho="md"
                      variante={id === "pro" ? "primario" : "secundario"}
                      className="w-full"
                      carregando={assinando === id}
                      disabled={!!assinando || (ativa && perfil.assinatura_ciclo !== ciclo)}
                      onClick={() => escolher(id)}
                    >
                      {ativa ? `Trocar para o ${p.nome}` : `Assinar o ${p.nome}`}
                    </Botao>
                  )}
                </div>
              )}
            </motion.section>
          );
        })}
      </div>

      <div className="mt-4 space-y-3 text-sm text-muted">
        {ativa && perfil.assinatura_ciclo !== ciclo && (
          <p>Pra trocar entre mensal e anual, cancele a assinatura atual e assine de novo quando o período pago acabar.</p>
        )}
        {ativa && <p>Na troca de plano, o novo valor vale a partir da próxima cobrança.</p>}
        <p>Pagamento pelo Mercado Pago. Cancele quando quiser, sem multa.</p>
      </div>

      {ativa && (
        <Botao variante="fantasma" className="mt-4 text-muted" carregando={cancelando} onClick={cancelar}>
          {confirmarCancelamento ? "Toque de novo pra cancelar a assinatura" : "Cancelar assinatura"}
        </Botao>
      )}
      {cancelado && (
        <p className="mt-6 rounded-xl bg-tag/25 px-4 py-3 text-[15px]">
          Assinatura cancelada. Você continua no {PLANOS[perfil.plano].nome}
          {perfil.pro_ate ? ` até ${dia(perfil.pro_ate)}` : " até o fim do período pago"}.
        </p>
      )}

      <Indicacao codigo={perfil.codigo_indicacao} total={perfil.indicacoes_ok} />
    </>
  );
}

function Indicacao({ codigo, total }: { codigo: string | null; total: number }) {
  const avisar = useAviso();
  if (!codigo) return null;
  const link = `${SITE_URL}/entrar?criar=1&ref=${codigo}`;

  async function copiar() {
    try {
      await navigator.clipboard.writeText(link);
      avisar("Link copiado.");
    } catch {
      avisar("Não consegui copiar. Segure o link e copie.", "erro");
    }
  }

  return (
    <section className="mt-10 rounded-[26px] bg-surface p-6 ring-1 ring-line sm:p-7">
      <div className="flex items-start gap-4">
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-cobalt-soft text-cobalt">
          <Gift className="size-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-bold">Indique e ganhe 1 mês de Pro</h2>
          <p className="mt-1 text-muted">
            Mande seu link pra outro vendedor. Quando ele assinar qualquer plano, você ganha {DIAS_BONUS_INDICACAO} dias de Pro.
          </p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <input
              readOnly
              value={link}
              onFocus={(e) => e.currentTarget.select()}
              aria-label="Seu link de indicação"
              className="h-11 min-w-0 flex-1 rounded-xl bg-surface-2 px-4 text-[15px] ring-1 ring-inset ring-line outline-none"
            />
            <Botao variante="secundario" icone={<Copy className="size-4" aria-hidden />} onClick={copiar}>Copiar link</Botao>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(`Tô usando o Olheiro de Preço pra vigiar os concorrentes no Mercado Livre. Cria sua conta grátis: ${link}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-11 items-center justify-center rounded-xl px-4 font-semibold text-muted ring-1 ring-inset ring-line hover:bg-surface-2 hover:text-ink"
            >
              Mandar no WhatsApp
            </a>
          </div>
          <p className="mt-3 text-sm text-muted num">
            {total === 0 ? "Nenhuma indicação assinou ainda." : `${total} ${total === 1 ? "indicação assinou" : "indicações assinaram"}.`}
          </p>
        </div>
      </div>
    </section>
  );
}
