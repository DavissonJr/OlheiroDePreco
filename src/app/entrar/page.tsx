"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { MailCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { Logo } from "@/components/ui/logo";
import { Botao } from "@/components/ui/botao";
import { IS_DEMO, SITE_URL } from "@/lib/config";
import { supabaseNavegador } from "@/lib/supabase/client";

type Aba = "entrar" | "criar";

function traduzirErro(msg: string) {
  if (/invalid login/i.test(msg)) return "E-mail ou senha incorretos.";
  if (/already registered/i.test(msg)) return "Já existe uma conta com esse e-mail. Use a aba Entrar.";
  if (/password should be/i.test(msg)) return "A senha precisa ter pelo menos 6 caracteres.";
  if (/email not confirmed/i.test(msg)) return "Confirme seu e-mail pelo link que enviamos antes de entrar.";
  return msg;
}

export default function Entrar() {
  const router = useRouter();
  const [aba, setAba] = useState<Aba>("entrar");
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [confirmar, setConfirmar] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (new URLSearchParams(window.location.search).get("criar")) setAba("criar");
  }, []);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    if (IS_DEMO) {
      router.push(aba === "criar" ? "/onboarding" : "/painel");
      return;
    }
    setEnviando(true);
    const sb = supabaseNavegador();
    if (aba === "criar") {
      const { data, error } = await sb.auth.signUp({
        email,
        password: senha,
        options: { data: { nome }, emailRedirectTo: `${SITE_URL}/auth/callback` },
      });
      setEnviando(false);
      if (error) return setErro(traduzirErro(error.message));
      if (!data.session) return setConfirmar(true);
      router.push("/onboarding");
    } else {
      const { data, error } = await sb.auth.signInWithPassword({ email, password: senha });
      if (error) {
        setEnviando(false);
        return setErro(traduzirErro(error.message));
      }
      const { data: p } = await sb.from("profiles").select("onboarding_ok").eq("id", data.user.id).single();
      router.push(p?.onboarding_ok ? "/painel" : "/onboarding");
    }
  }

  const campo =
    "h-12 w-full rounded-xl bg-surface px-4 text-[16px] ring-1 ring-inset ring-line outline-none transition-shadow placeholder:text-muted/70 focus:ring-2 focus:ring-cobalt";

  return (
    <div className="flex min-h-dvh flex-col px-5 pt-[calc(env(safe-area-inset-top,0px)+1.25rem)] pb-10 sm:px-8">
      <Link href="/" className="self-start" aria-label="Voltar pra página inicial">
        <Logo />
      </Link>

      <main className="mx-auto flex w-full max-w-[420px] flex-1 flex-col justify-center py-10">
        <AnimatePresence mode="wait">
          {confirmar ? (
            <motion.div key="confirmar" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="text-center">
              <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-cobalt-soft text-cobalt">
                <MailCheck className="size-8" aria-hidden />
              </span>
              <h1 className="mt-6 text-3xl font-bold">Confirme seu e-mail</h1>
              <p className="mt-3 text-muted">
                Mandamos um link pra <strong className="text-ink">{email}</strong>. Abra no celular ou no computador e você cai direto na configuração da conta.
              </p>
              <Botao variante="fantasma" className="mt-6" onClick={() => setConfirmar(false)}>
                Usar outro e-mail
              </Botao>
            </motion.div>
          ) : (
            <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
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
                      <motion.span
                        layoutId="aba-entrar"
                        className="absolute inset-0 rounded-[10px] bg-surface shadow-sm ring-1 ring-line"
                        transition={{ type: "spring", stiffness: 500, damping: 38 }}
                      />
                    )}
                    <span className={aba === a ? "relative text-ink" : "relative text-muted"}>
                      {a === "entrar" ? "Entrar" : "Criar conta"}
                    </span>
                  </button>
                ))}
              </div>

              <form onSubmit={enviar} className="mt-6 space-y-4">
                <AnimatePresence initial={false}>
                  {aba === "criar" && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      className="overflow-hidden"
                    >
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
                  <label className="block pb-1.5 text-sm font-semibold" htmlFor="senha">Senha</label>
                  <input id="senha" type="password" className={campo} value={senha} onChange={(e) => setSenha(e.target.value)} autoComplete={aba === "criar" ? "new-password" : "current-password"} required={!IS_DEMO} minLength={IS_DEMO ? undefined : 6} placeholder={aba === "criar" ? "Pelo menos 6 caracteres" : ""} />
                </div>

                <AnimatePresence>
                  {erro && (
                    <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="rounded-xl bg-drop-soft px-4 py-3 text-[15px] text-drop" role="alert">
                      {erro}
                    </motion.p>
                  )}
                </AnimatePresence>

                <Botao type="submit" tamanho="lg" className="w-full" carregando={enviando}>
                  {aba === "criar" ? "Criar conta" : "Entrar"}
                </Botao>
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
