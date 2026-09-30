import { NextResponse } from "next/server";
import { verificarPrecos } from "@/lib/verificador";

export const maxDuration = 300;

// Protegido por um segredo: só o agendador do Supabase consegue chamar.
async function executar(req: Request) {
  const segredo = process.env.CRON_SECRET;
  if (!segredo || req.headers.get("authorization") !== `Bearer ${segredo}`) {
    return NextResponse.json({ erro: "não autorizado" }, { status: 401 });
  }
  const r = await verificarPrecos();
  return NextResponse.json(r);
}

export const GET = executar;
export const POST = executar;
