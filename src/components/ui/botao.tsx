"use client";

import clsx from "clsx";
import Link from "next/link";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";

type Variante = "primario" | "secundario" | "fantasma" | "perigo" | "etiqueta";
type Tamanho = "sm" | "md" | "lg";

const base =
  "relative inline-flex items-center justify-center gap-2 font-semibold whitespace-nowrap select-none transition-colors disabled:opacity-55 disabled:pointer-events-none";

const variantes: Record<Variante, string> = {
  primario: "bg-cobalt text-white hover:brightness-110",
  secundario: "bg-surface text-ink ring-1 ring-inset ring-line hover:bg-surface-2",
  fantasma: "text-ink hover:bg-surface-2",
  perigo: "bg-drop-soft text-drop hover:brightness-95",
  etiqueta: "bg-tag text-tag-ink hover:brightness-105",
};

const tamanhos: Record<Tamanho, string> = {
  sm: "h-9 px-3.5 text-sm rounded-[10px]",
  md: "h-11 px-5 text-[15px] rounded-xl",
  lg: "h-13 px-6 text-base rounded-[14px]",
};

interface Props extends Omit<ComponentProps<typeof motion.button>, "children"> {
  variante?: Variante;
  tamanho?: Tamanho;
  carregando?: boolean;
  icone?: ReactNode;
  children?: ReactNode;
}

export function Botao({ variante = "primario", tamanho = "md", carregando, icone, className, children, disabled, ...resto }: Props) {
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      transition={{ type: "spring", stiffness: 600, damping: 30 }}
      className={clsx(base, variantes[variante], tamanhos[tamanho], className)}
      disabled={disabled || carregando}
      aria-busy={carregando || undefined}
      {...resto}
    >
      {carregando ? <Loader2 className="size-4 animate-spin" aria-hidden /> : icone}
      {children}
    </motion.button>
  );
}

export function BotaoLink({
  href,
  variante = "primario",
  tamanho = "md",
  className,
  children,
  icone,
}: {
  href: string;
  variante?: Variante;
  tamanho?: Tamanho;
  className?: string;
  children: ReactNode;
  icone?: ReactNode;
}) {
  return (
    <Link href={href} className={clsx(base, variantes[variante], tamanhos[tamanho], "active:scale-[.97] transition-transform", className)}>
      {icone}
      {children}
    </Link>
  );
}
