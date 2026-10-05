# Olheiro de Preço

Painel de vendas do Mercado Livre + aviso quando um concorrente baixa o preço.
Next.js 16, Supabase, Tailwind 4 e Framer Motion.

**Pra colocar no ar, siga o [DEPLOY.md](./DEPLOY.md).**

## Rodar no seu computador

Precisa do Node.js 20.9 ou mais novo (recomendado: 22).

```bash
npm install
npm run dev
```

Abra http://localhost:3000. Sem nenhuma variável configurada, o app roda em
**modo demonstração**, com dados de exemplo.

Pra ver no celular na mesma rede Wi‑Fi: `npm run dev -- -H 0.0.0.0` e abra
`http://IP-DO-SEU-PC:3000` no navegador do celular.

Pra testar no mesmo motor que roda na Cloudflare (mais lento pra iniciar,
use antes de subir mudanças grandes): `cp .dev.vars.example .dev.vars` uma vez
e depois `npm run preview`. No Windows, rode esse comando dentro do WSL.

## Hospedagem

O site roda na **Cloudflare Workers** com o adaptador OpenNext, e o banco no
**Supabase**. Os arquivos da Cloudflare são `wrangler.jsonc`,
`open-next.config.ts` e `public/_headers`. O passo a passo completo está no
[DEPLOY.md](./DEPLOY.md).

## Demonstração pública

Mesmo com o site em produção, qualquer visitante pode abrir `/demo` e navegar
no painel com dados de exemplo, sem cadastro. O botão "Ver a demonstração"
da página inicial leva pra lá. O que a pessoa faz na demonstração fica só na
aba do navegador dela e nunca toca no banco.

## Estrutura

```
src/
  app/
    page.tsx                  página inicial
    demo/                     entrada da demonstração pública
    entrar/  nova-senha/      login, cadastro e troca de senha
    termos/  privacidade/     Termos de Uso e Política de Privacidade (LGPD)
    (app)/onboarding/         configuração inicial em 3 etapas
    (app)/painel/             visão geral, concorrentes, produtos, avisos, plano, conta
    api/ml/                   conexão com o Mercado Livre, sincronização e webhook
    api/concorrentes/         adicionar concorrente (confere o limite do plano) e sugestões
    api/cron/precos/          conferência de preços, compra rápida e ajuste automático
    api/cron/emails/          avisos agrupados do dia e resumo semanal
    api/telegram/             código de conexão e webhook do bot
    api/assinatura/           assinar, trocar e cancelar planos (Mercado Pago) e teste grátis
    api/mercadopago/webhook/  mudanças de status da assinatura
    api/conta/excluir/        exclusão de conta
    api/saude/                mostra o que falta configurar
  components/                 interface (ui/, app/, charts/, landing/, site/)
  lib/
    ml.ts                     cliente da API do Mercado Livre
    verificador.ts            conferir preços, estoque, compra rápida, ajuste automático e avisos
    resumo.ts                 e-mail diário de avisos e resumo semanal
    margem.ts                 contas de lucro, sugestão de preço e limites do ajuste
    planos.ts                 limites, preços e recursos de cada plano (mude aqui)
    demo-data.ts              dados da demonstração
supabase/
  schema.sql                  tabelas e regras de segurança
  atualizacao-01-recursos.sql planos novos, regras, custos, ajuste automático, indicação
  agendador.sql               rotinas agendadas (rodar depois de publicar)
  emails/                     modelos de e-mail em português
scripts/testar-ml.mjs         teste da API de preços do Mercado Livre
wrangler.jsonc                configuração do Worker na Cloudflare
open-next.config.ts           configuração do adaptador OpenNext
```

## Personalizar

- **Preço e limites dos planos:** `src/lib/planos.ts`.
- **Cores:** variáveis no topo de `src/app/globals.css` (modo claro e escuro).
- **Textos legais:** `src/app/termos/page.tsx` e `src/app/privacidade/page.tsx`.
  São modelos iniciais; revise com um advogado antes de ter clientes pagantes.

## Concorrentes só pelo catálogo

O Mercado Livre não deixa aplicativos lerem anúncios de outros vendedores
(`/items` e `/sites/MLB/search` respondem 403). O que continua liberado é o
catálogo: `/products/{id}/items` lista quem vende cada produto de catálogo, com
o preço de cada um. Por isso cada concorrente guarda o `catalogo_id` e o preço
sai dessa lista (veja `vendedoresCatalogo` e `lerAnuncio` em `src/lib/ml.ts`).
Anúncios fora do catálogo ainda tentam o caminho direto, que volta a funcionar
sozinho se o Mercado Livre liberar o acesso ao app.

## Sobre a API de preços do Mercado Livre

O Mercado Livre está migrando os preços para o recurso `/sale_price`. O código
tenta esse primeiro e cai no campo `price` de `/items` se não der (veja
`precoDeVenda` em `src/lib/ml.ts`). Antes de lançar, confirme que dá pra ler o
preço de anúncios de outros vendedores:

```bash
ML_TOKEN=APP_USR-... npm run testar-ml -- MLB1234567890
```

## Depois: app na Play Store

O site já é um PWA (manifesto, ícones e `assetlinks.json` prontos), então dá
pra empacotar como app Android sem reescrever nada, usando uma TWA:

```bash
npm i -g @bubblewrap/cli
bubblewrap init --manifest=https://SEU-DOMINIO/manifest.webmanifest
bubblewrap build
```

1. O `bubblewrap init` pede um nome de pacote (já deixamos
   `br.com.olheirodepreco.app` no `assetlinks.json`) e cria uma chave de
   assinatura. **Guarde essa chave**; sem ela não dá pra atualizar o app.
2. O Bubblewrap gera o conteúdo do `assetlinks.json` com a impressão digital
   SHA‑256 da sua chave. Copie para `public/.well-known/assetlinks.json` e
   publique o site de novo. Se ativar a assinatura de apps do Google Play,
   adicione também a impressão digital que aparece no Play Console.
3. Suba o `.aab` gerado no Google Play Console (taxa única de US$ 25).

O app Android não tem botão de assinar; a assinatura é feita pelo site.
Confira a política atual de pagamentos do Google Play antes de publicar.
