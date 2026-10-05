// Cliente da API do Mercado Livre (servidor).
// Documentação: https://developers.mercadolivre.com.br
import { supabaseAdmin } from "./supabase/server";
import type { ItemVenda, OrigemSugestao, Sugestao } from "./types";

const API = "https://api.mercadolibre.com";
export const ML_AUTH_URL = "https://auth.mercadolivre.com.br/authorization";

const APP_ID = process.env.ML_APP_ID!;
const APP_SECRET = process.env.ML_APP_SECRET!;
export const ML_REDIRECT_URI = process.env.ML_REDIRECT_URI!;

interface RespostaToken {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user_id: number;
}

async function pedirToken(corpo: Record<string, string>): Promise<RespostaToken> {
  const res = await fetch(`${API}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: new URLSearchParams({ client_id: APP_ID, client_secret: APP_SECRET, ...corpo }),
  });
  if (!res.ok) throw new Error(`Mercado Livre recusou o token (${res.status}): ${await res.text()}`);
  return res.json();
}

export function trocarCodigo(code: string, codeVerifier?: string) {
  return pedirToken({
    grant_type: "authorization_code",
    code,
    redirect_uri: ML_REDIRECT_URI,
    ...(codeVerifier ? { code_verifier: codeVerifier } : {}),
  });
}

export async function salvarConta(userId: string, t: RespostaToken) {
  const sb = supabaseAdmin();
  const eu = await mlGet<{ id: number; nickname: string }>("/users/me", t.access_token);
  await sb.from("ml_contas").upsert({
    user_id: userId,
    ml_user_id: eu.id,
    nickname: eu.nickname,
    access_token: t.access_token,
    refresh_token: t.refresh_token,
    expira_em: new Date(Date.now() + t.expires_in * 1000).toISOString(),
  });
  await sb.from("profiles").update({ ml_nickname: eu.nickname }).eq("id", userId);
  return eu;
}

// Devolve um token válido, renovando se estiver perto de expirar.
// O refresh_token do ML é de uso único, então sempre salvamos o novo.
export async function tokenValido(userId: string) {
  const sb = supabaseAdmin();
  const { data: conta } = await sb.from("ml_contas").select("*").eq("user_id", userId).single();
  if (!conta) return null;
  if (new Date(conta.expira_em).getTime() - Date.now() > 5 * 60000) {
    return { token: conta.access_token as string, mlUserId: conta.ml_user_id as number };
  }
  const novo = await pedirToken({ grant_type: "refresh_token", refresh_token: conta.refresh_token });
  await sb.from("ml_contas").update({
    access_token: novo.access_token,
    refresh_token: novo.refresh_token,
    expira_em: new Date(Date.now() + novo.expires_in * 1000).toISOString(),
  }).eq("user_id", userId);
  return { token: novo.access_token, mlUserId: conta.ml_user_id as number };
}

export async function mlGet<T>(caminho: string, token?: string): Promise<T> {
  const res = await fetch(`${API}${caminho}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`GET ${caminho} falhou (${res.status})`);
  return res.json();
}

async function mlPut<T>(caminho: string, corpo: unknown, token: string): Promise<T> {
  const res = await fetch(`${API}${caminho}`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(corpo),
  });
  if (!res.ok) throw new Error(`PUT ${caminho} falhou (${res.status}): ${await res.text()}`);
  return res.json();
}

// Aceita links como:
//   https://produto.mercadolivre.com.br/MLB-1234567890-nome-do-produto-_JM
//   https://www.mercadolivre.com.br/nome/p/MLB12345678                    (página de catálogo)
//   https://www.mercadolivre.com.br/nome/p/MLB12345678?pdp_filters=item_id:MLB1234567890
//   MLB1234567890
// Devolve o produto de catálogo e/ou o anúncio que o link aponta.
export function extrairId(link: string): { catalogoId: string | null; itemId: string | null } | null {
  let texto = link.trim();
  try {
    texto = decodeURIComponent(texto);
  } catch {}
  const catalogo = texto.match(/\/p\/(MLB\d+)/i)?.[1]?.toUpperCase() ?? null;
  // Na página de catálogo, o vendedor escolhido vem em item_id:MLB... ou wid=MLB...
  const doVendedor = texto.match(/(?:item_id[:=]|wid=)MLB-?(\d{6,})/i)?.[1];
  const solto = catalogo ? null : texto.match(/MLB-?(\d{6,})/i)?.[1];
  const item = doVendedor ?? solto;
  if (!catalogo && !item) return null;
  return { catalogoId: catalogo, itemId: item ? `MLB${item}` : null };
}

