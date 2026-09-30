import Link from "next/link";
import { Logo } from "@/components/ui/logo";
import { BotaoLink } from "@/components/ui/botao";
import { Etiqueta } from "@/components/ui/etiqueta";

export default function NaoEncontrada() {
  return (
    <div className="flex min-h-dvh flex-col px-5 pt-[calc(env(safe-area-inset-top,0px)+1.25rem)] pb-10 sm:px-8">
      <Link href="/" className="self-start" aria-label="Página inicial">
        <Logo />
      </Link>
      <main className="mx-auto flex max-w-md flex-1 flex-col items-start justify-center py-16">
        <Etiqueta valor={null} tom="rival" tamanho="xl" />
        <h1 className="mt-6 text-4xl font-bold">Essa página saiu do ar</h1>
        <p className="mt-3 text-lg text-muted">O endereço pode ter mudado ou nunca ter existido. Volte pro início e siga de lá.</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <BotaoLink href="/">Ir pro início</BotaoLink>
          <BotaoLink href="/painel" variante="secundario">Abrir o painel</BotaoLink>
        </div>
      </main>
    </div>
  );
}
