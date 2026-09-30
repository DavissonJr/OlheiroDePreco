// Sem as variáveis do Supabase, o app roda em modo demonstração com dados fictícios.
export const IS_DEMO = !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
export const NOME_APP = "Radar";