export interface ItemML {
  id: string;
  titulo: string;
  preco: number;
  thumbnail: string | null;
  permalink: string | null;
  vendedorId: number | null;
  estoque: number | null;
  catalogoId: string | null;
  status: string | null;
}

// Anúncios que continuam no painel. Encerrados e excluídos saem; pausados ficam,
// pra não perder custos e ajuste automático se o vendedor reativar.
export const STATUS_MANTIDOS = ["active", "paused"];

interface ItemBruto {
  id: string;
  title: string;
  price: number;
  thumbnail?: string;
  permalink?: string;
  seller_id?: number;
  available_quantity?: number;
  catalog_product_id?: string | null;
  status?: string;
}

function mapearItem(b: ItemBruto): ItemML {
  return {
    id: b.id,
    titulo: b.title,
    preco: b.price,
    thumbnail: b.thumbnail?.replace("http://", "https://") ?? null,
    permalink: b.permalink ?? null,
    vendedorId: b.seller_id ?? null,
    estoque: b.available_quantity ?? null,
    catalogoId: b.catalog_product_id ?? null,
    status: b.status ?? null,
  };
}

// O ML está migrando os preços para um recurso próprio (/sale_price).
// Tentamos ele primeiro e caímos no campo price de /items se não der.
export async function precoDeVenda(itemId: string, token: string): Promise<number | null> {
  try {
    const r = await mlGet<{ amount?: number }>(`/items/${itemId}/sale_price?context=channel_marketplace`, token);
    if (typeof r.amount === "number") return r.amount;
  } catch {}
  try {
    const r = await mlGet<ItemBruto>(`/items/${itemId}?attributes=price`, token);
    return r.price ?? null;
  } catch {
    return null;
  }
}

// O Mercado Livre não deixa aplicativos lerem anúncios de outros vendedores
// (/items responde 403). O que continua liberado é o catálogo: a lista de quem
// vende cada produto de catálogo, com o preço de cada um. Quem fica sem estoque
// ou pausa o anúncio sai da lista. A ordem é a do ranking da compra rápida.
export interface VendedorCatalogo {
  item_id: string;
  price: number;
  seller_id: number;
}

export async function vendedoresCatalogo(catalogoId: string, token: string): Promise<VendedorCatalogo[]> {
  const todos: VendedorCatalogo[] = [];
  for (let offset = 0; offset < 500; offset += 100) {
    let r: { results?: VendedorCatalogo[]; paging?: { total: number } };
    try {
      r = await mlGet(`/products/${catalogoId}/items?limit=100&offset=${offset}`, token);
    } catch (e) {
      // 404 "No winners found": ninguém vendendo agora (ou acabou a lista)
      if (/\(404\)/.test((e as Error).message)) break;
      throw e;
    }
    todos.push(...(r.results ?? []));
    if (!r.paging || offset + 100 >= r.paging.total) break;
  }
  return todos;
}

export async function produtoCatalogo(catalogoId: string, token: string) {
  const p = await mlGet<{ name: string; pictures?: { url: string }[] }>(`/products/${catalogoId}`, token);
  return { titulo: p.name, thumbnail: p.pictures?.[0]?.url?.replace("http://", "https://") ?? null };
}

export const linkCatalogo = (catalogoId: string, itemId?: string) =>
  `https://www.mercadolivre.com.br/p/${catalogoId}${itemId ? `?pdp_filters=item_id:${itemId}` : ""}`;

// Lista de vendedores por catálogo, guardada durante uma rodada da conferência
// (vários concorrentes no mesmo catálogo custam uma chamada só).
export type CacheCatalogo = Map<string, Promise<VendedorCatalogo[]>>;

