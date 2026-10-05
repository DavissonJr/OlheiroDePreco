-- =====================================================================
-- Olheiro de Preço: atualização 02 (concorrentes pelo catálogo)
--
-- O Mercado Livre não deixa aplicativos lerem anúncios de outros vendedores.
-- O preço do concorrente passa a vir da lista de vendedores do produto de
-- catálogo, então cada concorrente guarda o catálogo dele.
-- Rode no SQL Editor do Supabase depois da atualização 01. Pode rodar de novo.
-- =====================================================================

alter table public.concorrentes add column if not exists catalogo_id text;
