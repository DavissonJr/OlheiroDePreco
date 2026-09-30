-- =====================================================================
-- Olheiro de Preço: estrutura do banco (Supabase / Postgres)
-- Cole tudo no SQL Editor do Supabase e rode uma vez.
-- =====================================================================

-- Perfil de cada vendedor (criado automaticamente no cadastro)
create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  nome text,
  email text,
  marketplaces text[] not null default '{mercadolivre}',
  plano text not null default 'gratis' check (plano in ('gratis', 'pro')),
  mp_assinatura_id text,
  assinatura_status text,             -- pending | authorized | paused | cancelled
  pro_ate timestamptz,                -- fim do período pago do Pro
  ml_nickname text,
  telegram_chat_id text,
  telegram_link_code text unique,
  alerta_email boolean not null default true,
  alerta_telegram boolean not null default true,
  onboarding_ok boolean not null default false,
  created_at timestamptz not null default now()
);

-- Tokens do Mercado Livre: só o servidor lê (nenhuma política pra usuários)
create table if not exists public.ml_contas (
  user_id uuid primary key references public.profiles on delete cascade,
  ml_user_id bigint unique not null,
  nickname text,
  access_token text not null,
  refresh_token text not null,
  expira_em timestamptz not null,
  created_at timestamptz not null default now()
);

-- Anúncios do próprio vendedor
create table if not exists public.produtos (
  id text primary key,                -- ex.: MLB3810294417
  user_id uuid not null references public.profiles on delete cascade,
  titulo text not null,
  preco numeric(12,2) not null,
  thumbnail text,
  permalink text,
  estoque int,
  atualizado_em timestamptz not null default now()
);
create index if not exists produtos_user on public.produtos(user_id);

-- Pedidos (vendas)
create table if not exists public.vendas (
  id text primary key,                -- id do pedido no ML
  user_id uuid not null references public.profiles on delete cascade,
  data timestamptz not null,
  total numeric(12,2) not null,
  taxa numeric(12,2) not null default 0,
  status text not null,
  itens jsonb not null default '[]'
);
create index if not exists vendas_user_data on public.vendas(user_id, data desc);

-- Anúncios de concorrentes monitorados
create table if not exists public.concorrentes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles on delete cascade,
  meu_item_id text references public.produtos on delete set null,
  item_id text not null,
  titulo text not null,
  vendedor text,
  thumbnail text,
  permalink text,
  preco_atual numeric(12,2),
  preco_anterior numeric(12,2),
  ultima_verificacao timestamptz,
  proxima_verificacao timestamptz not null default now(),
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  unique (user_id, item_id)
);
create index if not exists concorrentes_fila on public.concorrentes(ativo, proxima_verificacao);

-- Histórico de preços de cada concorrente
create table if not exists public.historico_precos (
  id bigserial primary key,
  concorrente_id uuid not null references public.concorrentes on delete cascade,
  preco numeric(12,2) not null,
  registrado_em timestamptz not null default now()
);
create index if not exists historico_conc on public.historico_precos(concorrente_id, registrado_em);

-- Avisos gerados
create table if not exists public.alertas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles on delete cascade,
  concorrente_id uuid references public.concorrentes on delete set null,
  tipo text not null check (tipo in ('queda', 'abaixo_do_meu', 'subiu')),
  mensagem text not null,
  preco_antigo numeric(12,2),
  preco_novo numeric(12,2),
  lido boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists alertas_user on public.alertas(user_id, created_at desc);

-- ---------------------------------------------------------------------
-- Cria o perfil automaticamente quando alguém se cadastra
-- ---------------------------------------------------------------------
create or replace function public.criar_perfil()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, nome, email)
  values (new.id, new.raw_user_meta_data->>'nome', new.email)
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists ao_criar_usuario on auth.users;
create trigger ao_criar_usuario after insert on auth.users
  for each row execute function public.criar_perfil();

-- ---------------------------------------------------------------------
-- Segurança (RLS): cada vendedor só enxerga os próprios dados
-- ---------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.ml_contas enable row level security;
alter table public.produtos enable row level security;
alter table public.vendas enable row level security;
alter table public.concorrentes enable row level security;
alter table public.historico_precos enable row level security;
alter table public.alertas enable row level security;

create policy "perfil: ler o próprio" on public.profiles for select using (auth.uid() = id);
create policy "perfil: editar o próprio" on public.profiles for update using (auth.uid() = id);
-- O usuário só pode editar estas colunas (plano e Telegram ficam com o servidor):
revoke update on public.profiles from authenticated;
grant update (nome, marketplaces, alerta_email, alerta_telegram, onboarding_ok) on public.profiles to authenticated;

create policy "produtos: ler os próprios" on public.produtos for select using (auth.uid() = user_id);
create policy "vendas: ler as próprias" on public.vendas for select using (auth.uid() = user_id);

create policy "concorrentes: ler os próprios" on public.concorrentes for select using (auth.uid() = user_id);
create policy "concorrentes: apagar os próprios" on public.concorrentes for delete using (auth.uid() = user_id);
-- Inserção de concorrente passa pela API (/api/concorrentes), que confere o limite do plano.

create policy "historico: ler dos próprios concorrentes" on public.historico_precos for select
  using (exists (select 1 from public.concorrentes c where c.id = concorrente_id and c.user_id = auth.uid()));

create policy "alertas: ler os próprios" on public.alertas for select using (auth.uid() = user_id);
create policy "alertas: marcar como lido" on public.alertas for update using (auth.uid() = user_id);
revoke update on public.alertas from authenticated;
grant update (lido) on public.alertas to authenticated;

-- O agendador (conferência de preços e limpezas) fica em supabase/agendador.sql.
-- Rode aquele arquivo DEPOIS de publicar o site.
