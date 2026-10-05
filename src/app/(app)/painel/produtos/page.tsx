"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import clsx from "clsx";
import { ShoppingCart, TrendingDown, TrendingUp, Wand2 } from "lucide-react";
import { useDados } from "@/components/app/dados";
import { Cabecalho } from "@/components/app/cabecalho";
import { RecursoBloqueado } from "@/components/app/recurso-bloqueado";
import { Gaveta } from "@/components/ui/gaveta";
import { Etiqueta } from "@/components/ui/etiqueta";
import { Miniatura } from "@/components/ui/miniatura";
import { Esqueleto } from "@/components/ui/esqueleto";
import { Chave } from "@/components/ui/chave";
import { CampoNumero } from "@/components/ui/campo-numero";
import { useAviso } from "@/components/ui/aviso";
import { custosDoProduto, lucro, margemPct, menorRival, precoMinimo, sugerirPreco, tarifaEstimada, TARIFA_PADRAO_PCT, type SugestaoPreco } from "@/lib/margem";
import { temRecurso } from "@/lib/planos";
import { dataHora, reais, tempoRelativo } from "@/lib/format";
import type { AjustePreco, Concorrente, Produto, Venda } from "@/lib/types";

const pct = (v: number) => `${v.toFixed(1).replace(".", ",")}%`;

