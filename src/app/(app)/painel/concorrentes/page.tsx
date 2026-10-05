"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import clsx from "clsx";
import { ClipboardPaste, ExternalLink, Lock, PackageX, Plus, Search, Trash2 } from "lucide-react";
import { useDados } from "@/components/app/dados";
import { Cabecalho } from "@/components/app/cabecalho";
import { Gaveta } from "@/components/ui/gaveta";
import { Botao, BotaoLink } from "@/components/ui/botao";
import { Etiqueta } from "@/components/ui/etiqueta";
import { Miniatura } from "@/components/ui/miniatura";
import { Esqueleto } from "@/components/ui/esqueleto";
import { useAviso } from "@/components/ui/aviso";
import { Chave } from "@/components/ui/chave";
import { CampoNumero } from "@/components/ui/campo-numero";
import { RecursoBloqueado } from "@/components/app/recurso-bloqueado";
import { MiniLinha } from "@/components/charts/mini-linha";
import { LinhaPreco } from "@/components/charts/linha-preco";
import { descreverIntervalo, PLANOS, PLANOS_PAGOS, temRecurso, type PlanoId } from "@/lib/planos";
import { dataHora, reais, tempoRelativo } from "@/lib/format";
import type { CamposRegra, Concorrente, Produto, Sugestao } from "@/lib/types";

// Próximo plano com mais concorrentes que o atual (pra oferta de "aumentar limite").
const proximoPlano = (plano: PlanoId) =>
  PLANOS_PAGOS.find((p) => PLANOS[p].limiteConcorrentes > PLANOS[plano].limiteConcorrentes) ?? null;

function Diferenca({ rival, meu }: { rival: number | null; meu: number | undefined }) {
  if (rival == null || meu == null) return null;
  const d = rival - meu;
  if (Math.abs(d) < 0.01) return <span className="text-sm font-semibold text-muted">mesmo preço que você</span>;
  return d < 0 ? (
    <span className="text-sm font-semibold text-drop num">{reais(-d)} abaixo de você</span>
  ) : (
    <span className="text-sm font-semibold text-up num">{reais(d)} acima de você</span>
  );
}

