"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import clsx from "clsx";
import { Bell, ChevronRight, Download, ExternalLink, Gem, LogOut, RefreshCw, Trash2 } from "lucide-react";
import { useDados } from "@/components/app/dados";
import { Cabecalho } from "@/components/app/cabecalho";
import { Botao } from "@/components/ui/botao";
import { Esqueleto } from "@/components/ui/esqueleto";
import { useAviso } from "@/components/ui/aviso";
import { MARKETPLACES, type Marketplace } from "@/lib/types";
import { PLANOS } from "@/lib/planos";
import { hrefConectarML } from "@/lib/demo";
import { Gaveta } from "@/components/ui/gaveta";

interface EventoInstalar extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function Conta() {
  const avisar = useAviso();
  const { carregando, perfil, atualizarPerfil, sincronizar, sair, excluirConta, demo } = useDados();
  const [excluindo, setExcluindo] = useState(false);
  const [nome, setNome] = useState("");
  const [sincronizando, setSincronizando] = useState(false);
  const [instalar, setInstalar] = useState<EventoInstalar | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNome(perfil?.nome ?? "");
  }, [perfil?.nome]);

  // Botão "Instalar o app" aparece quando o navegador permite instalar o PWA.
  useEffect(() => {
    const h = (e: Event) => {
      e.preventDefault();
      setInstalar(e as EventoInstalar);
    };
    window.addEventListener("beforeinstallprompt", h);
    return () => window.removeEventListener("beforeinstallprompt", h);
  }, []);

  if (carregando || !perfil) return <Esqueleto className="h-[520px] rounded-[26px]" />;

  const alternar = (m: Marketplace) => {
    const lista = perfil.marketplaces.includes(m) ? perfil.marketplaces.filter((x) => x !== m) : [...perfil.marketplaces, m];
    atualizarPerfil({ marketplaces: lista });
  };

  const caixa = "rounded-[22px] bg-surface ring-1 ring-line";
  const secao = `${caixa} p-5 sm:p-6`;

  return (
    <>
      <Cabecalho titulo="Conta" />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className={secao}>
          <h2 className="text-lg font-bold">Seus dados</h2>
          <form
            className="mt-4 space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();
              await atualizarPerfil({ nome });
              avisar("Nome salvo.");
            }}
          >
            <div>
              <label htmlFor="nome" className="block pb-1.5 text-sm font-semibold">Nome</label>
              <div className="flex gap-2">
                <input
                  id="nome"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="h-11 min-w-0 flex-1 rounded-xl bg-surface-2 px-4 ring-1 ring-inset ring-line outline-none focus:ring-2 focus:ring-cobalt"
                />
                <Botao type="submit" variante="secundario" disabled={nome === (perfil.nome ?? "")}>Salvar</Botao>
              </div>
            </div>
            <div>
              <p className="pb-1.5 text-sm font-semibold">E-mail</p>
              <p className="text-muted">{perfil.email}</p>
            </div>
          </form>
        </section>

        <section className={secao}>
          <h2 className="text-lg font-bold">Mercado Livre</h2>
          {perfil.ml_nickname ? (
            <>
              <p className="mt-2 text-muted">
                Conectado como <strong className="text-ink">{perfil.ml_nickname}</strong>
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <Botao
                  variante="secundario"
                  icone={<RefreshCw className={clsx("size-4", sincronizando && "animate-spin")} aria-hidden />}
                  disabled={sincronizando}
                  onClick={async () => {
                    setSincronizando(true);
                    const r = await sincronizar();
                    setSincronizando(false);
                    avisar(r.ok ? "Vendas e anúncios atualizados." : r.erro, r.ok ? "ok" : "erro");
                  }}
                >
                  Atualizar vendas e anúncios
                </Botao>
                <a href={hrefConectarML(demo)} className="inline-flex h-11 items-center gap-2 rounded-xl px-4 font-semibold text-muted hover:bg-surface-2 hover:text-ink">
                  Reconectar <ExternalLink className="size-4" aria-hidden />
                </a>
              </div>
            </>
          ) : (
            <a href={hrefConectarML(demo)} className="mt-4 inline-flex h-11 items-center gap-2 rounded-xl bg-[#ffe14d] px-5 font-semibold text-[#2d3277]">
              Conectar Mercado Livre <ExternalLink className="size-4" aria-hidden />
            </a>
          )}
        </section>

        <section className={secao}>
          <h2 className="text-lg font-bold">Onde você vende</h2>
          <p className="mt-1 text-sm text-muted">Usamos isso pra decidir a próxima integração.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {MARKETPLACES.map((m) => {
              const ativo = perfil.marketplaces.includes(m.id);
              return (
                <button
                  key={m.id}
                  onClick={() => alternar(m.id)}
                  aria-pressed={ativo}
                  className={clsx(
                    "inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-semibold ring-inset transition-colors",
                    ativo ? "bg-cobalt-soft text-cobalt ring-2 ring-cobalt" : "text-muted ring-1 ring-line hover:text-ink",
                  )}
                >
                  <span className="size-2.5 rounded-full" style={{ background: m.cor }} aria-hidden />
                  {m.nome}
                  {!m.disponivel && <span className="font-normal opacity-70">em breve</span>}
                </button>
              );
            })}
          </div>
        </section>

        <section className={clsx(caixa, "overflow-hidden")}>
          {[
            { href: "/painel/planos", icone: Gem, titulo: "Plano", sub: PLANOS[perfil.plano].nome },
            { href: "/painel/alertas", icone: Bell, titulo: "Avisos", sub: "Telegram e e-mail" },
          ].map((l) => (
            <Link key={l.href} href={l.href} className="flex items-center gap-4 border-b border-line px-5 py-4 last:border-b-0 hover:bg-surface-2 sm:px-6">
              <l.icone className="size-5 text-muted" aria-hidden />
              <span className="flex-1">
                <span className="block font-semibold">{l.titulo}</span>
                <span className="block text-sm text-muted">{l.sub}</span>
              </span>
              <ChevronRight className="size-5 text-muted" aria-hidden />
            </Link>
          ))}
          {instalar && (
            <button
              onClick={async () => {
                await instalar.prompt();
                setInstalar(null);
              }}
              className="flex w-full items-center gap-4 border-t border-line px-5 py-4 text-left hover:bg-surface-2 sm:px-6"
            >
              <Download className="size-5 text-muted" aria-hidden />
              <span className="flex-1">
                <span className="block font-semibold">Instalar o app</span>
                <span className="block text-sm text-muted">Abra o Olheiro direto da tela inicial</span>
              </span>
            </button>
          )}
        </section>
      </div>

      <div className="mt-8 flex flex-wrap gap-2">
        <Botao variante="fantasma" icone={<LogOut className="size-4" aria-hidden />} onClick={sair}>
          {demo ? "Sair da demonstração" : "Sair da conta"}
        </Botao>
        {!demo && (
          <Botao variante="fantasma" className="text-drop" icone={<Trash2 className="size-4" aria-hidden />} onClick={() => setExcluindo(true)}>
            Excluir conta
          </Botao>
        )}
      </div>

      <Gaveta aberta={excluindo} aoFechar={() => setExcluindo(false)} titulo="Excluir conta">
        <ExcluirConta aoConfirmar={excluirConta} assinaturaAtiva={perfil.assinatura_ativa} />
      </Gaveta>
    </>
  );
}

