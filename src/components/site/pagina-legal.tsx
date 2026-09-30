import Link from "next/link";
import { Logo } from "@/components/ui/logo";
import { Rodape } from "./rodape";

export function PaginaLegal({ titulo, atualizado, children }: { titulo: string; atualizado: string; children: React.ReactNode }) {
  return (
    <>
      <header className="mx-auto flex max-w-3xl items-center justify-between px-5 pt-[calc(env(safe-area-inset-top,0px)+1.25rem)] pb-4 sm:px-8">
        <Link href="/" aria-label="Página inicial">
          <Logo />
        </Link>
      </header>
      <main className="mx-auto max-w-3xl px-5 pt-10 pb-20 sm:px-8">
        <h1 className="text-4xl font-bold sm:text-5xl">{titulo}</h1>
        <p className="mt-3 text-muted">Última atualização: {atualizado}</p>
        <div className="legal mt-10 max-w-[68ch] text-[17px] leading-relaxed">{children}</div>
      </main>
      <Rodape />
    </>
  );
}
