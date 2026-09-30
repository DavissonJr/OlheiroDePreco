import { NextResponse } from "next/server";
import { usuarioAtual } from "@/lib/supabase/server";
import { criarAssinatura } from "@/lib/mercadopago";

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
