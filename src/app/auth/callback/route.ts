import { NextResponse } from "next/server";
import { supabaseServidor } from "@/lib/supabase/server";

// Links de e-mail do Supabase (confirmação de cadastro e troca de senha) caem aqui.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const proximo = url.searchParams.get("proximo");
  // Só aceita caminhos internos, pra ninguém usar o link pra redirecionar pra fora.
  const destino = proximo && proximo.startsWith("/") && !proximo.startsWith("//") ? proximo : "/onboarding";

  if (code) {
    const sb = await supabaseServidor();
    const { error } = await sb.auth.exchangeCodeForSession(code);
    if (error) return NextResponse.redirect(new URL("/entrar?link=expirado", req.url));
  }
  return NextResponse.redirect(new URL(destino, req.url));
}