// Preço e estoque de um anúncio de concorrente, numa rodada da conferência.
// Pelo catálogo: fora da lista = sem estoque (ou pausado). Sem catálogo, tenta o
// caminho direto, que só funciona se o Mercado Livre liberar o acesso ao app.
export async function lerAnuncio(itemId: string, catalogoId: string | null, token: string, cache: CacheCatalogo = new Map()) {
  if (catalogoId) {
    if (!cache.has(catalogoId)) cache.set(catalogoId, vendedoresCatalogo(catalogoId, token));
    try {
      const v = (await cache.get(catalogoId)!).find((x) => x.item_id === itemId);
      return v ? { preco: v.price, estoque: null, semEstoque: false } : { preco: null, estoque: null, semEstoque: true };
    } catch {
      cache.delete(catalogoId);
      return { preco: null, estoque: null, semEstoque: false };
    }
  }
  const preco = await precoDeVenda(itemId, token);
  try {
    const r = await mlGet<ItemBruto>(`/items/${itemId}?attributes=available_quantity,status`, token);
    const estoque = r.available_quantity ?? null;
    return { preco, estoque, semEstoque: r.status !== "active" || estoque === 0 };
  } catch {
    return { preco, estoque: null, semEstoque: false };
  }
}

// Quem está ganhando a compra rápida de um produto de catálogo agora.
// O campo buy_box_winner costuma vir vazio; aí vale o primeiro da lista de vendedores.
export async function vencedorCatalogo(catalogoId: string, token: string) {
  const p = await mlGet<{ buy_box_winner?: VendedorCatalogo | null }>(`/products/${catalogoId}`, token);
  if (p.buy_box_winner?.item_id) return p.buy_box_winner;
  return (await vendedoresCatalogo(catalogoId, token))[0] ?? null;
}

export class ErroAnuncio extends Error {}

// Descobre o anúncio de concorrente a partir do link colado (ou de uma sugestão).
// Com catálogo, lê tudo pela lista de vendedores; sem vendedor no link, pega o mais barato.
export async function resolverConcorrente(alvo: { catalogoId: string | null; itemId: string | null }, mlUserId: number, token: string) {
  let catalogoId = alvo.catalogoId;

  if (!catalogoId && alvo.itemId) {
    // Anúncio solto: só funciona se o Mercado Livre deixar ler anúncio de outro vendedor.
    let item: ItemML;
    try {
      item = await buscarItem(alvo.itemId, token);
    } catch {
      throw new ErroAnuncio(
        "O Mercado Livre não deixa ler esse anúncio direto. Abra a página do produto no catálogo (o link tem /p/MLB...) e cole esse link.",
      );
    }
    if (!item.catalogoId) {
      return {
        item_id: item.id, catalogo_id: null as string | null, titulo: item.titulo, preco: item.preco,
        thumbnail: item.thumbnail, permalink: item.permalink, vendedorId: item.vendedorId, estoque: item.estoque,
      };
    }
    catalogoId = item.catalogoId;
  }

  const vendedores = await vendedoresCatalogo(catalogoId!, token);
  const escolhido = alvo.itemId
    ? vendedores.find((v) => v.item_id === alvo.itemId)
    : [...vendedores].filter((v) => v.seller_id !== mlUserId).sort((a, b) => a.price - b.price)[0];
  if (!escolhido) {
    throw new ErroAnuncio(
      alvo.itemId
        ? "Esse vendedor não está vendendo esse produto agora (pode estar sem estoque)."
        : "Ninguém além de você está vendendo esse produto agora.",
    );
  }
  const produto = await produtoCatalogo(catalogoId!, token);
  return {
    item_id: escolhido.item_id, catalogo_id: catalogoId as string | null, titulo: produto.titulo, preco: escolhido.price,
    thumbnail: produto.thumbnail, permalink: linkCatalogo(catalogoId!, escolhido.item_id) as string | null,
    vendedorId: escolhido.seller_id as number | null, estoque: null as number | null,
  };
}

// Muda o preço de um anúncio do próprio vendedor (ajuste automático).
// Precisa da permissão de escrita na aplicação do Mercado Livre.
export async function alterarPreco(itemId: string, preco: number, token: string) {
  return mlPut<{ id: string; price: number }>(`/items/${itemId}`, { price: preco }, token);
}

// Sugere concorrentes pra um anúncio do vendedor, sempre pelo catálogo
// (a busca aberta e a leitura de anúncios de terceiros são bloqueadas), em três passos:
//   1. quem vende o mesmo produto de catálogo do anúncio;
//   2. produtos de catálogo com nome parecido, e o vendedor mais barato de cada um;
//   3. os mais vendidos da categoria do produto (descoberta pelo título).
const MAX_SUGESTOES = 12;

