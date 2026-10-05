// Sem as variáveis do Supabase, o app roda em modo demonstração com dados fictícios.
export const IS_DEMO = !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

// Gravado no build (o Next substitui as NEXT_PUBLIC_ no código). Serve pra metadados, robots e sitemap.
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

// Endereço do site lido na hora, pra links que saem do app (e-mails, Mercado Pago, indicação).
// No navegador é o endereço da própria página; no servidor, a variável SITE_URL da hospedagem.
// Assim um NEXT_PUBLIC_SITE_URL errado no build não quebra pagamento nem links.
export function urlDoSite() {
  if (typeof window !== "undefined") return window.location.origin;
  return (process.env.SITE_URL || SITE_URL).replace(/\/+$/, "");
}
export const NOME_APP = "Olheiro de Preço";
export const NOME_CURTO = "Olheiro";

// Quem responde pelo serviço (aparece nos Termos e na Política de Privacidade).
export const RESPONSAVEL = process.env.NEXT_PUBLIC_RESPONSAVEL || "[preencha NEXT_PUBLIC_RESPONSAVEL]";
export const CONTATO_EMAIL = process.env.NEXT_PUBLIC_CONTATO_EMAIL || "[preencha NEXT_PUBLIC_CONTATO_EMAIL]";
