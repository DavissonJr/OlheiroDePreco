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
    const plano = a.status === "authorized" ? "pro" : "gratis";
    await supabaseAdmin()
      .from("profiles")
      .update({ plano, mp_assinatura_id: a.id })
      .eq("id", a.external_reference);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
