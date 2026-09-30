import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { enviarTelegram } from "@/lib/notificar";

interface Update {
  message?: { chat: { id: number }; text?: string; from?: { first_name?: string } };
}

export async function POST(req: Request) {
  if (req.headers.get("x-telegram-bot-api-secret-token") !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const u = (await req.json()) as Update;
  const msg = u.message;
  if (!msg?.text) return NextResponse.json({ ok: true });

  const chatId = String(msg.chat.id);
  const [comando, codigo] = msg.text.trim().split(/\s+/);

  if (comando === "/start" && codigo) {
    const sb = supabaseAdmin();
    const { data } = await sb
      .from("profiles")
      .update({ telegram_chat_id: chatId, telegram_link_code: null })
      .eq("telegram_link_code", codigo)
      .select("id")
      .maybeSingle();
    await enviarTelegram(
      chatId,
      data
        ? "Pronto! Você vai receber aqui um aviso sempre que um concorrente baixar o preço."
        : "Esse link expirou. Abra o Radar e toque em “Conectar Telegram” de novo.",
    );
  } else if (comando === "/parar") {
    await supabaseAdmin().from("profiles").update({ telegram_chat_id: null }).eq("telegram_chat_id", chatId);
    await enviarTelegram(chatId, "Avisos desligados. Pra religar, conecte de novo pelo Radar.");
  }

  return NextResponse.json({ ok: true });
}