export default function Produtos() {
  const { carregando, perfil, produtos, concorrentes, vendas, ajustes } = useDados();
  const [abertoId, setAbertoId] = useState<string | null>(null);
  const fechar = useCallback(() => setAbertoId(null), []);
  const plano = perfil?.plano ?? "gratis";

  const linhas = useMemo(() => {
    return produtos
      .map((p) => {
        const rivais = concorrentes.filter((c) => c.meu_item_id === p.id);
        const rival = menorRival(rivais);
        const sugestao = sugerirPreco(p.preco, rival, custosDoProduto(p, vendas), p.repricing_diferenca);
        return { p, rivais, rival, sugestao };
      })
      .sort((a, b) => b.rivais.length - a.rivais.length || a.p.titulo.localeCompare(b.p.titulo));
  }, [produtos, concorrentes, vendas]);

  if (carregando) {
    return (
      <div className="space-y-4">
        <Esqueleto className="h-12 w-72" />
        <Esqueleto className="h-96 rounded-[26px]" />
      </div>
    );
  }

  const aberto = linhas.find((l) => l.p.id === abertoId) ?? null;

  return (
    <>
      <Cabecalho titulo="Produtos" descricao="Seus custos, o preço que vale a pena e o ajuste automático." />

      {produtos.length === 0 ? (
        <div className="rounded-[26px] border-2 border-dashed border-line px-6 py-16 text-center">
          <h2 className="text-2xl font-bold">Nenhum anúncio ainda</h2>
          <p className="mx-auto mt-2 max-w-[42ch] text-muted">
            Conecte o Mercado Livre em <Link href="/painel/conta" className="font-semibold text-cobalt hover:underline">Conta</Link> e
            seus anúncios ativos aparecem aqui.
          </p>
        </div>
      ) : (
        <ul className="overflow-hidden rounded-[26px] bg-surface ring-1 ring-line">
          {linhas.map(({ p, rivais, rival, sugestao }) => (
            <li key={p.id} className="border-b border-line last:border-b-0">
              <button
                onClick={() => setAbertoId(p.id)}
                className="grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 px-5 py-4 text-left transition-colors hover:bg-surface-2 sm:px-6"
              >
                <Miniatura titulo={p.titulo} src={p.thumbnail} className="size-11" />
                <div className="min-w-0">
                  <p className="truncate font-semibold">{p.titulo}</p>
                  <p className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm text-muted">
                    <span>
                      {rivais.length === 0 ? "Sem concorrentes" : `${rivais.length} ${rivais.length === 1 ? "concorrente" : "concorrentes"}`}
                      {rival != null && <>, o mais barato a <strong className="font-semibold text-ink num">{reais(rival)}</strong></>}
                    </span>
                    {p.catalogo_id && p.buybox_ganhando != null && temRecurso(plano, "buybox") && (
                      <span className={clsx("inline-flex items-center gap-1 font-semibold", p.buybox_ganhando ? "text-up" : "text-drop")}>
                        <ShoppingCart className="size-3.5" aria-hidden />
                        {p.buybox_ganhando ? "Ganhando a compra rápida" : "Perdendo a compra rápida"}
                      </span>
                    )}
                    {p.repricing_ativo && temRecurso(plano, "repricing") && (
                      <span className="inline-flex items-center gap-1 font-semibold text-cobalt">
                        <Wand2 className="size-3.5" aria-hidden /> Ajuste automático
                      </span>
                    )}
                  </p>
                  {sugestao && temRecurso(plano, "sugestao") && <ResumoSugestao s={sugestao} />}
                </div>
                <Etiqueta valor={p.preco} tom="mine" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <Gaveta aberta={!!aberto} aoFechar={fechar} titulo="Preço e custos">
        {aberto && (
          <Detalhe
            p={aberto.p}
            rivais={aberto.rivais}
            rival={aberto.rival}
            vendas={vendas}
            ajustes={ajustes.filter((a) => a.produto_id === aberto.p.id)}
          />
        )}
      </Gaveta>
    </>
  );
}

function ResumoSugestao({ s }: { s: SugestaoPreco }) {
  if (s.tipo === "manter") return null;
  const textos = {
    baixar: { icone: TrendingDown, classe: "text-cobalt", texto: `Dá pra baixar pra ${reais(s.preco)} e ainda lucrar ${reais(s.lucro)}` },
    subir: { icone: TrendingUp, classe: "text-up", texto: `Dá pra subir pra ${reais(s.preco)} e continuar o mais barato` },
    segurar: { icone: TrendingDown, classe: "text-drop", texto: `Não compensa empatar: seu mínimo é ${reais(s.preco)}` },
  } as const;
  const t = textos[s.tipo];
  return (
    <p className={clsx("mt-0.5 flex items-center gap-1 text-sm font-semibold", t.classe)}>
      <t.icone className="size-3.5 shrink-0" aria-hidden /> <span className="truncate">{t.texto}</span>
    </p>
  );
}

function Detalhe({ p, rivais, rival, vendas, ajustes }: { p: Produto; rivais: Concorrente[]; rival: number | null; vendas: Venda[]; ajustes: AjustePreco[] }) {
  const avisar = useAviso();
  const { perfil, atualizarProduto } = useDados();
  const plano = perfil?.plano ?? "gratis";
  const estimada = tarifaEstimada(p.id, vendas);
  const custos = custosDoProduto(p, vendas);
  const sugestao = sugerirPreco(p.preco, rival, custos, p.repricing_diferenca);
  const pisoCusto = custos ? precoMinimo(custos, 0) : null;

  const salvar = async (campos: Parameters<typeof atualizarProduto>[1]) => {
    const r = await atualizarProduto(p.id, campos);
    if (!r.ok) avisar(r.erro, "erro");
  };

  return (
    <div className="space-y-7 pb-2">
      <div className="flex items-start gap-3">
        <Miniatura titulo={p.titulo} src={p.thumbnail} className="size-14 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-medium leading-snug">{p.titulo}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Etiqueta valor={p.preco} tom="mine" />
            {rival != null && <span className="text-sm text-muted">concorrente mais barato: <strong className="text-ink num">{reais(rival)}</strong></span>}
          </div>
        </div>
      </div>

      <section>
        <h3 className="font-sans text-base font-bold tracking-normal">Seus custos por unidade</h3>
        <p className="mt-1 text-sm text-muted">Com eles, o Olheiro calcula quanto sobra em cada venda e até onde dá pra baixar.</p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <CampoNumero id="custo" rotulo="Custo do produto" prefixo="R$" valor={p.custo} aoMudar={(v) => salvar({ custo: v })} />
          <CampoNumero id="imposto" rotulo="Imposto" sufixo="%" valor={p.imposto_pct} aoMudar={(v) => salvar({ imposto_pct: v })} placeholder="ex.: 6" />
          <CampoNumero id="frete" rotulo="Frete que você paga" prefixo="R$" valor={p.frete} aoMudar={(v) => salvar({ frete: v })} placeholder="0" />
          <CampoNumero
            id="tarifa"
            rotulo="Tarifa do Mercado Livre"
            sufixo="%"
            valor={p.tarifa_pct}
            aoMudar={(v) => salvar({ tarifa_pct: v })}
            placeholder={String(estimada ?? TARIFA_PADRAO_PCT).replace(".", ",")}
            dica={estimada != null ? "Vazio = a média das suas vendas (já inclui a tarifa fixa)" : "Vazio = média de um anúncio clássico"}
          />
          <CampoNumero id="fixo" rotulo="Outros custos por venda" prefixo="R$" valor={p.custo_fixo} aoMudar={(v) => salvar({ custo_fixo: v })} placeholder="0" dica="Embalagem, etiqueta..." />
          <CampoNumero id="margem" rotulo="Margem mínima" sufixo="%" valor={p.margem_min_pct} aoMudar={(v) => salvar({ margem_min_pct: v })} placeholder="0" dica="Abaixo disso, não sugerimos baixar" />
        </div>

        {custos && (
          <dl className="mt-4 grid grid-cols-3 gap-3 text-sm">
            <div className="rounded-xl bg-surface-2 p-3">
              <dt className="text-muted">Sobra hoje</dt>
              <dd className={clsx("mt-0.5 font-bold num", lucro(p.preco, custos) < 0 && "text-drop")}>{reais(lucro(p.preco, custos))}</dd>
            </div>
            <div className="rounded-xl bg-surface-2 p-3">
              <dt className="text-muted">Margem</dt>
              <dd className="mt-0.5 font-bold num">{pct(margemPct(p.preco, custos))}</dd>
            </div>
            <div className="rounded-xl bg-surface-2 p-3">
              <dt className="text-muted">Empata em</dt>
              <dd className="mt-0.5 font-bold num">{reais(pisoCusto)}</dd>
            </div>
          </dl>
        )}
      </section>

      <section>
        <h3 className="font-sans text-base font-bold tracking-normal">Sugestão de preço</h3>
        {!temRecurso(plano, "sugestao") ? (
          <RecursoBloqueado recurso="sugestao" className="mt-3" texto="Veja o preço pra ganhar do concorrente sem ficar no prejuízo." />
        ) : !custos ? (
          <p className="mt-2 text-sm text-muted">Preencha pelo menos o custo do produto.</p>
        ) : rival == null ? (
          <p className="mt-2 text-sm text-muted">
            Ligue um concorrente a este anúncio em <Link href="/painel/concorrentes" className="font-semibold text-cobalt hover:underline">Concorrentes</Link>.
          </p>
        ) : (
          <TextoSugestao s={sugestao!} atual={p.preco} />
        )}
      </section>

      {p.catalogo_id && (
        <section>
          <h3 className="font-sans text-base font-bold tracking-normal">Compra rápida do catálogo</h3>
          {!temRecurso(plano, "buybox") ? (
            <RecursoBloqueado recurso="buybox" className="mt-3" texto="Saiba na hora quando outro vendedor passar a ganhar a compra rápida." />
          ) : p.buybox_ganhando == null ? (
            <p className="mt-2 text-sm text-muted">Ainda não conferimos. Sai na próxima rodada.</p>
          ) : (
            <p className={clsx("mt-2 rounded-xl px-4 py-3 text-[15px]", p.buybox_ganhando ? "bg-up-soft text-up" : "bg-drop-soft text-drop")}>
              {p.buybox_ganhando
                ? "Você está ganhando a compra rápida."
                : `Quem ganha agora é ${p.buybox_vencedor ?? "outro vendedor"}${p.buybox_preco != null ? `, por ${reais(p.buybox_preco)}` : ""}.`}
              {p.buybox_verificado_em && <span className="block text-sm opacity-80">Conferido {tempoRelativo(p.buybox_verificado_em)}</span>}
            </p>
          )}
        </section>
      )}

      <section>
        <h3 className="font-sans text-base font-bold tracking-normal">Ajuste automático de preço</h3>
        {!temRecurso(plano, "repricing") ? (
          <RecursoBloqueado recurso="repricing" className="mt-3" texto="O Olheiro acompanha o concorrente mais barato sozinho, sem passar do piso que você definir." />
        ) : (
          <Repricing p={p} temRivais={rivais.length > 0} pisoCusto={pisoCusto} salvar={salvar} ajustes={ajustes} />
        )}
      </section>
    </div>
  );
}

function TextoSugestao({ s, atual }: { s: SugestaoPreco; atual: number }) {
  const linhas: Record<SugestaoPreco["tipo"], { classe: string; titulo: string; texto: string }> = {
    baixar: {
      classe: "bg-cobalt-soft text-cobalt",
      titulo: `Baixe para ${reais(s.preco)}`,
      texto: `Fica ${reais(s.rival - s.preco)} abaixo do concorrente mais barato e ainda sobram ${reais(s.lucro)} por venda (${pct(s.margemPct)}).`,
    },
    subir: {
      classe: "bg-up-soft text-up",
      titulo: `Dá pra subir para ${reais(s.preco)}`,
      texto: `Você continua o mais barato e passa a ganhar ${reais(s.lucro)} por venda (${pct(s.margemPct)}).`,
    },
    segurar: {
      classe: "bg-drop-soft text-drop",
      titulo: "Não compensa empatar com o concorrente",
      texto: `Pra ficar abaixo de ${reais(s.rival)} você passaria da sua margem mínima. O menor preço que vale a pena é ${reais(s.preco)}.`,
    },
    manter: {
      classe: "bg-surface-2",
      titulo: `Mantenha ${reais(atual)}`,
      texto: `Você já é o mais barato e sobra ${reais(s.lucro)} por venda (${pct(s.margemPct)}).`,
    },
  };
  const l = linhas[s.tipo];
  return (
    <div className={clsx("mt-3 rounded-xl px-4 py-3", l.classe)}>
      <p className="font-bold">{l.titulo}</p>
      <p className="mt-0.5 text-[15px] opacity-90">{l.texto}</p>
    </div>
  );
}

function Repricing({
  p, temRivais, pisoCusto, salvar, ajustes,
}: {
  p: Produto;
  temRivais: boolean;
  pisoCusto: number | null;
  salvar: (c: Partial<Pick<Produto, "repricing_ativo" | "repricing_piso" | "repricing_teto" | "repricing_diferenca">>) => Promise<void>;
  ajustes: AjustePreco[];
}) {
  const avisar = useAviso();

  function ligar(v: boolean) {
    if (v && p.repricing_piso == null) return avisar("Defina o preço mínimo antes de ligar.", "erro");
    if (v && !temRivais) return avisar("Ligue pelo menos um concorrente a este anúncio antes.", "erro");
    salvar({ repricing_ativo: v });
    if (v) avisar("Ajuste automático ligado. Ele age na próxima conferência dos concorrentes.");
  }

  return (
    <div className="mt-3 space-y-4">
      <div className="flex items-center gap-3 rounded-xl bg-surface-2 p-4">
        <div className="flex-1">
          <p className="font-semibold">Acompanhar o concorrente mais barato</p>
          <p className="text-sm text-muted">Fica {reais(p.repricing_diferenca)} abaixo dele, sem passar dos limites abaixo.</p>
        </div>
        <Chave rotulo="Ajuste automático" ligada={p.repricing_ativo} aoMudar={ligar} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <CampoNumero
          id="piso"
          rotulo="Preço mínimo"
          prefixo="R$"
          valor={p.repricing_piso}
          aoMudar={(v) => salvar({ repricing_piso: v, ...(v == null ? { repricing_ativo: false } : {}) })}
          dica={pisoCusto != null ? `Nunca abaixo de ${reais(pisoCusto)} (seu custo)` : "Obrigatório"}
        />
        <CampoNumero
          id="teto"
          rotulo="Preço máximo"
          prefixo="R$"
          valor={p.repricing_teto}
          aoMudar={(v) => salvar({ repricing_teto: v })}
          dica="Vazio = só baixa, nunca sobe"
        />
        <CampoNumero
          id="diferenca"
          rotulo="Quanto abaixo do concorrente"
          prefixo="R$"
          valor={p.repricing_diferenca}
          aoMudar={(v) => salvar({ repricing_diferenca: v ?? 0.1 })}
        />
      </div>
      <p className="text-sm text-muted">
        Concorrentes sem estoque não contam. Se o mais barato estiver abaixo do seu mínimo, seu preço fica como está.
        O preço muda no seu anúncio do Mercado Livre e você recebe um aviso a cada ajuste.
      </p>
      {ajustes.length > 0 && (
        <div>
          <p className="pb-2 text-sm font-semibold">Últimos ajustes</p>
          <ul className="divide-y divide-line rounded-xl ring-1 ring-line">
            {ajustes.slice(0, 6).map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                <span className="text-muted">{dataHora(a.created_at)}</span>
                <span className="num">
                  <s className="text-muted">{reais(a.preco_antigo)}</s> <strong>{reais(a.preco_novo)}</strong>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
