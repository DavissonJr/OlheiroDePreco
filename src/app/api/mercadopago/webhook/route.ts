import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { consultarAssinatura } from "@/lib/mercadopago";

// O Mercado Pago avisa aqui quando uma assinatura muda de status.
// Nunca confiamos no corpo da notificação: consultamos a assinatura na API.
export async function POST(req: Request) {
  const url = new URL(req.url);
  const corpo = await req.json().catch(() => ({}));
  const tipo = corpo.type ?? url.searchParams.get("type") ?? url.searchParams.get("topic");
  const id = corpo.data?.id ?? url.searchParams.get("data.id") ?? url.searchParams.get("id");

  if (!id || !String(tipo).includes("preapproval")) return NextResponse.json({ ok: true });

  try {
    const a = await consultarAssinatura(String(id));
    const sb = supabaseAdmin();
    if (a.status === "authorized") {
      await sb.from("profiles").update({
        plano: "pro",
        assinatura_status: a.status,
        mp_assinatura_id: a.id,
        pro_ate: a.next_payment_date ?? null,
      }).eq("id", a.external_reference);
      // Virou Pro: antecipa a próxima conferência pra já entrar no ritmo de 1 hora.
      await sb.from("concorrentes").update({ proxima_verificacao: new Date().toISOString() }).eq("user_id", a.external_reference);
    } else {
      // Cancelada ou pausada: o Pro continua até o fim do período já pago.
      // A rotina diária do banco rebaixa pro Grátis quando pro_ate passar.
      await sb.from("profiles").update({ assinatura_status: a.status, mp_assinatura_id: a.id }).eq("id", a.external_reference);
    }
  } catch (e) {
    console.error(e);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
