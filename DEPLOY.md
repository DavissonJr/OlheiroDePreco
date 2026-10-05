# Colocar o Olheiro de Preço no ar (Supabase + Cloudflare)

Siga as etapas na ordem. Na primeira vez leva umas 2 horas, fora o tempo de
espera do DNS. Onde aparecer `SEU-DOMINIO`, use o seu (ex.: `olheirodepreco.com.br`).

## Antes de começar

**Contas** (todas gratuitas pra começar): GitHub, Cloudflare, Supabase, Resend,
Mercado Livre, Mercado Pago e Telegram. O domínio `.com.br` se compra no registro.br.

**Custos:**

| Serviço | Pra testar | Pra ter clientes |
|---|---|---|
| Supabase | Grátis | Grátis no começo; Pro (US$ 25/mês) quando tiver pagantes |
| Cloudflare Workers | Grátis | **Workers Paid, US$ 5/mês** |
| Domínio .com.br | cerca de R$ 40/ano | igual |
| Resend (e-mail) | Grátis | Grátis até um volume razoável |

**Por que o plano de US$ 5 na Cloudflare:** no plano gratuito, cada acesso ao
servidor pode usar só 10 ms de processamento e fazer no máximo 50 chamadas a
outros serviços. Serve pra testar, mas o painel e a conferência de preços
passam disso com clientes de verdade, e aí aparece o erro 1102
("Worker exceeded resource limits"). No pago, o limite sobe pra 30 segundos de
processamento e 10.000 chamadas.

**Computador:** Node.js 22 e Git instalados. Se você usa Windows, não se
preocupe: o build roda nos servidores da Cloudflare, não na sua máquina.

---

## Etapa 1: Domínio na Cloudflare

A Cloudflare só liga o site ao seu domínio se ela cuidar do DNS dele.

1. Crie a conta em https://dash.cloudflare.com e clique em **Add a domain**
   (ou *Adicionar domínio*). Digite `SEU-DOMINIO` e escolha o plano **Free**
   (esse é o plano do domínio; o do Worker é separado).
2. A Cloudflare mostra **dois servidores de nome** (nameservers), algo como
   `ana.ns.cloudflare.com`.
3. No https://registro.br, entre na conta, abra o domínio e vá em
   **DNS > Alterar servidores DNS**. Troque pelos dois da Cloudflare e salve.
4. Espere a Cloudflare avisar que o domínio está **ativo**. Costuma levar de
   alguns minutos a algumas horas. Enquanto isso, siga pra etapa 2.

## Etapa 2: Supabase (banco de dados e login)

### 2.1 Criar o projeto

1. Em https://supabase.com, clique em **New project**.
2. Nome: `olheiro-de-preco`. Região: **South America (São Paulo)**.
3. Crie uma senha forte pro banco e guarde num gerenciador de senhas.

### 2.2 Criar as tabelas

1. Abra **SQL Editor > New query**.
2. Cole todo o conteúdo de `supabase/schema.sql` e clique em **Run**.
3. Abra outra query, cole `supabase/atualizacao-01-recursos.sql` e clique em **Run**.
   Depois faça o mesmo com `supabase/atualizacao-02-catalogo.sql`.
   Se você já tinha rodado o `schema.sql` antes, rode só as atualizações que faltam.
4. Em **Table Editor**, confira se apareceram 8 tabelas: `profiles`,
   `ml_contas`, `produtos`, `vendas`, `concorrentes`, `historico_precos`,
   `alertas` e `ajustes_preco`.

### 2.3 Copiar as chaves

1. Clique no botão **Connect** no topo do projeto e copie a **Project URL**
   (`https://xxxx.supabase.co`).
2. Em **Settings > API Keys**, copie:
   - a **Publishable key** (começa com `sb_publishable_`)
   - a **Secret key** (começa com `sb_secret_`). Se não aparecer, clique em
     *Create new API keys*.

Use as chaves novas. As antigas (`anon` e `service_role`, que começam com
`eyJ`) estão sendo desativadas pelo Supabase até o fim de 2026.

A **Secret key** dá acesso total ao banco. Ela só vai no servidor, nunca em
variável que comece com `NEXT_PUBLIC_`.

### 2.4 Configurar o login

Em **Authentication > URL Configuration**:

- **Site URL:** `https://SEU-DOMINIO`
- **Redirect URLs:** adicione as três:
  - `https://SEU-DOMINIO/auth/callback`
  - `https://olheiro-de-preco.SUA-CONTA.workers.dev/auth/callback`
    (o endereço provisório da Cloudflare; você descobre ele na etapa 5)
  - `http://localhost:3000/auth/callback`

