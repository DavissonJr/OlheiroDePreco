// Teste rápido: dá pra ler o preço de um anúncio de OUTRO vendedor pela API?
// Esse é o coração do Radar, então vale rodar antes de tudo.
//
// Uso:
//   ML_TOKEN=APP_USR-... node scripts/testar-ml.mjs MLB1234567890
//
// Pegue um token de teste no portal de desenvolvedores do Mercado Livre
// ou depois de conectar sua conta no app (tabela ml_contas no Supabase).

const token = process.env.ML_TOKEN;
const item = process.argv[2];
if (!token || !item) {
  console.log("Uso: ML_TOKEN=... node scripts/testar-ml.mjs MLB1234567890");
  process.exit(1);
}

async function testar(nome, url) {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const corpo = await res.text();
  console.log(`\n${res.ok ? "OK " : "ERRO"} ${res.status}  ${nome}`);
  console.log(corpo.slice(0, 400));
}

await testar("Preço de venda (/sale_price)", `https://api.mercadolibre.com/items/${item}/sale_price?context=channel_marketplace`);
await testar("Dados do anúncio (/items)", `https://api.mercadolibre.com/items/${item}?attributes=id,title,price,seller_id`);
