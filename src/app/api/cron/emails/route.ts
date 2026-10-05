import { NextResponse } from "next/server";
import { enviarAvisosDiarios, enviarResumosSemanais } from "@/lib/resumo";
import { cronAutorizado } from "@/lib/cron";

export const maxDuration = 60;

// Uma vez por dia: avisos agrupados do dia e resumos semanais.
async function executar(req: Request) {
  if (!cronAutorizado(req)) return NextResponse.json({ erro: "não autorizado" }, { status: 401 });
  const avisos = await enviarAvisosDiarios();
  const resumos = await enviarResumosSemanais();
  return NextResponse.json({ avisos, resumos });
}

export const GET = executar;
export const POST = executar;
