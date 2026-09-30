import { NextResponse, after } from "next/server";
import { cookies } from "next/headers";
import { usuarioAtual } from "@/lib/supabase/server";
import { salvarConta, sincronizarConta, trocarCodigo } from "@/lib/ml";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const loja = await cookies();
  const esperado = loja.get("ml_state")?.value;
  const verifier = loja.get("ml_verifier")?.value;
  loja.delete("ml_state");
  loja.delete("ml_verifier");

  const user = await usuarioAtual();
  if (!user) return NextResponse.redirect(new URL("/entrar", req.url));
  if (!code || !state || state !== esperado) {
    return NextResponse.redirect(new URL("/onboarding?ml=erro", req.url));
  }

  try {
    const tokens = await trocarCodigo(code, verifier);
    await salvarConta(user.id, tokens);
  } catch (e) {
    console.error("Falha ao conectar o Mercado Livre", e);
    return NextResponse.redirect(new URL("/onboarding?ml=erro", req.url));
  }

  // A sincronização pode levar alguns segundos; roda depois de responder.
  after(() => sincronizarConta(user.id).catch((e) => console.error("Sincronização inicial falhou", e)));
  return NextResponse.redirect(new URL("/onboarding?ml=ok", req.url));
}
