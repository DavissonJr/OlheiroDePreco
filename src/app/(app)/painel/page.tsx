"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import clsx from "clsx";
import { ArrowDownRight, ArrowUpRight, ExternalLink, RefreshCw } from "lucide-react";
import { useDados } from "@/components/app/dados";
import { Cabecalho } from "@/components/app/cabecalho";
import { SeletorPeriodo } from "@/components/app/seletor-periodo";
import { GraficoFaturamento } from "@/components/charts/grafico-faturamento";
import { NumeroAnimado } from "@/components/ui/numero-animado";
import { Etiqueta } from "@/components/ui/etiqueta";
import { Miniatura } from "@/components/ui/miniatura";
import { Botao } from "@/components/ui/botao";
import { Esqueleto } from "@/components/ui/esqueleto";
import { useAviso } from "@/components/ui/aviso";
import { maisVendidos, resumo, seriePorDia, variacao, vendasNoPeriodo, type Periodo } from "@/lib/metricas";
import { numero, porcentagem, primeiroNome, reais, tempoRelativo } from "@/lib/format";

function Variacao({ v }: { v: number | null }) {
  if (v == null) return <span className="text-sm text-muted">sem período anterior pra comparar</span>;
  const sobe = v >= 0;
  return (
    <span className={clsx("inline-flex items-center gap-1 text-sm font-semibold num", sobe ? "text-up" : "text-drop")}>
      {sobe ? <ArrowUpRight className="size-4" aria-hidden /> : <ArrowDownRight className="size-4" aria-hidden />}
      {porcentagem(v)}
      <span className="font-normal text-muted">sobre o período anterior</span>
    </span>
  );
}