export default function Concorrentes() {
  const avisar = useAviso();
  const { carregando, perfil, produtos, concorrentes, historicos, limiteConcorrentes, adicionarConcorrente, removerConcorrente, atualizarRegras, sugerirConcorrentes, demo } = useDados();
  const [adicionando, setAdicionando] = useState(false);
  const [detalhe, setDetalhe] = useState<Concorrente | null>(null);

  const plano = perfil?.plano ?? "gratis";
  const cheio = concorrentes.length >= limiteConcorrentes;
  const ultima = concorrentes.map((c) => c.ultima_verificacao).filter(Boolean).sort().at(-1) ?? null;

  const grupos = useMemo(() => {
    const porProduto = new Map<string, { produto: Produto | null; lista: Concorrente[] }>();
    for (const c of concorrentes) {
      const chave = c.meu_item_id ?? "_";
      const produto = produtos.find((p) => p.id === c.meu_item_id) ?? null;
      const g = porProduto.get(chave) ?? { produto, lista: [] };
      g.lista.push(c);
      porProduto.set(chave, g);
    }
    return [...porProduto.values()].sort((a, b) => (a.produto ? 0 : 1) - (b.produto ? 0 : 1));
  }, [concorrentes, produtos]);

  const fecharAdicionar = useCallback(() => setAdicionando(false), []);
  const fecharDetalhe = useCallback(() => setDetalhe(null), []);

  if (carregando) {
    return (
      <div className="space-y-4">
        <Esqueleto className="h-12 w-72" />
        <Esqueleto className="h-48 rounded-[26px]" />
        <Esqueleto className="h-48 rounded-[26px]" />
      </div>
    );
  }

  return (
    <>
      <Cabecalho
        titulo="Concorrentes"
        descricao={
          <>
            Preços conferidos a cada {descreverIntervalo(PLANOS[plano].intervaloHoras)}.
            {ultima && <> Última conferência {tempoRelativo(ultima)}.</>}
          </>
        }
        acoes={
          <Botao icone={<Plus className="size-5" aria-hidden />} onClick={() => setAdicionando(true)}>
            Adicionar concorrente
          </Botao>
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
        <div className="h-1.5 w-20 overflow-hidden rounded-full bg-line">
          <motion.div
            className={clsx("h-full rounded-full", cheio ? "bg-drop" : "bg-cobalt")}
            initial={false}
            animate={{ width: `${Math.min(100, (concorrentes.length / limiteConcorrentes) * 100)}%` }}
          />
        </div>
        <span className="whitespace-nowrap text-muted num">
          {concorrentes.length} de {limiteConcorrentes} no plano {PLANOS[plano].nome}
        </span>
        {proximoPlano(plano) && (
          <Link href="/painel/planos" className="font-semibold text-cobalt hover:underline">Aumentar limite</Link>
        )}
      </div>

      {concorrentes.length === 0 ? (
        <div className="rounded-[26px] border-2 border-dashed border-line px-6 py-16 text-center">
          <Etiqueta valor={null} tom="rival" tamanho="lg" className="opacity-60" />
          <h2 className="mt-5 text-2xl font-bold">Nenhum concorrente ainda</h2>
          <p className="mx-auto mt-2 max-w-[42ch] text-muted">
            Abra o anúncio de um concorrente no Mercado Livre, copie o link e cole aqui. O Olheiro passa a vigiar o preço dele.
          </p>
          <Botao className="mt-6" icone={<Plus className="size-5" aria-hidden />} onClick={() => setAdicionando(true)}>
            Adicionar o primeiro
          </Botao>
        </div>
      ) : (
        <div className="space-y-6">
          {grupos.map((g) => (
            <section key={g.produto?.id ?? "_"} className="overflow-hidden rounded-[26px] bg-surface ring-1 ring-line">
              <header className="flex items-center gap-3 border-b border-line bg-surface-2 px-5 py-4 sm:px-6">
                {g.produto ? (
                  <>
                    <Miniatura titulo={g.produto.titulo} src={g.produto.thumbnail} className="size-11 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-muted">Seu anúncio</p>
                      <p className="truncate font-semibold">{g.produto.titulo}</p>
                    </div>
                    <Etiqueta valor={g.produto.preco} tom="mine" />
                  </>
                ) : (
                  <p className="font-semibold">Sem produto seu ligado</p>
                )}
              </header>
              <ul>
                <AnimatePresence initial={false}>
                  {g.lista.map((c) => {
                    const hist = historicos[c.id] ?? [];
                    const abaixo = g.produto && c.preco_atual != null && c.preco_atual < g.produto.preco;
                    return (
                      <motion.li
                        key={c.id}
                        layout
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                        className="border-b border-line last:border-b-0"
                      >
                        <button
                          onClick={() => setDetalhe(c)}
                          className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 px-5 py-4 text-left transition-colors hover:bg-surface-2 sm:grid-cols-[minmax(0,1fr)_120px_auto] sm:px-6"
                        >
                          <div className="min-w-0">
                            <p className="truncate font-semibold">{c.vendedor ?? "Concorrente"}</p>
                            <p className="truncate text-sm text-muted">{c.titulo}</p>
                            {c.sem_estoque ? (
                              <span className="inline-flex items-center gap-1 text-sm font-semibold text-up">
                                <PackageX className="size-3.5" aria-hidden /> Sem estoque
                              </span>
                            ) : (
                              <Diferenca rival={c.preco_atual} meu={g.produto?.preco} />
                            )}
                          </div>
                          <MiniLinha
                            valores={hist.map((h) => h.preco)}
                            cor={abaixo ? "var(--drop)" : "var(--tag-line)"}
                            className="hidden h-9 w-full sm:block"
                          />
                          <Etiqueta valor={c.preco_atual} riscado={c.preco_anterior} riscadoSoDesktop tom={abaixo ? "drop" : "rival"} />
                        </button>
                      </motion.li>
                    );
                  })}
                </AnimatePresence>
              </ul>
            </section>
          ))}
        </div>
      )}

      <Gaveta aberta={adicionando} aoFechar={fecharAdicionar} titulo="Adicionar concorrente">
        <FormAdicionar
          cheio={cheio}
          limite={limiteConcorrentes}
          plano={plano}
          produtos={produtos}
          demo={demo}
          sugerir={sugerirConcorrentes}
          aoAdicionar={async (link, meu, fechar = true) => {
            const r = await adicionarConcorrente(link, meu);
            if (r.ok) {
              avisar("Concorrente adicionado. O Olheiro já está de olho no preço.");
              if (fechar) setAdicionando(false);
            }
            return r;
          }}
        />
      </Gaveta>

      <Gaveta aberta={!!detalhe} aoFechar={fecharDetalhe} titulo={detalhe?.vendedor ?? "Concorrente"}>
        {detalhe && (
          <Detalhe
            c={detalhe}
            meu={produtos.find((p) => p.id === detalhe.meu_item_id)}
            historico={historicos[detalhe.id] ?? []}
            plano={plano}
            aoMudarRegras={async (campos) => {
              setDetalhe((d) => (d ? { ...d, ...campos } : d));
              const r = await atualizarRegras(detalhe.id, campos);
              if (!r.ok) avisar(r.erro, "erro");
            }}
            aoRemover={async () => {
              await removerConcorrente(detalhe.id);
              setDetalhe(null);
              avisar("Você parou de acompanhar esse concorrente.");
            }}
          />
        )}
      </Gaveta>
    </>
  );
}

function FormAdicionar({
  cheio,
  limite,
  plano,
  produtos,
  demo,
  sugerir,
  aoAdicionar,
}: {
  cheio: boolean;
  limite: number;
  plano: PlanoId;
  produtos: Produto[];
  demo: boolean;
  sugerir: (produtoId: string) => Promise<{ ok: boolean; erro?: string; sugestoes?: Sugestao[] }>;
  aoAdicionar: (link: string, meu: string | null, fechar?: boolean) => Promise<{ ok: boolean; erro?: string; limite?: boolean }>;
}) {
  const [link, setLink] = useState("");
  const [meu, setMeu] = useState<string | null>(produtos[0]?.id ?? null);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [bateuLimite, setBateuLimite] = useState(false);
  const [sugestoes, setSugestoes] = useState<Sugestao[] | null>(null);
  const [buscando, setBuscando] = useState(false);
  const [seguindo, setSeguindo] = useState<string | null>(null);

  if (cheio || bateuLimite) {
    const prox = proximoPlano(plano);
    return (
      <div className="py-4">
        <span className="grid size-14 place-items-center rounded-2xl bg-tag/30 text-tag-ink dark:text-tag">
          <Lock className="size-7" aria-hidden />
        </span>
        <h3 className="mt-5 text-2xl font-bold">Você chegou aos {limite} concorrentes do seu plano</h3>
        {prox ? (
          <>
            <p className="mt-2 text-muted">
              No {PLANOS[prox].nome} você acompanha até {PLANOS[prox].limiteConcorrentes}, com preços conferidos a cada{" "}
              {descreverIntervalo(PLANOS[prox].intervaloHoras)}.
            </p>
            <BotaoLink href="/painel/planos" className="mt-6 w-full">Ver os planos</BotaoLink>
          </>
        ) : (
          <p className="mt-2 text-muted">Pare de acompanhar algum concorrente pra liberar espaço.</p>
        )}
      </div>
    );
  }

  async function buscarSugestoes() {
    if (!meu) return;
    setErro(null);
    setBuscando(true);
    const r = await sugerir(meu);
    setBuscando(false);
    if (!r.ok) return setErro(r.erro ?? "Algo deu errado.");
    setSugestoes(r.sugestoes ?? []);
  }

  async function seguir(s: Sugestao) {
    setSeguindo(s.item_id);
    // Pelo código, não pelo link: link de catálogo levaria pro vencedor da compra rápida.
    const r = await aoAdicionar(s.item_id, meu, false);
    setSeguindo(null);
    if (!r.ok) {
      if (r.limite) setBateuLimite(true);
      else setErro(r.erro ?? "Algo deu errado.");
      return;
    }
    setSugestoes((l) => l?.filter((x) => x.item_id !== s.item_id) ?? null);
  }

  async function colar() {
    try {
      const t = await navigator.clipboard.readText();
      if (t) setLink(t);
    } catch {
      setErro("Seu navegador não deixou colar automaticamente. Segure o campo e escolha Colar.");
    }
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setEnviando(true);
    const r = await aoAdicionar(link, meu);
    setEnviando(false);
    if (!r.ok) {
      if (r.limite) setBateuLimite(true);
      else setErro(r.erro ?? "Algo deu errado.");
    }
  }

  return (
    <form onSubmit={enviar} className="space-y-6 pb-2">
      <div>
        <label htmlFor="link" className="block pb-1.5 font-semibold">Link do anúncio do concorrente</label>
        <div className="flex gap-2">
          <input
            id="link"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            inputMode="url"
            autoComplete="off"
            required
            placeholder="https://produto.mercadolivre.com.br/MLB-..."
            className="h-12 min-w-0 flex-1 rounded-xl bg-surface-2 px-4 text-[16px] ring-1 ring-inset ring-line outline-none focus:ring-2 focus:ring-cobalt"
          />
          <Botao type="button" variante="secundario" className="h-12 shrink-0" onClick={colar} aria-label="Colar da área de transferência">
            <ClipboardPaste className="size-5" aria-hidden />
          </Botao>
        </div>
        <p className="mt-2 text-sm text-muted">
          No app do Mercado Livre: abra o anúncio, toque em Compartilhar e em Copiar link.
        </p>
        {demo && (
          <button type="button" onClick={() => setLink("https://produto.mercadolivre.com.br/MLB-4488120357-exemplo-_JM")} className="mt-2 text-sm font-semibold text-cobalt hover:underline">
            Usar um link de exemplo
          </button>
        )}
      </div>

      {produtos.length > 0 && (
        <fieldset>
          <legend className="pb-2 font-semibold">Com qual produto seu ele compete?</legend>
          <div className="scroll-quiet max-h-72 space-y-2 overflow-y-auto pr-1">
            {[...produtos, null].map((p) => {
              const id = p?.id ?? null;
              const marcado = meu === id;
              return (
                <label
                  key={id ?? "_"}
                  className={clsx(
                    "flex cursor-pointer items-center gap-3 rounded-xl p-3 ring-inset transition-shadow",
                    marcado ? "bg-cobalt-soft ring-2 ring-cobalt" : "ring-1 ring-line hover:bg-surface-2",
                  )}
                >
                  <input type="radio" name="meu" className="sr-only" checked={marcado} onChange={() => { setMeu(id); setSugestoes(null); }} />
                  {p ? (
                    <>
                      <Miniatura titulo={p.titulo} src={p.thumbnail} className="size-9 shrink-0" />
                      <span className="min-w-0 flex-1 truncate text-[15px] font-medium">{p.titulo}</span>
                      <span className="shrink-0 text-sm font-semibold num">{reais(p.preco)}</span>
                    </>
                  ) : (
                    <span className="px-1 text-[15px] text-muted">Nenhum, só quero acompanhar o preço</span>
                  )}
                </label>
              );
            })}
          </div>
        </fieldset>
      )}

      {meu && (
        <section className="rounded-xl bg-surface-2 p-4">
          <p className="font-semibold">Não sabe quem são seus concorrentes?</p>
          <p className="mt-0.5 text-sm text-muted">O Olheiro procura no Mercado Livre anúncios parecidos com o seu.</p>
          {sugestoes == null ? (
            <Botao type="button" variante="secundario" tamanho="sm" className="mt-3" carregando={buscando} icone={<Search className="size-4" aria-hidden />} onClick={buscarSugestoes}>
              Buscar concorrentes
            </Botao>
          ) : sugestoes.length === 0 ? (
            <p className="mt-3 text-sm text-muted">Não achamos anúncios parecidos. Cole o link de um concorrente acima.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {sugestoes.map((s) => (
                <li key={s.item_id} className="flex items-center gap-3 rounded-xl bg-surface p-3 ring-1 ring-line">
                  <Miniatura titulo={s.titulo} src={s.thumbnail} className="size-9 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-medium">{s.titulo}</p>
                    <p className="truncate text-sm text-muted">
                      {s.vendedor && <>{s.vendedor} · </>}
                      <strong className="text-ink num">{reais(s.preco)}</strong>
                    </p>
                  </div>
                  <Botao type="button" variante="secundario" tamanho="sm" carregando={seguindo === s.item_id} disabled={!!seguindo} onClick={() => seguir(s)}>
                    Acompanhar
                  </Botao>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <AnimatePresence>
        {erro && (
          <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} role="alert" className="rounded-xl bg-drop-soft px-4 py-3 text-[15px] text-drop">
            {erro}
          </motion.p>
        )}
      </AnimatePresence>

      <Botao type="submit" tamanho="lg" className="w-full" carregando={enviando}>
        {enviando ? "Buscando o anúncio" : "Adicionar concorrente"}
      </Botao>
    </form>
  );
}

function Detalhe({
  c,
  meu,
  historico,
  plano,
  aoMudarRegras,
  aoRemover,
}: {
  c: Concorrente;
  meu?: Produto;
  historico: { preco: number; registrado_em: string }[];
  plano: PlanoId;
  aoMudarRegras: (campos: Partial<Pick<Concorrente, CamposRegra>>) => Promise<void>;
  aoRemover: () => Promise<void>;
}) {
  const [confirmar, setConfirmar] = useState(false);
  const [removendo, setRemovendo] = useState(false);
  const precos = historico.map((h) => h.preco);
  const menor = precos.length ? Math.min(...precos) : null;
  const maior = precos.length ? Math.max(...precos) : null;

  return (
    <div className="space-y-6 pb-2">
      <div className="flex items-start gap-3">
        <Miniatura titulo={c.titulo} src={c.thumbnail} className="size-14 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-medium leading-snug">{c.titulo}</p>
          <p className="mt-1 text-sm text-muted">
            Conferido {tempoRelativo(c.ultima_verificacao)}
            {c.sem_estoque && <span className="ml-2 font-semibold text-up">Sem estoque agora</span>}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Etiqueta valor={c.preco_atual} riscado={c.preco_anterior} tom={meu && c.preco_atual != null && c.preco_atual < meu.preco ? "drop" : "rival"} tamanho="lg" />
        {meu && <Diferenca rival={c.preco_atual} meu={meu.preco} />}
      </div>

      {historico.length > 1 ? (
        <div className="-mx-2">
          <LinhaPreco pontos={historico} meuPreco={meu?.preco} />
        </div>
      ) : (
        <p className="rounded-xl bg-surface-2 px-4 py-3 text-sm text-muted">
          O gráfico aparece quando o preço mudar pela primeira vez.
        </p>
      )}

      <dl className="grid grid-cols-3 gap-3 text-sm">
        <div className="rounded-xl bg-surface-2 p-3">
          <dt className="text-muted">Menor</dt>
          <dd className="mt-0.5 font-bold num">{reais(menor)}</dd>
        </div>
        <div className="rounded-xl bg-surface-2 p-3">
          <dt className="text-muted">Maior</dt>
          <dd className="mt-0.5 font-bold num">{reais(maior)}</dd>
        </div>
        <div className="rounded-xl bg-surface-2 p-3">
          <dt className="text-muted">Desde</dt>
          <dd className="mt-0.5 font-bold">{historico[0] ? dataHora(historico[0].registrado_em).split(",")[0] : "—"}</dd>
        </div>
      </dl>

      <section>
        <h3 className="font-sans text-base font-bold tracking-normal">Quando avisar no Telegram e e-mail</h3>
        {!temRecurso(plano, "regras") ? (
          <RecursoBloqueado recurso="regras" className="mt-3" texto="Receba só os avisos que importam, como quedas de mais de 5%." />
        ) : (
          <div className="mt-3 space-y-3">
            <p className="text-sm text-muted">Vazio = avisa toda queda. Com mais de uma regra, todas precisam bater. No app, o aviso aparece sempre.</p>
            <div className="grid grid-cols-2 gap-3">
              <CampoNumero
                id="regra-pct"
                rotulo="Só se cair pelo menos"
                sufixo="%"
                placeholder="ex.: 5"
                valor={c.regra_queda_pct}
                aoMudar={(v) => aoMudarRegras({ regra_queda_pct: v })}
              />
              <CampoNumero
                id="regra-abaixo"
                rotulo="Só se ficar abaixo de"
                prefixo="R$"
                valor={c.regra_abaixo_de}
                aoMudar={(v) => aoMudarRegras({ regra_abaixo_de: v })}
              />
            </div>
            {meu && (
              <div className="flex items-center gap-3 rounded-xl bg-surface-2 p-4">
                <p className="flex-1 text-[15px]">Só se ficar mais barato que o meu anúncio ({reais(meu.preco)})</p>
                <Chave
                  rotulo="Só avisar se passar o meu preço"
                  ligada={c.regra_so_abaixo_do_meu}
                  aoMudar={(v) => aoMudarRegras({ regra_so_abaixo_do_meu: v })}
                />
              </div>
            )}
          </div>
        )}
      </section>

      <div className="flex flex-col gap-3 sm:flex-row">
        {c.permalink && (
          <a
            href={c.permalink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-surface px-5 font-semibold ring-1 ring-inset ring-line hover:bg-surface-2"
          >
            Abrir no Mercado Livre <ExternalLink className="size-4" aria-hidden />
          </a>
        )}
        <Botao
          variante="perigo"
          className="flex-1"
          carregando={removendo}
          icone={<Trash2 className="size-4" aria-hidden />}
          onClick={async () => {
            if (!confirmar) return setConfirmar(true);
            setRemovendo(true);
            await aoRemover();
          }}
        >
          {confirmar ? "Toque de novo pra confirmar" : "Parar de acompanhar"}
        </Botao>
      </div>
    </div>
  );
}
