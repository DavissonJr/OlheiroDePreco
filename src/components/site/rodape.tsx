import Link from "next/link";
import { Logo } from "@/components/ui/logo";
import { CONTATO_EMAIL } from "@/lib/config";

export function Rodape() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 py-10 text-sm text-muted sm:px-8 md:flex-row md:items-center md:justify-between">
        <Logo tamanho="sm" />
        <nav className="flex flex-wrap gap-x-6 gap-y-2" aria-label="Rodapé">
          <Link href="/termos" className="hover:text-ink">Termos de Uso</Link>
          <Link href="/privacidade" className="hover:text-ink">Privacidade</Link>
          <a href={`mailto:${CONTATO_EMAIL}`} className="hover:text-ink">Fale com a gente</a>
        </nav>
      </div>
      <p className="mx-auto max-w-6xl px-5 pb-10 text-sm text-muted sm:px-8">
        O Olheiro de Preço não é afiliado ao Mercado Livre nem ao Mercado Pago. As marcas citadas pertencem aos seus donos.
      </p>
    </footer>
  );
}
