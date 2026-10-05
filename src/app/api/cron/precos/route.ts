import { NextResponse } from "next/server";
import { verificarPrecos } from "@/lib/verificador";
import { cronAutorizado } from "@/lib/cron";

export const maxDuration = 60;

// Protegido por um segredo: só o agendador do Supabase consegue chamar.
async function executar(req: Request) {
  if (!cronAutorizado(req)) return NextResponse.json({ erro: "não autorizado" }, { status: 401 });
  const r = await verificarPrecos();
  return NextResponse.json(r);
}

export const GET = executar;
export const POST = executar;