export default function VisaoGeral() {
  const router = useRouter();
  const avisar = useAviso();
  const { carregando, perfil, vendas, produtos, concorrentes, sincronizar } = useDados();
  const [periodo, setPeriodo] = useState<Periodo>(30);
  const [sincronizando, setSincronizando] = useState(false);

  useEffect(() => {
    if (!carregando && perfil && !perfil.onboarding_ok) router.replace("/onboarding");
  }, [carregando, perfil, router]);

  const dados = useMemo(() => {
    const atual = vendasNoPeriodo(vendas, periodo);
    const anterior = vendasNoPeriodo(vendas, periodo, 1);
    const r = resumo(atual);
    const ra = resumo(anterior);
    return {
      r,
      varFat: anterior.length ? variacao(r.faturamento, ra.faturamento) : null,
      serie: seriePorDia(atual, periodo),
      top: maisVendidos(atual),
    };
  }, [vendas, periodo]);

  const movimentos = useMemo(
    () =>
      concorrentes
        .filter((c) => c.preco_anterior != null && c.preco_atual != null && c.preco_anterior !== c.preco_atual)
        .slice(0, 4),
    [concorrentes],
  );

  async function atualizar() {
    setSincronizando(true);
    const r = await sincronizar();
    setSincronizando(false);
    avisar(r.ok ? "Vendas e anúncios atualizados." : r.erro, r.ok ? "ok" : "erro");
  }

  if (carregando) {
    return (
      <div className="space-y-6">
        <Esqueleto className="h-12 w-64" />
        <Esqueleto className="h-[380px] w-full rounded-[26px]" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Esqueleto className="h-64 rounded-[26px]" />
          <Esqueleto className="h-64 rounded-[26px]" />
        </div>
      </div>
    );
  }

  if (!perfil?.ml_nickname) {
    return (
      <div className="mx-auto max-w-lg py-16 text-center">
        <h1 className="text-3xl font-bold">Conecte o Mercado Livre pra ver suas vendas</h1>
        <p className="mt-3 text-muted">O painel se monta sozinho com os pedidos dos últimos 90 dias.</p>
        <a href="/api/ml/conectar" className="mt-8 inline-flex h-13 items-center gap-2 rounded-[14px] bg-[#ffe14d] px-6 font-semibold text-[#2d3277] active:scale-[.97]">
          Conectar Mercado Livre <ExternalLink className="size-4" aria-hidden />
        </a>
      </div>
    );
  }

  const meuPreco = new Map(produtos.map((p) => [p.id, p.preco]));
  const maxTop = Math.max(1, ...dados.top.map((t) => t.receita));

  return (
    <>
      <Cabecalho
        titulo={perfil.nome ? `Olá, ${primeiroNome(perfil.nome)}` : "Visão geral"}
        descricao={<>Conta <strong className="font-semibold text-ink">{perfil.ml_nickname}</strong> no Mercado Livre</>}
        acoes={
          <>
            <SeletorPeriodo valor={periodo} aoMudar={setPeriodo} />
            <Botao variante="secundario" tamanho="sm" className="h-11" onClick={atualizar} disabled={sincronizando} aria-label="Atualizar vendas">
              <RefreshCw className={clsx("size-4", sincronizando && "animate-spin")} aria-hidden />
              <span className="hidden sm:inline">Atualizar</span>
            </Botao>
          </>
        }
      />

      {/* Bloco principal: faturamento + gráfico, métricas secundárias ao lado */}
      <section className="grid grid-cols-1 overflow-hidden rounded-[26px] bg-surface ring-1 ring-line lg:grid-cols-[minmax(0,1fr)_260px]">
        <div className="p-5 sm:p-7">
          <p className="text-muted">Faturamento</p>
          <NumeroAnimado valor={dados.r.faturamento} formato={reais} className="mt-1 block font-display text-[40px] leading-none font-extrabold tracking-tight sm:text-[52px]" />
          <div className="mt-3">
            <Variacao v={dados.varFat} />
          </div>
          <div className="mt-6 -ml-2">
            <GraficoFaturamento dados={dados.serie} />
          </div>
        </div>
        <dl className="grid grid-cols-2 border-t border-line lg:grid-cols-1 lg:border-t-0 lg:border-l">
          {[
            { r: "Pedidos", v: dados.r.pedidos, f: numero },
            { r: "Ticket médio", v: dados.r.ticket, f: reais },
            { r: "Sobra depois das taxas", v: dados.r.liquido, f: reais },
            { r: "Taxas do Mercado Livre", v: dados.r.taxas, f: reais },
          ].map((m, i) => (
            <div key={m.r} className={clsx("p-5 sm:px-7", i % 2 === 0 ? "border-r border-line lg:border-r-0" : "", i < 2 ? "border-b border-line" : "", "lg:border-b lg:last:border-b-0")}>
              <dt className="text-sm text-muted">{m.r}</dt>
              <dd className="mt-1 text-xl font-bold sm:text-2xl">
                <NumeroAnimado valor={m.v} formato={m.f} />
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Movimentos dos concorrentes */}
        <section className="rounded-[26px] bg-surface p-5 ring-1 ring-line sm:p-7">
          <div className="mb-4 flex items-center justify-between gap-4">
            <h2 className="text-xl font-bold">Mudanças de preço</h2>
            <Link href="/painel/concorrentes" className="shrink-0 text-sm font-semibold text-cobalt hover:underline">Ver todos</Link>
          </div>
          {movimentos.length === 0 ? (
            <p className="py-6 text-muted">
              Nenhuma mudança por enquanto.{" "}
              <Link href="/painel/concorrentes" className="font-semibold text-cobalt hover:underline">Adicione concorrentes</Link> pra começar a acompanhar.
            </p>
          ) : (
            <ul className="divide-y divide-line">
              {movimentos.map((c) => {
                const meu = c.meu_item_id ? meuPreco.get(c.meu_item_id) : undefined;
                const abaixo = meu != null && c.preco_atual! < meu;
                return (
                  <li key={c.id} className="flex items-center gap-3 py-3.5">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{c.vendedor ?? "Concorrente"}</p>
                      <p className="truncate text-sm text-muted">{c.titulo}</p>
                      <p className="text-xs text-muted">{tempoRelativo(c.ultima_verificacao)}</p>
                    </div>
                    <Etiqueta valor={c.preco_atual} riscado={c.preco_anterior} riscadoSoDesktop tom={abaixo ? "drop" : "rival"} tamanho="sm" />
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Mais vendidos */}
        <section className="rounded-[26px] bg-surface p-5 ring-1 ring-line sm:p-7">
          <h2 className="mb-4 text-xl font-bold">Mais vendidos no período</h2>
          {dados.top.length === 0 ? (
            <p className="py-6 text-muted">Nenhuma venda nesse período.</p>
          ) : (
            <ol className="space-y-4">
              {dados.top.map((t) => (
                <li key={t.item_id} className="flex items-center gap-3">
                  <Miniatura titulo={t.titulo} src={produtos.find((p) => p.id === t.item_id)?.thumbnail} className="size-10 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="truncate text-[15px] font-semibold">{t.titulo}</p>
                      <p className="shrink-0 text-sm font-bold num">{reais(t.receita)}</p>
                    </div>
                    <div className="mt-1.5 flex items-center gap-3">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2">
                        <motion.div
                          className="h-full rounded-full bg-cobalt"
                          initial={{ width: 0 }}
                          animate={{ width: `${(t.receita / maxTop) * 100}%` }}
                          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                        />
                      </div>
                      <span className="w-16 shrink-0 text-right text-xs text-muted num">{numero(t.unidades)} un.</span>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>

      {/* Últimos pedidos */}
      <section className="mt-6 rounded-[26px] bg-surface p-5 ring-1 ring-line sm:p-7">
        <h2 className="mb-2 text-xl font-bold">Últimos pedidos</h2>
        <ul className="divide-y divide-line">
          {vendas.slice(0, 6).map((v) => (
            <li key={v.id} className="flex items-center gap-3 py-3.5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-semibold">
                  {v.itens[0]?.quantidade > 1 ? `${v.itens[0].quantidade}× ` : ""}
                  {v.itens[0]?.titulo}
                </p>
                <p className="text-sm text-muted">
                  {tempoRelativo(v.data)}
                  {v.status === "cancelled" && <span className="ml-2 font-semibold text-drop">Cancelado</span>}
                </p>
              </div>
              <div className="text-right">
                <p className={clsx("font-bold num", v.status === "cancelled" && "text-muted line-through")}>{reais(v.total)}</p>
                {v.status !== "cancelled" && <p className="text-xs text-muted num">sobra {reais(v.total - v.taxa)}</p>}
              </div>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
