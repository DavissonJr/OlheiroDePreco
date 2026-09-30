import { NextResponse } from "next/server";
import { usuarioAtual } from "@/lib/supabase/server";
import { sincronizarConta } from "@/lib/ml";

export async function POST() {
  const user = await usuarioAtual();
  if (!user) return NextResponse.json({ erro: "Entre na sua conta de novo." }, { status: 401 });
  try {
    const r = await sincronizarConta(user.id);
    return NextResponse.json(r);
  } catch (e) {
    return NextResponse.json({ erro: (e as Error).message }, { status: 400 });
  }
}
