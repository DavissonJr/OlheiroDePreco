# Colocar o Olheiro de Preço no ar

Siga na ordem. Leva de 1 a 2 horas na primeira vez. Onde aparecer
`SEU-DOMINIO`, use o seu (ex.: `olheirodepreco.com.br`).

Contas que você vai precisar (todas têm plano gratuito pra começar):
GitHub, Vercel, Supabase, Mercado Livre, Mercado Pago, Telegram e,
de preferência, Resend. O domínio `.com.br` se registra no registro.br.

---

## 1. Código no GitHub

1. Crie um repositório **privado** no GitHub.
2. Envie a pasta do projeto (pelo GitHub Desktop ou pelo terminal):

```bash
git init
git add .
git commit -m "Primeira versão"
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/olheiro-de-preco.git
git push -u origin main
```

O `.gitignore` já impede que o `.env.local` (com suas chaves) vá pro GitHub.

## 2. Supabase (banco de dados e login)

1. Em https://supabase.com, crie um projeto. Escolha a região **São Paulo**
   e guarde a senha do banco num lugar seguro.
2. **SQL Editor:** cole o conteúdo de `supabase/schema.sql` e clique em *Run*.
3. **Project Settings > API:** anote a *Project URL*, a chave `anon` e a
   chave `service_role`. A `service_role` dá acesso total ao banco; nunca
   coloque ela em variável que comece com `NEXT_PUBLIC_`.
4. **Authentication > URL Configuration:**
   - *Site URL:* `https://SEU-DOMINIO`
   - *Redirect URLs:* adicione `https://SEU-DOMINIO/auth/callback` e
     `http://localhost:3000/auth/callback`
5. **Authentication > Email Templates:** em *Confirm signup* e *Reset Password*,
   cole os modelos de `supabase/emails/` (o assunto sugerido está no topo de cada arquivo).
6. **E-mail de verdade (importante):** o envio de e-mail que vem no Supabase
   é só pra testes e tem limite bem baixo por hora. Antes de divulgar, configure
   um SMTP próprio em **Authentication > SMTP Settings**. Com a Resend:
   - Host: `smtp.resend.com`, porta `465`
   - Usuário: `resend`, senha: sua chave de API da Resend
   - Remetente: um endereço do seu domínio verificado na Resend

## 3. Vercel (hospedagem)

1. Em https://vercel.com, clique em **Add New > Project** e importe o repositório.
2. Antes de publicar, abra **Environment Variables** e cole as variáveis do
   `.env.example`, já com os valores do Supabase. As do Mercado Livre,
   Telegram e Mercado Pago você completa nos próximos passos.
   Em `NEXT_PUBLIC_SITE_URL`, coloque `https://SEU-DOMINIO`.
3. Clique em **Deploy**.
4. **Settings > Functions > Function Region:** escolha São Paulo (`gru1`),
   pra ficar perto do banco.
5. **Settings > Domains:** adicione `SEU-DOMINIO` e `www.SEU-DOMINIO`. A Vercel
   mostra os registros de DNS; cadastre exatamente esses no painel do registro.br
   (em *DNS > Editar zona*). A propagação pode levar algumas horas.

Toda vez que mudar uma variável que começa com `NEXT_PUBLIC_`, faça um novo
deploy (**Deployments > ... > Redeploy**), porque elas entram no código na hora do build.

**Sobre o plano:** o plano gratuito da Vercel é só pra uso não comercial.
Pra testar e validar, tudo bem. Antes de cobrar o primeiro cliente, passe pro
plano Pro da Vercel ou publique na Cloudflare com o adaptador OpenNext
(`@opennextjs/cloudflare`), que permite uso comercial no gratuito.

## 4. Conferir a configuração

Abra `https://SEU-DOMINIO/api/saude`. Ele mostra o que já está configurado e
o que falta (nunca mostra os valores). Volte aqui depois de cada passo abaixo.

## 5. Mercado Livre

Qualquer conta do Mercado Livre serve pra criar a aplicação.

1. Em https://developers.mercadolivre.com.br, vá em **Minhas aplicações > Criar aplicação**.
2. **URI de redirect:** `https://SEU-DOMINIO/api/ml/callback`
3. Ative **PKCE**.
4. Permissões: leitura, acesso offline e pedidos/vendas.
5. **Notificações:** URL `https://SEU-DOMINIO/api/ml/webhook`, tópicos `orders_v2` e `items`.
6. Na Vercel, preencha `ML_APP_ID`, `ML_APP_SECRET` e
   `ML_REDIRECT_URI=https://SEU-DOMINIO/api/ml/callback`, e faça redeploy.
