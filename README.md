# Radar

Painel de vendas do Mercado Livre + aviso quando um concorrente baixa o preço.
Next.js 16, Supabase, Tailwind 4 e Framer Motion.

## 1. Ver funcionando agora (modo demonstração)

```bash
npm install
npm run dev
```

Abra http://localhost:3000. Sem nenhuma variável configurada, o app roda com
dados de exemplo: dá pra navegar em tudo, adicionar concorrentes (qualquer link
com `MLB` funciona), assinar o Pro de mentira e testar os limites do plano.

Pra testar no celular na mesma rede Wi‑Fi: `npm run dev -- -H 0.0.0.0` e abra
`http://IP-DO-SEU-PC:3000` no navegador do celular.

## 2. Estrutura

```
src/
  app/
    page.tsx                  site de apresentação
    entrar/                   login e cadastro
    (app)/onboarding/         configuração inicial em 3 etapas
    (app)/painel/             visão geral, concorrentes, avisos, plano, conta
    api/ml/                   conexão com o Mercado Livre, sincronização e webhook
    api/concorrentes/         adicionar concorrente (confere o limite do plano)
    api/cron/precos/          conferência de preços (chamada pelo agendador)
    api/telegram/             código de conexão e webhook do bot
    api/assinatura/           cria a assinatura no Mercado Pago
    api/mercadopago/webhook/  recebe mudanças de status da assinatura
  components/                 interface (ui/, app/, charts/, landing/)
  lib/
    ml.ts                     cliente da API do Mercado Livre
    verificador.ts            lógica de conferir preços e disparar avisos
    demo-data.ts              dados do modo demonstração
    planos.ts                 limites e preços dos planos (mude aqui)
supabase/schema.sql           tabelas, segurança (RLS) e agendador
scripts/testar-ml.mjs         teste da API de preços do Mercado Livre
```

## 3. Colocar pra funcionar de verdade

Copie `.env.example` para `.env.local` e vá preenchendo conforme os passos.

### 3.1 Supabase (banco, login e agendador)

1. Crie um projeto em https://supabase.com (plano gratuito).
2. Em **SQL Editor**, cole e rode `supabase/schema.sql`.
3. Em **Project Settings > API**, copie a URL, a `anon key` e a `service_role key`.
   A `service_role` é secreta: nunca coloque em variável `NEXT_PUBLIC_`.
4. Em **Authentication > URL Configuration**, coloque a URL do site em *Site URL*
   e adicione `https://SEU-DOMINIO/auth/callback` em *Redirect URLs*.

### 3.2 Mercado Livre

Qualquer conta do Mercado Livre serve pra criar a aplicação; não precisa ser
conta de vendedor nem ter CNPJ.

1. Entre em https://developers.mercadolivre.com.br e vá em **Minhas aplicações > Criar aplicação**.
2. **URI de redirect:** `https://SEU-DOMINIO/api/ml/callback`. O Mercado Livre exige
   HTTPS, então pra testar no seu computador use um túnel, por exemplo:
   `npx cloudflared tunnel --url http://localhost:3000`, e use a URL que ele gerar.
3. Ative **PKCE** nas configurações da aplicação.
4. Permissões: leitura, acesso offline (pra renovar o token sozinho) e pedidos/vendas.
5. **Notificações:** URL `https://SEU-DOMINIO/api/ml/webhook`, tópicos `orders_v2` e `items`.
6. Copie o *App ID* e a *Secret Key* para `ML_APP_ID` e `ML_APP_SECRET`.

**Usuários de teste:** o Mercado Livre cria contas fictícias de comprador e vendedor
pra você simular vendas sem mexer em dinheiro real. Com um token da sua aplicação:

```bash
curl -X POST -H "Authorization: Bearer SEU_TOKEN" -H "Content-Type: application/json" \
  -d '{"site_id":"MLB"}' https://api.mercadolibre.com/users/test_user
```

**Primeiro teste (faça antes de tudo):** confirme que a API devolve o preço de um
anúncio de outro vendedor. É o coração do produto.

```bash
ML_TOKEN=APP_USR-... node scripts/testar-ml.mjs MLB1234567890
```

