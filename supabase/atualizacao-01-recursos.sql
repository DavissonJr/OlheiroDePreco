-- =====================================================================
-- Olheiro de Preço: atualização 01 (planos novos, regras, margem,
-- ajuste automático, compra rápida, estoque, resumo, indicação)
--
-- Rode DEPOIS do schema.sql, no SQL Editor do Supabase. Pode rodar mais de
-- uma vez sem problema. Instalação nova: schema.sql e depois este arquivo.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Perfis: planos, teste grátis, indicação e preferências de e-mail
-- ---------------------------------------------------------------------
alter table public.profiles drop constraint if exists profiles_plano_check;
alter table public.profiles add constraint profiles_plano_check
  check (plano in ('gratis', 'basico', 'pro', 'turbo'));

alter table public.profiles
  add column if not exists assinatura_plano text,                 -- plano da assinatura no Mercado Pago
  add column if not exists assinatura_ciclo text,                 -- mensal | anual
  add column if not exists teste_usado boolean not null default false,
  add column if not exists cortesia_ate timestamptz,              -- fim do teste grátis ou do bônus de indicação
  add column if not exists codigo_indicacao text unique,
  add column if not exists indicado_por uuid references public.profiles on delete set null,
  add column if not exists indicacao_recompensada boolean not null default false,
  add column if not exists indicacoes_ok int not null default 0,
  add column if not exists email_frequencia text not null default 'na_hora',
  add column if not exists resumo_semanal boolean not null default true,
  add column if not exists resumo_enviado_em timestamptz,
  add column if not exists interesse_whatsapp boolean not null default false;

alter table public.profiles drop constraint if exists profiles_email_frequencia_check;
alter table public.profiles add constraint profiles_email_frequencia_check
  check (email_frequencia in ('na_hora', 'diario'));

-- Código de indicação pra quem já tinha conta
update public.profiles
   set codigo_indicacao = substr(md5(random()::text || id::text), 1, 8)
 where codigo_indicacao is null;

grant update (email_frequencia, resumo_semanal, interesse_whatsapp) on public.profiles to authenticated;

-- Cadastro: gera o código de indicação e liga quem indicou (vem em ?ref=)
create or replace function public.criar_perfil()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  quem uuid;
begin
  select id into quem from public.profiles
   where codigo_indicacao = lower(new.raw_user_meta_data->>'ref') and id <> new.id;
  insert into public.profiles (id, nome, email, codigo_indicacao, indicado_por)
  values (
    new.id,
    new.raw_user_meta_data->>'nome',
    new.email,
    substr(md5(random()::text || new.id::text), 1, 8),
    quem
  )
  on conflict (id) do nothing;
  return new;
end $$;

-- ---------------------------------------------------------------------
-- Produtos: custos (sugestão de preço), catálogo e ajuste automático
-- ---------------------------------------------------------------------
alter table public.produtos
  add column if not exists custo numeric(12,2),
  add column if not exists imposto_pct numeric(5,2),
  add column if not exists frete numeric(12,2),
  add column if not exists tarifa_pct numeric(5,2),             -- vazio = estimada pelas vendas
  add column if not exists custo_fixo numeric(12,2),            -- tarifa fixa por venda do ML
  add column if not exists margem_min_pct numeric(5,2),
  add column if not exists catalogo_id text,
  add column if not exists buybox_ganhando boolean,
  add column if not exists buybox_vencedor text,
  add column if not exists buybox_preco numeric(12,2),
  add column if not exists buybox_verificado_em timestamptz,
  add column if not exists repricing_ativo boolean not null default false,
  add column if not exists repricing_piso numeric(12,2),
  add column if not exists repricing_teto numeric(12,2),
  add column if not exists repricing_diferenca numeric(12,2) not null default 0.10,
  add column if not exists repricing_ultimo_em timestamptz;

drop policy if exists "produtos: editar custos e ajuste" on public.produtos;
create policy "produtos: editar custos e ajuste" on public.produtos for update using (auth.uid() = user_id);
revoke update on public.produtos from authenticated;
grant update (custo, imposto_pct, frete, tarifa_pct, custo_fixo, margem_min_pct,
              repricing_ativo, repricing_piso, repricing_teto, repricing_diferenca)
  on public.produtos to authenticated;

-- ---------------------------------------------------------------------
-- Concorrentes: regras de aviso e estoque
-- ---------------------------------------------------------------------
alter table public.concorrentes
  add column if not exists regra_queda_pct numeric(5,2),          -- só avisa se cair pelo menos X%
  add column if not exists regra_abaixo_de numeric(12,2),         -- só avisa se ficar abaixo de R$ X
  add column if not exists regra_so_abaixo_do_meu boolean not null default false,
  add column if not exists estoque int,
  add column if not exists sem_estoque boolean not null default false;

drop policy if exists "concorrentes: editar regras" on public.concorrentes;
create policy "concorrentes: editar regras" on public.concorrentes for update using (auth.uid() = user_id);
revoke update on public.concorrentes from authenticated;
grant update (regra_queda_pct, regra_abaixo_de, regra_so_abaixo_do_meu) on public.concorrentes to authenticated;

-- ---------------------------------------------------------------------
-- Avisos: tipos novos e fila do e-mail diário
-- ---------------------------------------------------------------------
alter table public.alertas drop constraint if exists alertas_tipo_check;
alter table public.alertas add constraint alertas_tipo_check check (tipo in (
  'queda', 'abaixo_do_meu', 'subiu', 'sem_estoque', 'voltou_estoque',
  'buybox_perdida', 'buybox_ganha', 'ajuste_preco'
));
alter table public.alertas add column if not exists email_pendente boolean not null default false;
create index if not exists alertas_email_pendente on public.alertas(user_id) where email_pendente;

-- ---------------------------------------------------------------------
-- Registro dos ajustes automáticos de preço
-- ---------------------------------------------------------------------
create table if not exists public.ajustes_preco (
  id bigserial primary key,
  user_id uuid not null references public.profiles on delete cascade,
  produto_id text not null,
  preco_antigo numeric(12,2) not null,
  preco_novo numeric(12,2) not null,
  motivo text not null,
  created_at timestamptz not null default now()
);
create index if not exists ajustes_user on public.ajustes_preco(user_id, created_at desc);
alter table public.ajustes_preco enable row level security;
drop policy if exists "ajustes: ler os próprios" on public.ajustes_preco;
create policy "ajustes: ler os próprios" on public.ajustes_preco for select using (auth.uid() = user_id);
