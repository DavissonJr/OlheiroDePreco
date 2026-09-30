import { NextResponse } from "next/server";
import { IS_DEMO } from "@/lib/config";

// Checagem rápida depois de publicar: abra /api/saude e veja o que falta configurar.
// Mostra só "configurado" ou "falta", nunca os valores.
export const dynamic = "force-dynamic";

const tem = (...nomes: string[]) => nomes.every((n) => !!process.env[n]);

export async function GET() {
  const servicos = {
    supabase: tem("NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY"),
    endereco_do_site: tem("NEXT_PUBLIC_SITE_URL") && !process.env.NEXT_PUBLIC_SITE_URL!.includes("localhost"),
    mercado_livre: tem("ML_APP_ID", "ML_APP_SECRET", "ML_REDIRECT_URI"),
    agendador: tem("CRON_SECRET"),
    telegram: tem("TELEGRAM_BOT_TOKEN", "NEXT_PUBLIC_TELEGRAM_BOT", "TELEGRAM_WEBHOOK_SECRET"),
    email: tem("RESEND_API_KEY", "EMAIL_REMETENTE"),
    mercado_pago: tem("MP_ACCESS_TOKEN"),
    termos_e_privacidade: tem("NEXT_PUBLIC_RESPONSAVEL", "NEXT_PUBLIC_CONTATO_EMAIL"),
  };
  const faltando = Object.entries(servicos).filter(([, ok]) => !ok).map(([n]) => n);
  return NextResponse.json({
    modo: IS_DEMO ? "demonstração (Supabase não configurado)" : "produção",
    tudo_pronto: faltando.length === 0,
    faltando,
    servicos: Object.fromEntries(Object.entries(servicos).map(([n, ok]) => [n, ok ? "configurado" : "falta"])),
  });
}