7. **Teste a leitura de preços de concorrentes** (é o coração do produto):
   `ML_TOKEN=... npm run testar-ml -- MLB1234567890`

Pra simular vendas sem mexer em dinheiro real, crie usuários de teste:

```bash
curl -X POST -H "Authorization: Bearer SEU_TOKEN" -H "Content-Type: application/json" \
  -d '{"site_id":"MLB"}' https://api.mercadolibre.com/users/test_user
```

## 6. Telegram

1. No Telegram, fale com o **@BotFather**, mande `/newbot` e siga os passos.
   Sugestão de nome: *Olheiro de Preço*; usuário: algo como `OlheiroDePrecoBot`.
2. Na Vercel: `TELEGRAM_BOT_TOKEN` (o token que o BotFather deu),
   `NEXT_PUBLIC_TELEGRAM_BOT` (o usuário do bot, sem @) e
   `TELEGRAM_WEBHOOK_SECRET` (gere com `openssl rand -hex 32`). Redeploy.
3. Registre o webhook (troque os três valores):

```bash
curl "https://api.telegram.org/botSEU_TOKEN/setWebhook?url=https://SEU-DOMINIO/api/telegram/webhook&secret_token=SEU_SEGREDO"
```

Opcional, no BotFather: `/setuserpic` com o `public/icone-512.png` e
`/setdescription` com uma frase como "Aviso de preço dos seus concorrentes no Mercado Livre".

## 7. Mercado Pago (assinatura do Pro)

1. Em https://www.mercadopago.com.br/developers, crie uma aplicação.
2. Comece com as **credenciais de teste**: coloque o Access Token de teste em
   `MP_ACCESS_TOKEN` e faça redeploy.
3. Em **Webhooks**, cadastre `https://SEU-DOMINIO/api/mercadopago/webhook`
   com o evento de **planos e assinaturas**.
4. Teste uma assinatura com as contas de teste do Mercado Pago.
5. Deu certo? Troque pelo **Access Token de produção** e faça redeploy.

## 8. Agendador de preços

1. No Supabase, em **Database > Extensions**, ative `pg_cron` e `pg_net`.
2. Gere um segredo (`openssl rand -hex 32`), coloque em `CRON_SECRET` na Vercel
   e faça redeploy.
3. Abra `supabase/agendador.sql`, troque `SEU-DOMINIO` e `SEU_CRON_SECRET`
   e rode no SQL Editor.
4. Teste na mão:

```bash
curl -H "Authorization: Bearer SEU_CRON_SECRET" https://SEU-DOMINIO/api/cron/precos
```

A resposta deve ser algo como `{"verificados":0,"avisos":0}`.

## 9. Termos e privacidade

Preencha `NEXT_PUBLIC_RESPONSAVEL` (seu nome completo, ou a razão social quando
tiver empresa) e `NEXT_PUBLIC_CONTATO_EMAIL`, e faça redeploy. Os textos em
`/termos` e `/privacidade` são modelos iniciais pensados pra LGPD e pro Código
de Defesa do Consumidor; vale uma revisão de advogado antes de ter clientes pagantes.

## 10. Teste final

Faça tudo isso com uma conta de teste antes de divulgar:

- [ ] `/api/saude` mostra `"tudo_pronto": true`
- [ ] Criar conta: o e-mail de confirmação chega (confira se não caiu no spam)
- [ ] "Esqueci minha senha" manda o link e a senha nova funciona
- [ ] Conectar o Mercado Livre (usuário de teste) e ver o painel com vendas
- [ ] Adicionar um concorrente e ver o preço aparecer
- [ ] Rodar o agendador na mão (passo 8) sem erro
- [ ] Assinar o Pro em modo teste e ver o plano mudar
- [ ] Conectar o Telegram e receber a mensagem de boas-vindas do bot
- [ ] Cancelar a assinatura na tela de plano
- [ ] Excluir a conta de teste em Conta > Excluir conta
- [ ] Abrir `/demo` numa aba anônima
- [ ] Mandar o link do site no WhatsApp e ver a prévia com imagem

## Depois do lançamento

- **Erros:** Vercel > seu projeto > **Logs**.
- **Rotinas:** no SQL Editor do Supabase,
  `select * from cron.job_run_details order by start_time desc limit 20;`
- **Uso e limites:** painel do Supabase > **Usage**. O plano gratuito aguenta
  bem o começo; ele pausa projetos parados, e o plano pago tem backup diário.
  Quando entrarem os primeiros pagantes, vale migrar.
