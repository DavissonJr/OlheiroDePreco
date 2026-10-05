import { NextResponse } from "next/server";
import { supabaseAdmin, usuarioAtual } from "@/lib/supabase/server";
import { cancelarAssinaturaMP, criarAssinatura, trocarPlanoMP } from "@/lib/mercadopago";
import { PLANOS, PLANOS_PAGOS, type Ciclo, type PlanoPago } from "@/lib/planos";

// Cria a assinatura e devolve o link de pagamento do Mercado Pago.
// Com uma assinatura ativa no mesmo ciclo, só troca o plano (muda o valor das próximas cobranças).
export async function POST(req: Request) {
  const user = await usuarioAtual();
  if (!user?.email) return NextResponse.json({ erro: "Entre na sua conta de novo." }, { status: 401 });

  const corpo = (await req.json().catch(() => ({}))) as { plano?: string; ciclo?: string };
  const plano = (PLANOS_PAGOS as string[]).includes(corpo.plano ?? "") ? (corpo.plano as PlanoPago) : "pro";
  const ciclo: Ciclo = corpo.ciclo === "anual" ? "anual" : "mensal";

  const sb = supabaseAdmin();
  const { data: p } = await sb
    .from("profiles")
    .select("mp_assinatura_id,assinatura_status,assinatura_ciclo,plano")
    .eq("id", user.id)
    .single();

  try {
    if (p?.mp_assinatura_id && p.assinatura_status === "authorized") {
      if ((p.assinatura_ciclo ?? "mensal") !== ciclo) {
        return NextResponse.json(
          { erro: "Pra trocar entre mensal e anual, cancele a assinatura atual e assine de novo quando o período pago acabar." },
          { status: 409 },
        );
      }
      if (p.plano === plano) return NextResponse.json({ ok: true, trocado: true });
      await trocarPlanoMP(p.mp_assinatura_id, plano, ciclo);
      await sb.from("profiles").update({ plano, assinatura_plano: plano }).eq("id", user.id);
      // Plano com conferência mais frequente: antecipa a próxima.
      await sb.from("concorrentes").update({ proxima_verificacao: new Date().toISOString() }).eq("user_id", user.id);
      return NextResponse.json({ ok: true, trocado: true, nome: PLANOS[plano].nome });
    }

    const url = await criarAssinatura(user.id, user.email, plano, ciclo);
    await sb.from("profiles").update({ assinatura_plano: plano, assinatura_ciclo: ciclo }).eq("id", user.id);
    return NextResponse.json({ url });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ erro: "Não consegui abrir o pagamento agora. Tente de novo em alguns minutos." }, { status: 502 });
  }
}

// Cancela a assinatura. O plano continua até o fim do período pago.
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
