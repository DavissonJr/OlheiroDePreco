import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { IS_DEMO } from "@/lib/config";
import { usuarioAtual } from "@/lib/supabase/server";
import { ML_AUTH_URL, ML_REDIRECT_URI } from "@/lib/ml";

function base64url(bytes: Uint8Array) {
  return Buffer.from(bytes).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// Manda o vendedor para a tela de autorização do Mercado Livre (OAuth com PKCE).
export async function GET(req: Request) {
  if (IS_DEMO) return NextResponse.redirect(new URL("/onboarding?ml=demo", req.url));
  const user = await usuarioAtual();
  if (!user) return NextResponse.redirect(new URL("/entrar", req.url));

  const state = base64url(crypto.getRandomValues(new Uint8Array(16)));
  const verifier = base64url(crypto.getRandomValues(new Uint8Array(32)));
  const challenge = base64url(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier))));

  const loja = await cookies();
  const opcoes = { httpOnly: true, secure: true, sameSite: "lax" as const, maxAge: 600, path: "/" };
  loja.set("ml_state", state, opcoes);
  loja.set("ml_verifier", verifier, opcoes);

  const url = new URL(ML_AUTH_URL);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", process.env.ML_APP_ID!);
  url.searchParams.set("redirect_uri", ML_REDIRECT_URI);
  url.searchParams.set("state", state);
  url.searchParams.set("code_challenge", challenge);
  url.searchParams.set("code_challenge_method", "S256");
  return NextResponse.redirect(url);
}