export async function buscarParecidos(
  produto: { id: string; titulo: string; catalogo_id: string | null },
  mlUserId: number,
  token: string,
): Promise<Sugestao[]> {
  const escolhidos = new Map<string, Omit<Sugestao, "vendedor"> & { vendedorId: number }>();
  const vistos = new Set<string>();

  async function deCatalogo(
    catalogoId: string,
    origem: OrigemSugestao,
    maximo: number,
    info?: { titulo: string; thumbnail: string | null },
  ) {
    if (vistos.has(catalogoId) || escolhidos.size >= MAX_SUGESTOES) return;
    vistos.add(catalogoId);
    try {
      const outros = (await vendedoresCatalogo(catalogoId, token))
        .filter((x) => x.seller_id !== mlUserId && x.item_id !== produto.id && !escolhidos.has(x.item_id))
        .sort((a, b) => a.price - b.price)
        .slice(0, maximo);
      if (!outros.length) return;
      const dados = info ?? (await produtoCatalogo(catalogoId, token));
      for (const x of outros) {
        escolhidos.set(x.item_id, {
          item_id: x.item_id,
          catalogo_id: catalogoId,
          titulo: dados.titulo,
          preco: x.price,
          thumbnail: dados.thumbnail,
          permalink: linkCatalogo(catalogoId, x.item_id),
          origem,
          vendedorId: x.seller_id,
        });
      }
    } catch {}
  }

  if (produto.catalogo_id) await deCatalogo(produto.catalogo_id, "mesmo_produto", MAX_SUGESTOES);

  // Os primeiros termos do título costumam ser o que identifica o produto.
  const termos = produto.titulo.split(/\s+/).slice(0, 6).join(" ");
  // Tipo de produto (ex.: MLB-HEADPHONES) e categoria que o ML reconhece no título.
  // Serve pra não sugerir coisa de outro tipo (um livro com "casaco" no nome, por exemplo).
  const tipo = await mlGet<{ domain_id: string; category_id: string }[]>(
    `/sites/MLB/domain_discovery/search?q=${encodeURIComponent(termos)}&limit=1`,
    token,
  ).then((d) => d[0] ?? null).catch(() => null);

  if (escolhidos.size < 6) {
    try {
      const r = await mlGet<{ results: { id: string; name: string; domain_id?: string; pictures?: { url: string }[] }[] }>(
        `/products/search?status=active&site_id=MLB&q=${encodeURIComponent(termos)}&limit=10`,
        token,
      );
      const mesmoTipo = (r.results ?? []).filter((p) => !tipo || p.domain_id === tipo.domain_id);
      for (const p of mesmoTipo.slice(0, 6)) {
        await deCatalogo(p.id, "parecido", 1, {
          titulo: p.name,
          thumbnail: p.pictures?.[0]?.url?.replace("http://", "https://") ?? null,
        });
      }
    } catch {}
  }

  // A categoria do anúncio pode ser genérica; a reconhecida pelo título acerta mais.
  if (escolhidos.size < 4 && tipo) {
    try {
      const h = await mlGet<{ content?: { id: string; type: string }[] }>(`/highlights/MLB/category/${tipo.category_id}`, token);
      const produtos = (h.content ?? []).filter((x) => x.type === "PRODUCT").slice(0, 6);
      for (const p of produtos) await deCatalogo(p.id, "mais_vendido", 1);
    } catch {}
  }

  const lista = [...escolhidos.values()].slice(0, MAX_SUGESTOES);
  const apelidos = await Promise.all(lista.map((x) => apelidoVendedor(x.vendedorId, token)));
  const ordem: OrigemSugestao[] = ["mesmo_produto", "parecido", "mais_vendido"];
  return lista
    .map((x, i) => ({
      item_id: x.item_id, catalogo_id: x.catalogo_id, titulo: x.titulo, preco: x.preco,
      thumbnail: x.thumbnail, permalink: x.permalink, origem: x.origem, vendedor: apelidos[i],
    }))
    .sort((a, b) => ordem.indexOf(a.origem) - ordem.indexOf(b.origem) || a.preco - b.preco);
}

export async function buscarItem(itemId: string, token: string): Promise<ItemML> {
  const bruto = await mlGet<ItemBruto>(
    `/items/${itemId}?attributes=id,title,price,thumbnail,permalink,seller_id,available_quantity,catalog_product_id,status`,
    token,
  );
  const item = mapearItem(bruto);
  const preco = await precoDeVenda(itemId, token);
  if (preco != null) item.preco = preco;
  return item;
}

