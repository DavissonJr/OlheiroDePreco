"use client";

import { useEffect } from "react";
import { RotateCcw } from "lucide-react";
import { Botao, BotaoLink } from "@/components/ui/botao";
import { MarcaOlheiro } from "@/components/ui/logo";

export default function Erro({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-start justify-center px-5 py-16">
      <MarcaOlheiro className="size-12" />
      <h1 className="mt-6 text-4xl font-bold">Algo travou por aqui</h1>
      <p className="mt-3 text-lg text-muted">
        Não foi nada que você fez. Tente de novo; se continuar, escreva pra gente contando o que estava fazendo.
      </p>
      {error.digest && <p className="mt-2 text-sm text-muted">Código do erro: {error.digest}</p>}
      <div className="mt-8 flex flex-wrap gap-3">
        <Botao onClick={reset} icone={<RotateCcw className="size-4" aria-hidden />}>Tentar de novo</Botao>
        <BotaoLink href="/" variante="secundario">Ir pro início</BotaoLink>
      </div>
    </main>
  );
}
