import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

// Renova a sessão do Supabase a cada navegação (padrão recomendado pelo Supabase).
export async function proxy(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const chave = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !chave) return NextResponse.next();

  let resposta = NextResponse.next({ request });
  const sb = createServerClient(url, chave, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (lista) => {
        lista.forEach(({ name, value }) => request.cookies.set(name, value));
        resposta = NextResponse.next({ request });
        lista.forEach(({ name, value, options }) => resposta.cookies.set(name, value, options));
      },
    },
  });
  await sb.auth.getUser();
  return resposta;
}

export const config = {
  matcher: ["/painel/:path*", "/onboarding", "/api/ml/:path*", "/api/concorrentes", "/api/assinatura", "/api/telegram/codigo"],
};
