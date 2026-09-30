"use client";

import Link from "next/link";
import { useState } from "react";
import { Check, Lock, Mail, Send } from "lucide-react";
import { useDados } from "./dados";
import { useAviso } from "@/components/ui/aviso";
import { Botao } from "@/components/ui/botao";
import { Chave } from "@/components/ui/chave";

export function CanaisAviso() {
  const avisar = useAviso();
  const { perfil, atualizarPerfil, conectarTelegram } = useDados();
  const [ligando, setLigando] = useState(false);
  if (!perfil) return null;
  const pro = perfil.plano === "pro";

  async function ligar() {
    setLigando(true);
    const r = await conectarTelegram();
    setLigando(false);
    if (!r.ok) return avisar(r.erro, "erro");
    if (r.link) window.open(r.link, "_blank", "noopener");
    else avisar("Telegram conectado. Os próximos avisos chegam lá.");
  }

  return (
    <div className="divide-y divide-line rounded-[22px] bg-surface ring-1 ring-line">
      <div className="p-5">
        <div className="flex items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#2aabee] text-white">
            <Send className="size-5" aria-hidden />
          </span>
          <div className="flex-1">
            <p className="font-semibold">Telegram</p>
            <p className="text-sm text-muted">
              {!pro ? "Disponível no plano Pro" : perfil.telegram_conectado ? "Conectado" : "Não conectado"}
            </p>
          </div>
          {pro && perfil.telegram_conectado && (
            <Chave rotulo="Avisos no Telegram" ligada={perfil.alerta_telegram} aoMudar={(v) => atualizarPerfil({ alerta_telegram: v })} />
          )}
        </div>
        {!pro ? (
          <Link href="/painel/planos" className="mt-4 flex items-center gap-2 text-sm font-semibold text-cobalt hover:underline">
            <Lock className="size-4" aria-hidden /> Liberar com o Pro
          </Link>
        ) : !perfil.telegram_conectado ? (
          <Botao variante="secundario" tamanho="sm" className="mt-4 w-full" carregando={ligando} onClick={ligar}>
            Conectar Telegram
          </Botao>
        ) : (
          <p className="mt-3 flex items-center gap-1.5 text-sm text-up">
            <Check className="size-4" aria-hidden /> Quedas de preço chegam na hora
          </p>
        )}
      </div>
      <div className="flex items-center gap-3 p-5">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-cobalt-soft text-cobalt">
          <Mail className="size-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold">E-mail</p>
          <p className="truncate text-sm text-muted">{perfil.email}</p>
        </div>
        <Chave rotulo="Avisos por e-mail" ligada={perfil.alerta_email} aoMudar={(v) => atualizarPerfil({ alerta_email: v })} />
      </div>
    </div>
  );
}
