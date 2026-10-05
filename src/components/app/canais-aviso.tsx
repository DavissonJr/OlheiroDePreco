"use client";

import Link from "next/link";
import { useState } from "react";
import clsx from "clsx";
import { CalendarDays, Check, Lock, Mail, MessageCircle, Send } from "lucide-react";
import { useDados } from "./dados";
import { useAviso } from "@/components/ui/aviso";
import { Botao } from "@/components/ui/botao";
import { Chave } from "@/components/ui/chave";
import { PLANOS, planoMinimo, temRecurso } from "@/lib/planos";

export function CanaisAviso() {
  const avisar = useAviso();
  const { perfil, atualizarPerfil, conectarTelegram } = useDados();
  const [ligando, setLigando] = useState(false);
  if (!perfil) return null;
  const temTelegram = temRecurso(perfil.plano, "telegram");

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
              {!temTelegram
                ? `Disponível a partir do plano ${PLANOS[planoMinimo("telegram")].nome}`
                : perfil.telegram_conectado ? "Conectado" : "Não conectado"}
            </p>
          </div>
          {temTelegram && perfil.telegram_conectado && (
            <Chave rotulo="Avisos no Telegram" ligada={perfil.alerta_telegram} aoMudar={(v) => atualizarPerfil({ alerta_telegram: v })} />
          )}
        </div>
        {!temTelegram ? (
          <Link href="/painel/planos" className="mt-4 flex items-center gap-2 text-sm font-semibold text-cobalt hover:underline">
            <Lock className="size-4" aria-hidden /> Ver planos
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

      <div className="p-5">
        <div className="flex items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-cobalt-soft text-cobalt">
            <Mail className="size-5" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold">E-mail</p>
            <p className="truncate text-sm text-muted">{perfil.email}</p>
          </div>
          <Chave rotulo="Avisos por e-mail" ligada={perfil.alerta_email} aoMudar={(v) => atualizarPerfil({ alerta_email: v })} />
        </div>
        {perfil.alerta_email && (
          <div className="mt-4 grid grid-cols-2 gap-1 rounded-xl bg-surface-2 p-1" role="radiogroup" aria-label="Quando mandar os avisos por e-mail">
            {([
              ["na_hora", "Na hora"],
              ["diario", "1 vez por dia"],
            ] as const).map(([valor, rotulo]) => {
              const ativo = perfil.email_frequencia === valor;
              return (
                <button
                  key={valor}
                  role="radio"
                  aria-checked={ativo}
                  onClick={() => atualizarPerfil({ email_frequencia: valor })}
                  className={clsx("h-9 rounded-lg text-sm font-semibold transition-colors", ativo ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink")}
                >
                  {rotulo}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex items-center gap-3 p-5">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-surface-2 text-muted">
          <CalendarDays className="size-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold">Resumo semanal</p>
          <p className="text-sm text-muted">Vendas, mudanças dos concorrentes e o que vale olhar</p>
        </div>
        <Chave rotulo="Resumo semanal por e-mail" ligada={perfil.resumo_semanal} aoMudar={(v) => atualizarPerfil({ resumo_semanal: v })} />
      </div>

      {/* Ainda não tem WhatsApp: a marcação serve pra medir quantos querem. */}
      <div className="flex items-center gap-3 p-5">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#25d366]/15 text-[#128c4b] dark:text-[#25d366]">
          <MessageCircle className="size-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold">WhatsApp <span className="font-normal text-muted">em breve</span></p>
          <p className="text-sm text-muted">Quer receber por lá? Marque e a gente te avisa quando chegar.</p>
        </div>
        <Chave rotulo="Quero avisos no WhatsApp" ligada={perfil.interesse_whatsapp} aoMudar={(v) => atualizarPerfil({ interesse_whatsapp: v })} />
      </div>
    </div>
  );
}