Em **Authentication > Sign In / Providers > Email**, deixe **Confirm email** ligado.

### 2.5 E-mails em português

Em **Authentication > Email Templates**:

- **Confirm signup:** assunto *Confirme seu e-mail no Olheiro de Preço*; corpo:
  conteúdo de `supabase/emails/confirmar-cadastro.html`.
- **Reset Password:** assunto *Crie uma senha nova no Olheiro de Preço*; corpo:
  conteúdo de `supabase/emails/redefinir-senha.html`.

## Etapa 3: E-mail de verdade (Resend)

O envio de e-mail que vem no Supabase é só pra testes e tem um limite bem baixo
por hora. Com a Resend, os e-mails de cadastro e os avisos de preço saem do seu domínio.

1. Crie a conta em https://resend.com e vá em **Domains > Add domain**.
   Digite `SEU-DOMINIO`.
2. A Resend mostra alguns registros de DNS. Cadastre todos em
   **Cloudflare > seu domínio > DNS > Records**, exatamente como aparecem
   (se a Resend oferecer configurar automaticamente na Cloudflare, pode usar).
   Nos registros criados, deixe a nuvem **cinza** (*DNS only*).
3. Espere a Resend mostrar o domínio como **Verified**.
4. Em **API Keys**, crie uma chave e guarde.
5. No Supabase, em **Authentication > Emails > SMTP Settings**, ligue o SMTP próprio:
   - Sender email: `avisos@SEU-DOMINIO`, sender name: `Olheiro de Preço`
   - Host: `smtp.resend.com`, porta: `465`
   - Username: `resend`, password: a chave da Resend

## Etapa 4: Código no GitHub

1. Crie um repositório **privado** chamado `olheiro-de-preco`.
2. Na pasta do projeto:

```bash
git init
git add .
git commit -m "Primeira versão"
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/olheiro-de-preco.git
git push -u origin main
```

O `.gitignore` já impede que `.env.local` e `.dev.vars` (com suas chaves) subam.

## Etapa 5: Site na Cloudflare

### 5.1 Criar o Worker ligado ao GitHub

1. No painel da Cloudflare, vá em **Workers & Pages > Create** e escolha
   **Import a repository**. Conecte sua conta do GitHub e escolha `olheiro-de-preco`.
2. **Project name:** `olheiro-de-preco`. Precisa ser igual ao `name` do
   `wrangler.jsonc`, senão o deploy falha.
3. **Build command:** `npx opennextjs-cloudflare build`
4. **Deploy command:** `npx opennextjs-cloudflare deploy -- --keep-vars`

   O `--keep-vars` é importante: sem ele, cada deploy apaga as variáveis que
   você cadastrou no painel.

5. Abra **Build variables and secrets** (ou *Advanced settings*) e cadastre as
   variáveis que o Next.js precisa **na hora do build**:

| Variável | Valor |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | `https://SEU-DOMINIO` |
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL do Supabase |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | chave `sb_publishable_...` |
| `NEXT_PUBLIC_TELEGRAM_BOT` | usuário do bot, sem @ (etapa 8; pode preencher depois) |
| `NEXT_PUBLIC_RESPONSAVEL` | seu nome completo (ou razão social) |
| `NEXT_PUBLIC_CONTATO_EMAIL` | seu e-mail de contato |
| `NODE_VERSION` | `22` |

6. Clique em **Deploy** e acompanhe o log. O primeiro build leva alguns minutos.
   No fim, a Cloudflare mostra o endereço provisório
   `olheiro-de-preco.SUA-CONTA.workers.dev`. Volte na etapa 2.4 e confira se
   esse endereço está nas Redirect URLs do Supabase.

### 5.2 Variáveis do servidor

Em **Workers & Pages > olheiro-de-preco > Settings > Variables and Secrets**,
cadastre as variáveis que o servidor usa **enquanto o site roda**. Use o tipo
**Secret** pras sensíveis (depois de salvas, ninguém consegue ler de volta):

| Variável | Tipo | De onde vem |
|---|---|---|
| `SUPABASE_SECRET_KEY` | Secret | chave `sb_secret_...` (etapa 2.3) |
| `CRON_SECRET` | Secret | gere com `openssl rand -hex 32` |
| `RESEND_API_KEY` | Secret | Resend (etapa 3) |
| `EMAIL_REMETENTE` | Text | `Olheiro de Preço <avisos@SEU-DOMINIO>` |
| `ML_APP_ID` | Text | etapa 7 |
| `ML_APP_SECRET` | Secret | etapa 7 |
| `ML_REDIRECT_URI` | Text | `https://SEU-DOMINIO/api/ml/callback` |
| `TELEGRAM_BOT_TOKEN` | Secret | etapa 8 |
| `TELEGRAM_WEBHOOK_SECRET` | Secret | gere com `openssl rand -hex 32` |
| `MP_ACCESS_TOKEN` | Secret | etapa 9 |
| `CONFERENCIA_LOTE` | Text | `8` no plano gratuito; apague no plano pago |
| `RESUMO_LOTE` | Text | `8` no plano gratuito; apague no plano pago |

