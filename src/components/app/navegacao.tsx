"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import clsx from "clsx";
import { Bell, Eye, Gem, LayoutDashboard, UserRound } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { useDados } from "./dados";
import { PLANOS } from "@/lib/planos";

const ITENS = [
  { href: "/painel", rotulo: "Visão geral", curto: "Início", icone: LayoutDashboard },
  { href: "/painel/concorrentes", rotulo: "Concorrentes", curto: "Concorrentes", icone: Eye },
  { href: "/painel/alertas", rotulo: "Avisos", curto: "Avisos", icone: Bell },
  { href: "/painel/planos", rotulo: "Plano", curto: "Plano", icone: Gem, soDesktop: true },
  { href: "/painel/conta", rotulo: "Conta", curto: "Conta", icone: UserRound },
];

function ativo(pathname: string, href: string) {
  return href === "/painel" ? pathname === "/painel" : pathname.startsWith(href);
}

export function BarraLateral() {
  const pathname = usePathname();
  const { alertas, perfil, concorrentes, limiteConcorrentes } = useDados();
  const naoLidos = alertas.filter((a) => !a.lido).length;
  const plano = perfil?.plano ?? "gratis";

  return (
    <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-line bg-surface px-4 py-6 lg:flex">
      <Link href="/painel" className="px-2" aria-label="Visão geral">
        <Logo curto />
      </Link>
      <nav className="mt-9 space-y-1" aria-label="Principal">
        {ITENS.map((i) => {
          const at = ativo(pathname, i.href);
          return (
            <Link
              key={i.href}
              href={i.href}
              aria-current={at ? "page" : undefined}
              className={clsx("relative flex h-11 items-center gap-3 rounded-xl px-3 text-[15px] font-semibold transition-colors", at ? "text-cobalt" : "text-muted hover:text-ink")}
            >
              {at && (
                <motion.span layoutId="nav-lateral" className="absolute inset-0 rounded-xl bg-cobalt-soft" transition={{ type: "spring", stiffness: 500, damping: 40 }} />
              )}
              <i.icone className="relative size-5" aria-hidden />
              <span className="relative flex-1">{i.rotulo}</span>
              {i.href === "/painel/alertas" && naoLidos > 0 && (
                <span className="relative grid h-5 min-w-5 place-items-center rounded-full bg-drop px-1.5 text-xs font-bold text-white num">{naoLidos}</span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto rounded-2xl bg-surface-2 p-4 ring-1 ring-line">
        <p className="text-sm font-semibold">Plano {PLANOS[plano].nome}</p>
        <p className="mt-0.5 text-sm text-muted num">
          {concorrentes.length} de {limiteConcorrentes} concorrentes
        </p>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-line">
          <motion.div
            className={clsx("h-full rounded-full", concorrentes.length >= limiteConcorrentes ? "bg-drop" : "bg-cobalt")}
            initial={false}
            animate={{ width: `${Math.min(100, (concorrentes.length / limiteConcorrentes) * 100)}%` }}
          />
        </div>
        {plano === "gratis" && (
          <Link href="/painel/planos" className="mt-3 inline-block text-sm font-semibold text-cobalt hover:underline">
            Conhecer o Pro
          </Link>
        )}
      </div>
    </aside>
  );
}

export function BarraInferior() {
  const pathname = usePathname();
  const { alertas } = useDados();
  const naoLidos = alertas.filter((a) => !a.lido).length;

  return (
    <nav
      aria-label="Principal"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/90 pb-[env(safe-area-inset-bottom,0px)] backdrop-blur-xl lg:hidden"
    >
      <ul className="mx-auto flex max-w-md justify-around px-2">
        {ITENS.filter((i) => !i.soDesktop).map((i) => {
          const at = ativo(pathname, i.href);
          return (
            <li key={i.href} className="flex-1">
              <Link href={i.href} aria-current={at ? "page" : undefined} className="relative flex flex-col items-center gap-1 pt-2.5 pb-2 text-[11px] font-semibold">
                {at && (
                  <motion.span layoutId="nav-inferior" className="absolute top-0 h-[3px] w-8 rounded-b-full bg-cobalt" transition={{ type: "spring", stiffness: 500, damping: 40 }} />
                )}
                <span className="relative">
                  <i.icone className={clsx("size-6 transition-colors", at ? "text-cobalt" : "text-muted")} strokeWidth={at ? 2.3 : 1.9} aria-hidden />
                  {i.href === "/painel/alertas" && naoLidos > 0 && (
                    <span className="absolute -top-1 -right-2 grid h-4 min-w-4 place-items-center rounded-full bg-drop px-1 text-[10px] font-bold text-white num">{naoLidos}</span>
                  )}
                </span>
                <span className={at ? "text-cobalt" : "text-muted"}>{i.curto}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
