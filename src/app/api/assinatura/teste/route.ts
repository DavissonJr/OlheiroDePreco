import { NextResponse } from "next/server";
import { supabaseAdmin, usuarioAtual } from "@/lib/supabase/server";
import { DIAS_TESTE, PLANO_TESTE } from "@/lib/planos";

// Teste grátis: libera o Pro por alguns dias, sem cartão, uma vez por conta.
// A rotina diária do banco volta pro Grátis quando o teste acaba.
export async function POST() {
  const user = await usuarioAtual();
  if (!user) return NextResponse.json({ erro: "Entre na sua conta de novo." }, { status: 401 });
  const sb = supabaseAdmin();
  const ate = new Date(Date.now() + DIAS_TESTE * 86400000).toISOString();

  const { data } = await sb
    .from("profiles")
    .update({ plano: PLANO_TESTE, cortesia_ate: ate, teste_usado: true })
    .eq("id", user.id)
    .eq("plano", "gratis")
    .eq("teste_usado", false)
    .select("id")
    .maybeSingle();
  if (!data) return NextResponse.json({ erro: "O teste grátis já foi usado nesta conta." }, { status: 409 });

  await sb.from("concorrentes").update({ proxima_verificacao: new Date().toISOString() }).eq("user_id", user.id);
  return NextResponse.json({ ok: true, ate });
}
