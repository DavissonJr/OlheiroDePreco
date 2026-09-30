"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { BarraInferior, BarraLateral } from "@/components/app/navegacao";
import { useDados } from "@/components/app/dados";
import { Logo } from "@/components/ui/logo";

export default function LayoutPainel({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { demo } = useDados();

  return (
    <div className="flex min-h-dvh">
      <BarraLateral />
      <div className="min-w-0 flex-1">
        {demo && (
          <div className="bg-tag px-4 py-2 text-center text-sm font-medium text-tag-ink pt-[calc(env(safe-area-inset-top,0px)+0.5rem)]">
            Você está na demonstração.{" "}
            <Link href="/entrar?criar=1" className="font-bold underline underline-offset-2">Criar conta grátis</Link>
          </div>
        )}
        <header className="flex items-center justify-between px-5 pt-4 lg:hidden">
          <Link href="/painel" aria-label="Visão geral">
            <Logo tamanho="sm" curto />
          </Link>
        </header>
        {/* Entrada suave a cada troca de página (resposta ao toque na navegação) */}
        <motion.main
          key={pathname}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          className="safe-bottom mx-auto w-full max-w-6xl px-5 pt-6 sm:px-8 lg:pt-10"
        >
          {children}
        </motion.main>
      </div>
      <BarraInferior />
    </div>
  );
}