O Mercado Livre está migrando os preços para o recurso `/sale_price`. O código
tenta esse primeiro e cai no campo `price` de `/items` se não der
(veja `precoDeVenda` em `src/lib/ml.ts`).

### 3.3 Agendador de preços

1. No Supabase, em **Database > Extensions**, ative `pg_cron` e `pg_net`.
2. Gere um segredo (`openssl rand -hex 32`) e coloque em `CRON_SECRET`.
3. No final de `supabase/schema.sql` tem o bloco `cron.schedule` comentado.
   Troque `SEU-DOMINIO` e `SEU_CRON_SECRET`, descomente e rode no SQL Editor.

A rotina roda de hora em hora e cada concorrente é conferido no intervalo do
plano do dono (6 h no Grátis, 1 h no Pro).

### 3.4 Telegram

1. No Telegram, fale com o **@BotFather**, mande `/newbot` e siga os passos.
2. Coloque o token em `TELEGRAM_BOT_TOKEN` e o nome do bot (sem @) em `NEXT_PUBLIC_TELEGRAM_BOT`.
3. Gere um segredo pra `TELEGRAM_WEBHOOK_SECRET` e registre o webhook:

```bash
curl "https://api.telegram.org/botSEU_TOKEN/setWebhook?url=https://SEU-DOMINIO/api/telegram/webhook&secret_token=SEU_SEGREDO"
```

### 3.5 E-mail (opcional)

Crie uma conta na https://resend.com, verifique seu domínio e preencha
`RESEND_API_KEY` e `EMAIL_REMETENTE`. Sem isso, os avisos saem só no app e no Telegram.

### 3.6 Mercado Pago (assinatura do Pro)

1. Em https://www.mercadopago.com.br/developers, crie uma aplicação.
2. Copie o **Access Token de produção** para `MP_ACCESS_TOKEN`
   (use o de teste enquanto desenvolve).
3. Em **Webhooks**, cadastre `https://SEU-DOMINIO/api/mercadopago/webhook`
   com o evento de planos e assinaturas.

O preço do Pro fica em `src/lib/planos.ts`.

## 4. Publicar

**Pra testar:** a Vercel é o jeito mais simples de publicar Next.js (conecte o
repositório do GitHub e cole as variáveis). O plano gratuito deles é só pra
projetos não comerciais, então quando começar a cobrar passe pro plano pago ou
publique na Cloudflare com o adaptador OpenNext (`@opennextjs/cloudflare`),
que permite uso comercial no plano gratuito.

Depois de publicar, atualize as URLs no Mercado Livre, Supabase, Telegram,
Mercado Pago e no agendador.

## 5. Play Store

O Radar já é um PWA (tem manifesto e ícones), então dá pra empacotar como app
Android sem reescrever nada, usando uma TWA:

```bash
npm i -g @bubblewrap/cli
bubblewrap init --manifest=https://SEU-DOMINIO/manifest.webmanifest
bubblewrap build
```

1. O `bubblewrap init` pede um nome de pacote (ex.: `br.com.seudominio.radar`)
   e cria uma chave de assinatura. **Guarde essa chave**; sem ela você não
   consegue atualizar o app.
2. O Bubblewrap gera o conteúdo do `assetlinks.json` com a impressão digital
   SHA‑256 da sua chave. Copie para `public/.well-known/assetlinks.json` e
   publique o site de novo. É isso que faz o app abrir sem a barra do navegador.
   Se você ativar a assinatura de apps do Google Play, adicione também a
   impressão digital que aparece no Play Console, em Integridade do app.
3. Suba o `.aab` gerado no Google Play Console (taxa única de US$ 25).

**Pagamento no app:** o app Android não tem botão de assinar; a assinatura é
feita pelo site. Confira a política atual de pagamentos do Google Play antes
de publicar.

## 6. Próximos passos sugeridos

- Rodar `scripts/testar-ml.mjs` com anúncios reais de concorrentes.
- Conectar sua própria conta (ou um usuário de teste) e conferir o painel.
- Mostrar pra 5 a 10 vendedores e anotar o que eles pedem.
- Shopee como segunda integração, se for o mais marcado no cadastro.
