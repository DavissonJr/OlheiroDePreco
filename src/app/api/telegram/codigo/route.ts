import { NextResponse } from "next/server";
import { supabaseAdmin, usuarioAtual } from "@/lib/supabase/server";

// Gera um código único e devolve o link t.me/SeuBot?start=CODIGO.
// Quando o vendedor aperta "Começar" no Telegram, o bot recebe o código
// e liga o chat à conta dele.
export async function POST() {
  const user = await usuarioAtual();
  if (!user) return NextResponse.json({ erro: "Entre na sua conta de novo." }, { status: 401 });
  const bot = process.env.NEXT_PUBLIC_TELEGRAM_BOT;
  if (!bot) return NextResponse.json({ erro: "O bot do Telegram ainda não foi configurado." }, { status: 500 });

  const codigo = Buffer.from(crypto.getRandomValues(new Uint8Array(12))).toString("hex");
  await supabaseAdmin().from("profiles").update({ telegram_link_code: codigo }).eq("id", user.id);
  return NextResponse.json({ link: `https://t.me/${bot}?start=${codigo}` });
}
