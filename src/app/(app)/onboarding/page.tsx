"use client";

import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ExternalLink, Mail, Send } from "lucide-react";
import clsx from "clsx";
import { useEffect, useState } from "react";
import { useDados } from "@/components/app/dados";
import { useAviso } from "@/components/ui/aviso";
import { Botao } from "@/components/ui/botao";
import { Chave } from "@/components/ui/chave";
import { Logo } from "@/components/ui/logo";
import { MARKETPLACES, type Marketplace } from "@/lib/types";
import { primeiroNome } from "@/lib/format";

const ETAPAS = ["Onde você vende", "Mercado Livre", "Avisos"];

export default function Onboarding() {
  const router = useRouter();
  const avisar = useAviso();
  const { perfil, atualizarPerfil, conectarTelegram, demo } = useDados();
  const [etapa, setEtapa] = useState(0);
  const [direcao, setDirecao] = useState(1);
  const [escolhidos, setEscolhidos] = useState<Marketplace[]>(["mercadolivre"]);
  const [erroMl, setErroMl] = useState(false);
  const [mlConectado, setMlConectado] = useState(false);
  const [ligandoTg, setLigandoTg] = useState(false);
  const [finalizando, setFinalizando] = useState(false);

  useEffect(() => {
    const ml = new URLSearchParams(window.location.search).get("ml");
    /* eslint-disable react-hooks/set-state-in-effect */
    if (ml === "ok" || ml === "demo") {
      setMlConectado(true);
      setEtapa(2);
    } else if (ml === "erro") {
      setErroMl(true);
      setEtapa(1);
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (perfil?.marketplaces?.length) setEscolhidos(perfil.marketplaces);
  }, [perfil?.marketplaces]);

  const ir = (n: number) => {
    setDirecao(n > etapa ? 1 : -1);
    setEtapa(n);
  };

  const alternar = (m: Marketplace) =>
    setEscolhidos((l) => (l.includes(m) ? l.filter((x) => x !== m) : [...l, m]));

  async function ligarTelegram() {
    setLigandoTg(true);
    const r = await conectarTelegram();
    setLigandoTg(false);
    if (!r.ok) return avisar(r.erro, "erro");
    if (r.link) window.open(r.link, "_blank", "noopener");
    else avisar("Telegram conectado.");
  }

  async function concluir() {
    setFinalizando(true);
    await atualizarPerfil({ onboarding_ok: true });
    router.push("/painel");
  }

  const variantes = {
    entra: (d: number) => ({ x: d * 40, opacity: 0 }),
    centro: { x: 0, opacity: 1 },
    sai: (d: number) => ({ x: d * -40, opacity: 0 }),
  };

  return (
    <div className="flex min-h-dvh flex-col px-5 pt-[calc(env(safe-area-inset-top,0px)+1.25rem)] pb-10 sm:px-8">
      <div className="mx-auto flex w-full max-w-xl items-center justify-between">
        <Logo tamanho="sm" />
        <span className="text-sm text-muted num">
          Etapa {etapa + 1} de {ETAPAS.length}
        </span>
      </div>

      <div className="mx-auto mt-6 grid w-full max-w-xl grid-cols-3 gap-2" aria-hidden>
        {ETAPAS.map((e, i) => (
          <div key={e} className="h-1.5 overflow-hidden rounded-full bg-line">
            <motion.div
              className="h-full rounded-full bg-cobalt"
              initial={false}
              animate={{ width: i <= etapa ? "100%" : "0%" }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            />
          </div>
        ))}
      </div>

      <main className="mx-auto w-full max-w-xl flex-1 pt-10">
        <AnimatePresence mode="wait" custom={direcao}>
          {etapa === 0 && (
            <motion.section key="e0" custom={direcao} variants={variantes} initial="entra" animate="centro" exit="sai" transition={{ duration: 0.28 }}>
              <h1 className="text-3xl font-bold sm:text-4xl">
                {perfil?.nome && !demo ? `${primeiroNome(perfil.nome)}, onde você vende?` : "Onde você vende?"}
              </h1>
              <p className="mt-2 text-muted">Marque todos. O Mercado Livre já funciona; os outros chegam na ordem que vocês pedirem.</p>

              <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {MARKETPLACES.map((m) => {
                  const marcado = escolhidos.includes(m.id);
                  return (
                    <button
                      key={m.id}
                      onClick={() => alternar(m.id)}
                      aria-pressed={marcado}
                      className={clsx(
                        "flex items-center gap-3 rounded-2xl bg-surface p-4 text-left ring-inset transition-shadow",
                        marcado ? "ring-2 ring-cobalt" : "ring-1 ring-line hover:ring-muted/50",
                      )}
                    >
                      <span className="size-9 shrink-0 rounded-[10px]" style={{ background: m.cor }} aria-hidden />
                      <span className="flex-1">
                        <span className="block font-semibold">{m.nome}</span>
                        <span className="block text-sm text-muted">{m.disponivel ? "Disponível" : "Em breve"}</span>
                      </span>
                      <span className={clsx("grid size-6 place-items-center rounded-full transition-colors", marcado ? "bg-cobalt text-white" : "ring-1 ring-line")}>
                        <AnimatePresence>
                          {marcado && (
                            <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={{ type: "spring", stiffness: 600, damping: 25 }}>
                              <Check className="size-4" strokeWidth={3} aria-hidden />
                            </motion.span>
                          )}
                        </AnimatePresence>
                      </span>
                    </button>
                  );
                })}
              </div>

              <Botao
                tamanho="lg"
                className="mt-8 w-full sm:w-auto"
                disabled={!escolhidos.length}
                onClick={async () => {
                  await atualizarPerfil({ marketplaces: escolhidos });
                  ir(1);
                }}
              >
                Continuar
              </Botao>
            </motion.section>
          )}

          {etapa === 1 && (
            <motion.section key="e1" custom={direcao} variants={variantes} initial="entra" animate="centro" exit="sai" transition={{ duration: 0.28 }}>
              <h1 className="text-3xl font-bold sm:text-4xl">Conecte sua conta do Mercado Livre</h1>
              <p className="mt-2 text-muted">
                Você vai pro site do Mercado Livre, confere o que o Radar pode ver e aprova. Depois volta pra cá sozinho.
              </p>

              <ul className="mt-8 space-y-3 rounded-2xl bg-surface p-5 ring-1 ring-line">
                {[
                  "Ler seus pedidos pra montar o painel de vendas",
                  "Ler seus anúncios pra comparar com os concorrentes",
                  "Consultar preços de outros anúncios",
                ].map((t) => (
                  <li key={t} className="flex gap-3">
                    <Check className="mt-0.5 size-5 shrink-0 text-up" aria-hidden />
                    {t}
                  </li>
                ))}
                <li className="border-t border-line pt-3 text-sm text-muted">
                  O Radar não altera preços nem anúncios e nunca vê sua senha.
                </li>
              </ul>

              {erroMl && (
                <p className="mt-4 rounded-xl bg-drop-soft px-4 py-3 text-[15px] text-drop" role="alert">
                  A conexão não foi concluída. Tente de novo e, no Mercado Livre, toque em “Permitir”.
                </p>
              )}

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <a
                  href="/api/ml/conectar"
                  className="inline-flex h-13 items-center justify-center gap-2 rounded-[14px] bg-[#ffe14d] px-6 font-semibold text-[#2d3277] transition-transform hover:brightness-105 active:scale-[.97]"
                >
                  Conectar Mercado Livre
                  <ExternalLink className="size-4" aria-hidden />
                </a>
                <Botao variante="fantasma" tamanho="lg" onClick={() => ir(2)}>
                  Fazer isso depois
                </Botao>
              </div>
            </motion.section>
          )}

          {etapa === 2 && (
            <motion.section key="e2" custom={direcao} variants={variantes} initial="entra" animate="centro" exit="sai" transition={{ duration: 0.28 }}>
              {mlConectado && (
                <motion.p
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="mb-6 inline-flex items-center gap-2 rounded-full bg-up-soft px-3 py-1.5 text-sm font-semibold text-up"
                >
                  <Check className="size-4" aria-hidden />
                  Mercado Livre conectado{perfil?.ml_nickname ? ` como ${perfil.ml_nickname}` : ""}
                </motion.p>
              )}
              <h1 className="text-3xl font-bold sm:text-4xl">Onde você quer receber os avisos?</h1>
              <p className="mt-2 text-muted">Quando um concorrente baixar o preço, o Radar te chama aqui.</p>

              <div className="mt-8 divide-y divide-line rounded-2xl bg-surface ring-1 ring-line">
                <div className="flex items-center gap-4 p-5">
                  <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#2aabee] text-white">
                    <Send className="size-5" aria-hidden />
                  </span>
                  <div className="flex-1">
                    <p className="font-semibold">Telegram</p>
                    <p className="text-sm text-muted">Chega na hora, com o celular bloqueado. Plano Pro.</p>
                  </div>
                  {perfil?.telegram_conectado ? (
                    <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-up">
                      <Check className="size-4" aria-hidden /> Conectado
                    </span>
                  ) : (
                    <Botao variante="secundario" tamanho="sm" carregando={ligandoTg} onClick={ligarTelegram}>
                      Conectar
                    </Botao>
                  )}
                </div>
                <div className="flex items-center gap-4 p-5">
                  <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-cobalt-soft text-cobalt">
                    <Mail className="size-5" aria-hidden />
                  </span>
                  <div className="flex-1">
                    <p className="font-semibold">E-mail</p>
                    <p className="text-sm text-muted">{perfil?.email ?? "No e-mail da sua conta"}</p>
                  </div>
                  <Chave rotulo="Avisos por e-mail" ligada={perfil?.alerta_email ?? true} aoMudar={(v) => atualizarPerfil({ alerta_email: v })} />
                </div>
              </div>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Botao tamanho="lg" carregando={finalizando} onClick={concluir}>
                  Ir para o painel
                </Botao>
                <Botao variante="fantasma" tamanho="lg" onClick={() => ir(1)}>
                  Voltar
                </Botao>
              </div>
            </motion.section>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
