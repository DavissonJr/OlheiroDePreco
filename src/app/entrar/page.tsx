"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, MailCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { Logo } from "@/components/ui/logo";
import { Botao } from "@/components/ui/botao";
import { IS_DEMO, SITE_URL } from "@/lib/config";
import { ativarDemo, sairDemo } from "@/lib/demo";
import { supabaseNavegador } from "@/lib/supabase/client";

type Aba = "entrar" | "criar";
type Tela = "form" | "recuperar" | "confirmar" | "link-enviado";

function traduzirErro(msg: string) {
  if (/invalid login/i.test(msg)) return "E-mail ou senha incorretos.";
  if (/already registered/i.test(msg)) return "Já existe uma conta com esse e-mail. Use a aba Entrar.";
  if (/password should be/i.test(msg)) return "A senha precisa ter pelo menos 6 caracteres.";
  if (/email not confirmed/i.test(msg)) return "Confirme seu e-mail pelo link que enviamos antes de entrar.";
  if (/rate limit|too many/i.test(msg)) return "Muitas tentativas seguidas. Espere alguns minutos e tente de novo.";
  return msg;
}

export default function Entrar() {
  const router = useRouter();
  const [aba, setAba] = useState<Aba>("entrar");
  const [tela, setTela] = useState<Tela>("form");
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    /* eslint-disable react-hooks/set-state-in-effect */
    if (q.get("criar")) setAba("criar");
    // Link de indicação (?ref=codigo): guarda pra usar no cadastro, mesmo se a pessoa navegar antes.
    const ref = q.get("ref");
    try {
      if (ref && /^[a-z0-9]{4,16}$/i.test(ref)) localStorage.setItem("olheiro-ref", ref.toLowerCase());
    } catch {}
    if (q.get("link") === "expirado") setErro("Esse link expirou ou já foi usado. Peça um novo.");
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    if (IS_DEMO) {
      ativarDemo();
      router.push(aba === "criar" ? "/onboarding" : "/painel");
      return;
    }
    setEnviando(true);
    const sb = supabaseNavegador();
    if (aba === "criar") {
      let ref: string | null = null;
      try {
        ref = localStorage.getItem("olheiro-ref");
      } catch {}
      const { data, error } = await sb.auth.signUp({
        email,
        password: senha,
        options: { data: { nome, ...(ref ? { ref } : {}) }, emailRedirectTo: `${SITE_URL}/auth/callback?proximo=/onboarding` },
      });
      setEnviando(false);
      if (error) return setErro(traduzirErro(error.message));
      sairDemo();
      if (!data.session) return setTela("confirmar");
      router.push("/onboarding");
    } else {
      const { data, error } = await sb.auth.signInWithPassword({ email, password: senha });
      if (error) {
        setEnviando(false);
        return setErro(traduzirErro(error.message));
      }
      sairDemo();
      const { data: p } = await sb.from("profiles").select("onboarding_ok").eq("id", data.user.id).single();
      router.push(p?.onboarding_ok ? "/painel" : "/onboarding");
    }
  }

  async function recuperar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    if (IS_DEMO) return setTela("link-enviado");
    setEnviando(true);
    const { error } = await supabaseNavegador().auth.resetPasswordForEmail(email, {
      redirectTo: `${SITE_URL}/auth/callback?proximo=/nova-senha`,
    });
    setEnviando(false);
    if (error) return setErro(traduzirErro(error.message));
    setTela("link-enviado");
  }

  const campo =
    "h-12 w-full rounded-xl bg-surface px-4 text-[16px] ring-1 ring-inset ring-line outline-none transition-shadow placeholder:text-muted/70 focus:ring-2 focus:ring-cobalt";

  const mensagemErro = (
    <AnimatePresence>
      {erro && (
        <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="rounded-xl bg-drop-soft px-4 py-3 text-[15px] text-drop" role="alert">
          {erro}
        </motion.p>
      )}
    </AnimatePresence>
  );

  return (
    <div className="flex min-h-dvh flex-col px-5 pt-[calc(env(safe-area-inset-top,0px)+1.25rem)] pb-10 sm:px-8">
      <Link href="/" className="self-start" aria-label="Voltar pra página inicial">
        <Logo />
      </Link>

      <main className="mx-auto flex w-full max-w-[420px] flex-1 flex-col justify-center py-10">
        <AnimatePresence mode="wait">
          {(tela === "confirmar" || tela === "link-enviado") && (
            <motion.div key="enviado" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-center">
              <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-cobalt-soft text-cobalt">
                <MailCheck className="size-8" aria-hidden />
              </span>
              <h1 className="mt-6 text-3xl font-bold">{tela === "confirmar" ? "Confirme seu e-mail" : "Confira seu e-mail"}</h1>
              <p className="mt-3 text-muted">
                {tela === "confirmar" ? (
                  <>Mandamos um link pra <strong className="text-ink">{email}</strong>. Abra no celular ou no computador e você cai direto na configuração da conta.</>
                ) : (
                  <>Se existir uma conta com <strong className="text-ink">{email}</strong>, você vai receber um link pra criar uma senha nova. Veja também a caixa de spam.</>
                )}
              </p>
              <Botao variante="fantasma" className="mt-6" onClick={() => setTela("form")}>
                Voltar pra tela de entrar
              </Botao>
            </motion.div>
          )}

          {tela === "recuperar" && (
            <motion.div key="recuperar" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <button onClick={() => { setTela("form"); setErro(null); }} className="mb-6 inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink">
                <ArrowLeft className="size-4" aria-hidden /> Voltar
              </button>
              <h1 className="text-[34px] font-bold">Esqueceu a senha?</h1>
              <p className="mt-2 text-muted">Digite o e-mail da sua conta e mandamos um link pra criar uma senha nova.</p>
              <form onSubmit={recuperar} className="mt-8 space-y-4">
                <div>
                  <label className="block pb-1.5 text-sm font-semibold" htmlFor="email-rec">E-mail</label>
                  <input id="email-rec" type="email" inputMode="email" className={campo} value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required placeholder="voce@loja.com.br" />
                </div>
                {mensagemErro}
                <Botao type="submit" tamanho="lg" className="w-full" carregando={enviando}>Enviar link</Botao>
              </form>
            </motion.div>
          )}

          {tela === "form" && (
            <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <h1 className="text-[34px] font-bold">{aba === "criar" ? "Crie sua conta" : "Bom te ver de novo"}</h1>
              <p className="mt-2 text-muted">
                {aba === "criar" ? "Grátis pra acompanhar até 3 concorrentes." : "Entre pra ver suas vendas e seus concorrentes."}
              </p>

              <div className="mt-8 grid grid-cols-2 rounded-xl bg-surface-2 p-1 ring-1 ring-inset ring-line" role="tablist">
                {(["entrar", "criar"] as const).map((a) => (
                  <button
                    key={a}
                    role="tab"
                    aria-selected={aba === a}
                    onClick={() => {
                      setAba(a);
                      setErro(null);
                    }}
                    className="relative h-10 rounded-[10px] text-[15px] font-semibold"
                  >
                    {aba === a && (
                      <motion.span layoutId="aba-entrar" className="absolute inset-0 rounded-[10px] bg-surface shadow-sm ring-1 ring-line" transition={{ type: "spring", stiffness: 500, damping: 38 }} />
                    )}
                    <span className={aba === a ? "relative text-ink" : "relative text-muted"}>{a === "entrar" ? "Entrar" : "Criar conta"}</span>
                  </button>
                ))}
              </div>

              <form onSubmit={enviar} className="mt-6 space-y-4">
                <AnimatePresence initial={false}>
                  {aba === "criar" && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
                      <label className="block pb-1.5 text-sm font-semibold" htmlFor="nome">Seu nome</label>
                      <input id="nome" className={campo} value={nome} onChange={(e) => setNome(e.target.value)} autoComplete="name" required={!IS_DEMO} placeholder="Como quer ser chamado" />
                    </motion.div>
                  )}
                </AnimatePresence>
                <div>
                  <label className="block pb-1.5 text-sm font-semibold" htmlFor="email">E-mail</label>
                  <input id="email" type="email" inputMode="email" className={campo} value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required={!IS_DEMO} placeholder="voce@loja.com.br" />
                </div>
                <div>
                  <div className="flex items-baseline justify-between pb-1.5">
                    <label className="text-sm font-semibold" htmlFor="senha">Senha</label>
                    {aba === "entrar" && (
                      <button type="button" onClick={() => { setTela("recuperar"); setErro(null); }} className="text-sm font-semibold text-cobalt hover:underline">
                        Esqueci minha senha
                      </button>
                    )}
                  </div>
                  <input id="senha" type="password" className={campo} value={senha} onChange={(e) => setSenha(e.target.value)} autoComplete={aba === "criar" ? "new-password" : "current-password"} required={!IS_DEMO} minLength={IS_DEMO ? undefined : 6} placeholder={aba === "criar" ? "Pelo menos 6 caracteres" : ""} />
                </div>

                {mensagemErro}

                <Botao type="submit" tamanho="lg" className="w-full" carregando={enviando}>
                  {aba === "criar" ? "Criar conta" : "Entrar"}
                </Botao>

                {aba === "criar" && (
                  <p className="text-center text-sm text-muted">
                    Ao criar a conta, você concorda com os{" "}
                    <Link href="/termos" className="font-semibold text-ink underline underline-offset-2">Termos de Uso</Link> e a{" "}
                    <Link href="/privacidade" className="font-semibold text-ink underline underline-offset-2">Política de Privacidade</Link>.
                  </p>
                )}
              </form>

              {IS_DEMO && (
                <p className="mt-6 rounded-xl bg-tag/25 px-4 py-3 text-sm">
                  Modo demonstração: não precisa preencher nada. Toque no botão pra ver o app com dados de exemplo.
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
