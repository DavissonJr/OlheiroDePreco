import { NextResponse } from "next/server";
import { supabaseAdmin, usuarioAtual } from "@/lib/supabase/server";
import { cancelarAssinaturaMP } from "@/lib/mercadopago";

// Exclusão de conta (LGPD e exigência da Play Store).
// Cancela a assinatura e apaga o usuário; o banco apaga o resto em cascata.
export async function POST() {
  const user = await usuarioAtual();
  if (!user) return NextResponse.json({ erro: "Entre na sua conta de novo." }, { status: 401 });
  const sb = supabaseAdmin();

  const { data: p } = await sb.from("profiles").select("mp_assinatura_id,assinatura_status").eq("id", user.id).single();
  if (p?.mp_assinatura_id && p.assinatura_status === "authorized") {
    try {
      await cancelarAssinaturaMP(p.mp_assinatura_id);
    } catch (e) {
      console.error(e);
      return NextResponse.json(
        { erro: "Não consegui cancelar sua assinatura no Mercado Pago. Cancele por lá e tente excluir de novo." },
        { status: 502 },
      );
    }
  }

  const { error } = await sb.auth.admin.deleteUser(user.id);
  if (error) {
    console.error(error);
    return NextResponse.json({ erro: "Não consegui excluir a conta agora. Tente de novo em alguns minutos." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