Cadastre também as mesmas `NEXT_PUBLIC_...` da tabela anterior, como Text.
Não custa nada e evita surpresa no servidor.

Sem computador com `openssl`? Qualquer gerador de senha aleatória com 40 ou
mais letras e números serve.

Você pode ir preenchendo aos poucos, conforme avança nas etapas 7 a 9.
Variáveis de servidor valem na hora; as `NEXT_PUBLIC_` só depois de um novo
deploy (**Deployments > Retry deployment**, ou um `git push`).

### 5.3 Ligar o seu domínio

1. Em **olheiro-de-preco > Settings > Domains & Routes**, clique em **Add >
   Custom domain** e digite `SEU-DOMINIO`. A Cloudflare cria o DNS e o
   certificado HTTPS sozinha.
2. Pra quem digitar com www: em **seu domínio > Rules > Redirect Rules**, use o
   modelo de redirecionar de `www` pro domínio sem www. Se o modelo pedir, crie
   em DNS um registro para `www` com a nuvem laranja.

### 5.4 Passar pro plano pago (antes de abrir pra clientes)

Em **Workers & Pages > Plans**, assine o **Workers Paid** (US$ 5/mês). Depois,
apague as variáveis `CONFERENCIA_LOTE` e `RESUMO_LOTE`.

## Etapa 6: Conferir

Abra `https://SEU-DOMINIO/api/saude`. Ele mostra o que já está configurado e o
que falta, sem mostrar os valores. Volte aqui depois de cada etapa abaixo.

## Etapa 7: Mercado Livre

Qualquer conta do Mercado Livre serve pra criar a aplicação.

1. Em https://developers.mercadolivre.com.br, vá em **Minhas aplicações > Criar aplicação**.
2. **URI de redirect:** `https://SEU-DOMINIO/api/ml/callback`
3. Ative **PKCE**.
4. Permissões: leitura, **escrita**, acesso offline e pedidos/vendas.
   A escrita é usada só pelo ajuste automático de preço (plano Turbo), e só nos
   anúncios em que o vendedor ligar o recurso. Sem ela, o ajuste é desligado
   sozinho no primeiro erro e o vendedor recebe um aviso.
5. **Notificações:** URL `https://SEU-DOMINIO/api/ml/webhook`, tópicos `orders_v2` e `items`.
6. Copie o *App ID* e a *Secret Key* pras variáveis `ML_APP_ID` e `ML_APP_SECRET` (etapa 5.2).
7. **Teste a leitura de preços de concorrentes** (é o coração do produto):

```bash
ML_TOKEN=APP_USR-... npm run testar-ml -- MLB1234567890
```

Pra simular vendas sem dinheiro real, crie usuários de teste:

```bash
curl -X POST -H "Authorization: Bearer SEU_TOKEN" -H "Content-Type: application/json" \
  -d '{"site_id":"MLB"}' https://api.mercadolibre.com/users/test_user
```

## Etapa 8: Telegram

1. No Telegram, fale com o **@BotFather**, mande `/newbot` e siga os passos.
   Sugestão: nome *Olheiro de Preço*, usuário `OlheiroDePrecoBot` (ou parecido, se estiver ocupado).
2. Preencha `TELEGRAM_BOT_TOKEN` e `TELEGRAM_WEBHOOK_SECRET` (etapa 5.2) e
   `NEXT_PUBLIC_TELEGRAM_BOT` nas duas tabelas da etapa 5. Faça um novo deploy.
3. Registre o webhook (troque os três valores):

```bash
curl "https://api.telegram.org/botSEU_TOKEN/setWebhook?url=https://SEU-DOMINIO/api/telegram/webhook&secret_token=SEU_SEGREDO"
```

A resposta deve ter `"ok":true`. Opcional, no BotFather: `/setuserpic` com
`public/icone-512.png` e `/setdescription` com uma frase curta sobre o serviço.

## Etapa 9: Mercado Pago (assinatura do Pro)

1. Em https://www.mercadopago.com.br/developers, crie uma aplicação.
2. Comece com o **Access Token de teste** em `MP_ACCESS_TOKEN`.
3. Em **Webhooks**, cadastre `https://SEU-DOMINIO/api/mercadopago/webhook`
   com o evento de **planos e assinaturas**.