function ExcluirConta({ aoConfirmar, assinaturaAtiva }: { aoConfirmar: () => Promise<{ ok: boolean; erro?: string }>; assinaturaAtiva: boolean }) {
  const avisar = useAviso();
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const pronto = texto.trim().toUpperCase() === "EXCLUIR";

  return (
    <div className="space-y-5 pb-2">
      <p>Isso apaga de vez sua conta e tudo ligado a ela:</p>
      <ul className="list-disc space-y-1.5 pl-5 text-muted">
        <li>Concorrentes acompanhados e histórico de preços</li>
        <li>Vendas e anúncios importados do Mercado Livre</li>
        <li>Avisos e conexão com o Telegram</li>
        {assinaturaAtiva && <li className="font-semibold text-ink">Sua assinatura do Pro, que será cancelada no Mercado Pago</li>}
      </ul>
      <p className="text-sm text-muted">Não dá pra desfazer. Pra usar de novo, você vai precisar criar outra conta.</p>
      <div>
        <label htmlFor="confirmar-exclusao" className="block pb-1.5 text-sm font-semibold">
          Digite EXCLUIR pra confirmar
        </label>
        <input
          id="confirmar-exclusao"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          autoComplete="off"
          autoCapitalize="characters"
          className="h-12 w-full rounded-xl bg-surface-2 px-4 text-[16px] ring-1 ring-inset ring-line outline-none focus:ring-2 focus:ring-drop"
        />
      </div>
      <Botao
        variante="perigo"
        tamanho="lg"
        className="w-full"
        disabled={!pronto}
        carregando={enviando}
        onClick={async () => {
          setEnviando(true);
          const r = await aoConfirmar();
          setEnviando(false);
          if (!r.ok) avisar(r.erro ?? "Algo deu errado.", "erro");
        }}
      >
        Excluir minha conta
      </Botao>
    </div>
  );
}
