"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { Botao } from "@/components/ui/botao";
import { Logo } from "@/components/ui/logo";
import { supabaseNavegador } from "@/lib/supabase/client";

export default function NovaSenha() {
  const router = useRouter();
  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    if (senha.length < 6) return setErro("A senha precisa ter pelo menos 6 caracteres.");
    if (senha !== confirmacao) return setErro("As duas senhas não são iguais.");
    setSalvando(true);
    const { error } = await supabaseNavegador().auth.updateUser({ password: senha });
    setSalvando(false);
    if (error) {
      return setErro(
        /session/i.test(error.message)
          ? "O link de troca de senha expirou. Peça um novo na tela de entrar."
          : error.message,
      );
    }
    router.push("/painel");
  }

  const campo =
    "h-12 w-full rounded-xl bg-surface px-4 text-[16px] ring-1 ring-inset ring-line outline-none focus:ring-2 focus:ring-cobalt";

  return (
    <div className="flex min-h-dvh flex-col px-5 pt-[calc(env(safe-area-inset-top,0px)+1.25rem)] pb-10 sm:px-8">
      <Link href="/" className="self-start" aria-label="Página inicial">
        <Logo />
      </Link>
      <main className="mx-auto flex w-full max-w-[420px] flex-1 flex-col justify-center py-10">
        <h1 className="text-[34px] font-bold">Crie uma senha nova</h1>
        <p className="mt-2 text-muted">Depois de salvar, você entra direto no painel.</p>
        <form onSubmit={salvar} className="mt-8 space-y-4">
          <div>
            <label htmlFor="senha" className="block pb-1.5 text-sm font-semibold">Senha nova</label>
            <input id="senha" type="password" autoComplete="new-password" className={campo} value={senha} onChange={(e) => setSenha(e.target.value)} placeholder="Pelo menos 6 caracteres" required />
          </div>
          <div>
            <label htmlFor="confirmacao" className="block pb-1.5 text-sm font-semibold">Repita a senha</label>
            <input id="confirmacao" type="password" autoComplete="new-password" className={campo} value={confirmacao} onChange={(e) => setConfirmacao(e.target.value)} required />
          </div>
          <AnimatePresence>
            {erro && (
              <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} role="alert" className="rounded-xl bg-drop-soft px-4 py-3 text-[15px] text-drop">
                {erro}
              </motion.p>
            )}
          </AnimatePresence>
          <Botao type="submit" tamanho="lg" className="w-full" carregando={salvando}>Salvar senha</Botao>
        </form>
      </main>
    </div>
  );
}
