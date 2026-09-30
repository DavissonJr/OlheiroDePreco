import { NextResponse } from "next/server";
import { supabaseAdmin, usuarioAtual } from "@/lib/supabase/server";
import { cancelarAssinaturaMP, criarAssinatura } from "@/lib/mercadopago";

// Cria a assinatura e devolve o link de pagamento do Mercado Pago.
export async function POST() {
  const user = await usuarioAtual();
  if (!user?.email) return NextResponse.json({ erro: "Entre na sua conta de novo." }, { status: 401 });
  try {
    const url = await criarAssinatura(user.id, user.email);
    return NextResponse.json({ url });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ erro: "Não consegui abrir o pagamento agora. Tente de novo em alguns minutos." }, { status: 502 });
  }
}

// Cancela a assinatura. O Pro continua até o fim do período pago.
export async function DELETE() {
  const user = await usuarioAtual();
  if (!user) return NextResponse.json({ erro: "Entre na sua conta de novo." }, { status: 401 });
  const sb = supabaseAdmin();
  const { data: p } = await sb.from("profiles").select("mp_assinatura_id,pro_ate").eq("id", user.id).single();
  if (!p?.mp_assinatura_id) return NextResponse.json({ erro: "Não encontrei uma assinatura ativa." }, { status: 404 });
  try {
    await cancelarAssinaturaMP(p.mp_assinatura_id);
    await sb.from("profiles").update({ assinatura_status: "cancelled" }).eq("id", user.id);
    return NextResponse.json({ ok: true, ate: p.pro_ate });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ erro: "O Mercado Pago não respondeu. Tente de novo ou cancele pelo app do Mercado Pago." }, { status: 502 });
  }
}
