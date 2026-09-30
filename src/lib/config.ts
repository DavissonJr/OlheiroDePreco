// Sem as variáveis do Supabase, o app roda em modo demonstração com dados fictícios.
export const IS_DEMO = !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
export const NOME_APP = "Olheiro de Preço";
export const NOME_CURTO = "Olheiro";

// Quem responde pelo serviço (aparece nos Termos e na Política de Privacidade).
export const RESPONSAVEL = process.env.NEXT_PUBLIC_RESPONSAVEL || "[preencha NEXT_PUBLIC_RESPONSAVEL]";
export const CONTATO_EMAIL = process.env.NEXT_PUBLIC_CONTATO_EMAIL || "[preencha NEXT_PUBLIC_CONTATO_EMAIL]";