export async function apelidoVendedor(sellerId: number | null, token: string) {
  if (!sellerId) return null;
  try {
    const u = await mlGet<{ nickname: string }>(`/users/${sellerId}`, token);
    return u.nickname;
  } catch {
    return null;
  }
}

export async function meusItens(mlUserId: number, token: string): Promise<ItemML[]> {
  const ids: string[] = [];
  for (const status of STATUS_MANTIDOS) {
    const busca = await mlGet<{ results: string[] }>(`/users/${mlUserId}/items/search?status=${status}&limit=100`, token);
    ids.push(...(busca.results ?? []));
  }
  const itens: ItemML[] = [];
  for (let i = 0; i < ids.length; i += 20) {
    const lote = ids.slice(i, i + 20).join(",");
    const r = await mlGet<{ code: number; body: ItemBruto }[]>(
      `/items?ids=${lote}&attributes=id,title,price,thumbnail,permalink,available_quantity,catalog_product_id,status`,
      token,
    );
    for (const x of r) if (x.code === 200) itens.push(mapearItem(x.body));
  }
  return itens;
}

interface PedidoBruto {
  id: number;
  date_created: string;
  total_amount: number;
  status: string;
  order_items: { item: { id: string; title: string }; quantity: number; unit_price: number; sale_fee?: number }[];
}

export function mapearPedido(p: PedidoBruto, userId: string) {
  const itens: ItemVenda[] = p.order_items.map((i) => ({
    item_id: i.item.id,
    titulo: i.item.title,
    quantidade: i.quantity,
    preco: i.unit_price,
  }));
  const taxa = p.order_items.reduce((s, i) => s + (i.sale_fee ?? 0) * i.quantity, 0);
  return {
    id: String(p.id),
    user_id: userId,
    data: p.date_created,
    total: p.total_amount,
    taxa: +taxa.toFixed(2),
    status: p.status,
    itens,
  };
}

export async function buscarPedido(pedidoId: string, token: string) {
  return mlGet<PedidoBruto>(`/orders/${pedidoId}`, token);
}

export async function pedidosDesde(mlUserId: number, token: string, desde: Date, maximo = 1000) {
  const pedidos: PedidoBruto[] = [];
  let offset = 0;
  while (offset < maximo) {
    const r = await mlGet<{ results: PedidoBruto[]; paging: { total: number } }>(
      `/orders/search?seller=${mlUserId}&order.date_created.from=${encodeURIComponent(desde.toISOString())}&sort=date_desc&limit=50&offset=${offset}`,
      token,
    );
    pedidos.push(...r.results);
    offset += 50;
    if (offset >= r.paging.total) break;
  }
  return pedidos;
}

// Puxa anúncios ativos e os pedidos dos últimos 90 dias.
export async function sincronizarConta(userId: string) {
  const acesso = await tokenValido(userId);
  if (!acesso) throw new Error("Conta do Mercado Livre não conectada.");
  const sb = supabaseAdmin();

  const itens = await meusItens(acesso.mlUserId, acesso.token);
  if (itens.length) {
    await sb.from("produtos").upsert(
      itens.map((i) => ({
        id: i.id,
        user_id: userId,
        titulo: i.titulo,
        preco: i.preco,
        thumbnail: i.thumbnail,
        permalink: i.permalink,
        estoque: i.estoque,
        catalogo_id: i.catalogoId,
        atualizado_em: new Date().toISOString(),
      })),
    );
  }
  // Tira do painel o que foi encerrado ou excluído no Mercado Livre.
  // Concorrentes ligados a ele ficam, só sem o produto seu ligado.
  const remover = sb.from("produtos").delete().eq("user_id", userId);
  await (itens.length ? remover.not("id", "in", `(${itens.map((i) => i.id).join(",")})`) : remover);

  const desde = new Date(Date.now() - 90 * 86400000);
  const pedidos = await pedidosDesde(acesso.mlUserId, acesso.token, desde);
  if (pedidos.length) {
    await sb.from("vendas").upsert(pedidos.map((p) => mapearPedido(p, userId)));
  }
  return { anuncios: itens.length, pedidos: pedidos.length };
}
