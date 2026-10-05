import Link from "next/link";
import { Lock } from "lucide-react";
import clsx from "clsx";
import { PLANOS, planoMinimo, type Recurso } from "@/lib/planos";

// Cartão de "isso é de outro plano", com o nome do menor plano que libera.
export function RecursoBloqueado({ recurso, texto, className }: { recurso: Recurso; texto: string; className?: string }) {
  const plano = PLANOS[planoMinimo(recurso)];
  return (
    <div className={clsx("rounded-xl bg-surface-2 p-4", className)}>
      <p className="flex items-center gap-2 text-sm font-semibold">
        <Lock className="size-4 text-muted" aria-hidden /> Disponível no plano {plano.nome}
      </p>
      <p className="mt-1 text-sm text-muted">{texto}</p>
      <Link href="/painel/planos" className="mt-2 inline-block text-sm font-semibold text-cobalt hover:underline">
        Ver planos
      </Link>
    </div>
  );
}
