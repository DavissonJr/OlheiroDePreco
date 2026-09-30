import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

// Cliente com a sessão do usuário logado (respeita as regras de RLS).
export async function supabaseServidor() {
  const loja = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => loja.getAll(),
        setAll: (lista) => {
          try {
            lista.forEach(({ name, value, options }) => loja.set(name, value, options));
          } catch {
            // Chamado de um Server Component: o proxy cuida de renovar a sessão.
          }
        },
      },
    },
  );
}

// Cliente administrativo: ignora RLS. Use só no servidor (webhooks, cron, tokens).
export function supabaseAdmin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function usuarioAtual() {
  const sb = await supabaseServidor();
  const { data } = await sb.auth.getUser();
  return data.user;
}
