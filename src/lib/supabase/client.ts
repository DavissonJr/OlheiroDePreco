import { createBrowserClient } from "@supabase/ssr";

let cliente: ReturnType<typeof createBrowserClient> | null = null;

export function supabaseNavegador() {
  if (!cliente) {
    cliente = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    );
  }
  return cliente;
}
