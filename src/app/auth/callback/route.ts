import { NextResponse } from "next/server";
import { supabaseServidor } from "@/lib/supabase/server";

// Link de confirmação de e-mail do Supabase cai aqui.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  if (code) {
    const sb = await supabaseServidor();
    await sb.auth.exchangeCodeForSession(code);
  }
  return NextResponse.redirect(new URL("/onboarding", req.url));
}
