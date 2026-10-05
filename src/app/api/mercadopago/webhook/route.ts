import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabase/server";
import { consultarAssinatura } from "@/lib/mercadopago";
import { DIAS_BONUS_INDICACAO, planoPorCobranca, type PlanoId } from "@/lib/planos";
import { enviarEmail, moldeEmail } from "@/lib/notificar";

// O Mercado Pago avisa aqui quando uma assinatura muda de status.
// Nunca confiamos no corpo da notificação: consultamos a assinatura na API,
// e o plano sai do valor cobrado, não do que o navegador mandou.
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
      const r = a.auto_recurring;
      const meses = r ? (r.frequency_type === "months" ? r.frequency : 0) : 1;
      // Assinaturas antigas (antes dos planos novos) eram do Pro mensal.
      const cobranca = r ? planoPorCobranca(r.transaction_amount, meses) : null;
      const plano = cobranca?.plano ?? "pro";
      await sb.from("profiles").update({
        plano,
        assinatura_plano: plano,
        assinatura_ciclo: cobranca?.ciclo ?? "mensal",
        assinatura_status: a.status,
        mp_assinatura_id: a.id,
        pro_ate: a.next_payment_date ?? null,
      }).eq("id", a.external_reference);
      // Virou pago: antecipa a próxima conferência pra já entrar no ritmo do plano.
      await sb.from("concorrentes").update({ proxima_verificacao: new Date().toISOString() }).eq("user_id", a.external_reference);
      await recompensarIndicacao(sb, a.external_reference);
    } else {
      // Cancelada ou pausada: o plano continua até o fim do período já pago.
      // A rotina diária do banco rebaixa pro Grátis quando pro_ate passar.
      await sb.from("profiles").update({ assinatura_status: a.status, mp_assinatura_id: a.id }).eq("id", a.external_reference);
    }
  } catch (e) {
    console.error(e);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

// Primeira assinatura de quem veio por indicação: quem indicou ganha um mês de Pro.
async function recompensarIndicacao(sb: SupabaseClient, userId: string) {
  // A troca do "recompensada" é condicional, então duas notificações seguidas não dão bônus em dobro.
  const { data: indicado } = await sb
    .from("profiles")
    .update({ indicacao_recompensada: true })
    .eq("id", userId)
    .eq("indicacao_recompensada", false)
    .not("indicado_por", "is", null)
    .select("indicado_por")
    .maybeSingle();
  if (!indicado?.indicado_por) return;

  const { data: quem } = await sb
    .from("profiles")
    .select("id,email,plano,cortesia_ate,indicacoes_ok")
    .eq("id", indicado.indicado_por)
    .maybeSingle();
  if (!quem) return;

  const base = Math.max(Date.now(), quem.cortesia_ate ? new Date(quem.cortesia_ate).getTime() : 0);
  const ate = new Date(base + DIAS_BONUS_INDICACAO * 86400000).toISOString();
  await sb.from("profiles").update({
    cortesia_ate: ate,
    indicacoes_ok: (quem.indicacoes_ok ?? 0) + 1,
    // Quem está no Grátis sobe pro Pro durante o bônus; quem já paga mantém o plano.
    ...((quem.plano as PlanoId) === "gratis" ? { plano: "pro" } : {}),
  }).eq("id", quem.id);

  if (quem.email) {
    await enviarEmail(
      quem.email,
      "Sua indicação deu certo",
      moldeEmail(
        "Você ganhou um bônus",
        `<p style="margin:0">Uma pessoa que você indicou assinou o Olheiro de Preço. Como agradecimento, ${
          (quem.plano as PlanoId) === "gratis"
            ? `você ganhou ${DIAS_BONUS_INDICACAO} dias de Pro grátis.`
            : `somamos ${DIAS_BONUS_INDICACAO} dias ao seu plano, que valem depois do período pago.`
        }</p>`,
      ),
    );
  }
}