4. Faça uma assinatura com as contas de teste do Mercado Pago. Com o token do
   vendedor de teste, cadastre também `MP_EMAIL_PAGADOR_TESTE` com o e-mail do
   comprador de teste (o Mercado Pago não aceita pagador real com vendedor de teste).
5. Funcionou? Troque pelo **Access Token de produção** e apague `MP_EMAIL_PAGADOR_TESTE`.

## Etapa 10: Agendador de preços

1. No Supabase, em **Database > Extensions**, ative `pg_cron` e `pg_net`.
2. Abra `supabase/agendador.sql`, troque `SEU-DOMINIO` e `SEU_CRON_SECRET`
   (o mesmo valor da variável `CRON_SECRET`) e rode no SQL Editor.
3. Teste na mão:

```bash
curl -H "Authorization: Bearer SEU_CRON_SECRET" https://SEU-DOMINIO/api/cron/precos
```

A resposta deve ser algo como `{"verificados":0,"avisos":0,"ajustes":0,"catalogo":0}`.

E a rotina diária de e-mails (avisos agrupados e resumo semanal):

```bash
curl -H "Authorization: Bearer SEU_CRON_SECRET" https://SEU-DOMINIO/api/cron/emails
```

Resposta esperada: `{"avisos":0,"resumos":0}`.

## Etapa 11: Teste final

Faça tudo com uma conta de teste antes de divulgar:

- [ ] `/api/saude` mostra `"tudo_pronto": true`
- [ ] Criar conta: o e-mail chega, vem do seu domínio e não cai no spam
- [ ] "Esqueci minha senha" manda o link e a senha nova funciona
- [ ] Conectar o Mercado Livre (usuário de teste) e ver o painel com vendas
- [ ] Adicionar um concorrente e ver o preço aparecer
- [ ] Rodar o agendador na mão (etapa 10) sem erro
- [ ] Começar o teste grátis de 7 dias do Pro e ver o plano mudar
- [ ] Assinar o Básico em modo teste, trocar pro Pro e ver o plano mudar
- [ ] Criar outra conta pelo link de indicação, assinar com ela e ver o bônus na primeira
- [ ] Em Produtos, preencher o custo de um anúncio e ver a sugestão de preço
- [ ] Em Concorrentes, buscar concorrentes parecidos e acompanhar um
- [ ] (Turbo, com usuário de teste) Ligar o ajuste automático e rodar o agendador
- [ ] Exportar vendas e histórico em Conta e abrir no Excel
- [ ] Conectar o Telegram e receber a mensagem de boas-vindas do bot
- [ ] Cancelar a assinatura na tela de plano
- [ ] Excluir a conta de teste em Conta > Excluir conta
- [ ] Abrir `/demo` numa aba anônima
- [ ] Mandar o link do site no WhatsApp e ver a prévia com imagem

---

## Depois de publicado

**Atualizar o site:** faça `git push` na branch `main`. A Cloudflare faz o
build e publica sozinha. Se algo der errado, em **Deployments** dá pra voltar
pra versão anterior com um clique.

**Testar no motor da Cloudflare antes de subir:** `npm run preview` roda o
site localmente exatamente como na Cloudflare (no Windows, use o WSL).

**Onde ver erros:**
- Site: **Workers & Pages > olheiro-de-preco > Logs**
- Agendador: no SQL Editor do Supabase,
  `select * from cron.job_run_details order by start_time desc limit 20;`

**Problemas comuns:**

| Sintoma | Causa provável |
|---|---|
| Erro 1102 "Worker exceeded resource limits" | Plano gratuito da Cloudflare. Assine o Workers Paid. |
| Variáveis somem depois de um deploy | Faltou `-- --keep-vars` no Deploy command. |
| Login volta pra tela de entrar | Endereço faltando nas Redirect URLs do Supabase, ou `NEXT_PUBLIC_` alterada sem novo deploy. |
| Site abre em modo demonstração | `NEXT_PUBLIC_SUPABASE_URL` ou `..._PUBLISHABLE_KEY` faltando nas **Build variables**. |
| Build falha falando da versão do Node | Confira `NODE_VERSION=22` nas Build variables. |
| E-mail de cadastro não chega | SMTP da Resend não configurado ou domínio ainda não verificado. |

**Supabase:** o plano gratuito pausa projetos parados. O agendador consulta o
banco a cada 15 minutos, o que normalmente mantém o projeto ativo, mas o plano
gratuito não tem backup diário. Quando entrarem os primeiros pagantes, vale
migrar pro Pro.
