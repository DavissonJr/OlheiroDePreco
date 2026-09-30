// Cliente da API do Mercado Livre (servidor).
// Documentação: https://developers.mercadolivre.com.br
import { supabaseAdmin } from "./supabase/server";
import type { ItemVenda } from "./types";

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

// Aceita links como:
//   https://produto.mercadolivre.com.br/MLB-1234567890-nome-do-produto-_JM
//   https://www.mercadolivre.com.br/nome/p/MLB12345678   (página de catálogo)
//   MLB1234567890
export function extrairId(link: string): { tipo: "item" | "produto"; id: string } | null {
  const texto = link.trim();
  const catalogo = texto.match(/\/p\/(MLB\d+)/i);
  if (catalogo) return { tipo: "produto", id: catalogo[1].toUpperCase() };
  const item = texto.match(/MLB-?(\d{6,})/i);
  if (item) return { tipo: "item", id: `MLB${item[1]}` };
  return null;
}

export interface ItemML {
  id: string;
  titulo: string;
  preco: number;
  thumbnail: string | null;
  permalink: string | null;
  vendedorId: number | null;
  estoque: number | null;
}

interface ItemBruto {
  id: string;
  title: string;
  price: number;
  thumbnail?: string;
  permalink?: string;
  seller_id?: number;
  available_quantity?: number;
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

export async function buscarItem(itemId: string, token: string): Promise<ItemML> {
  const bruto = await mlGet<ItemBruto>(
    `/items/${itemId}?attributes=id,title,price,thumbnail,permalink,seller_id,available_quantity`,
    token,
  );
  const item = mapearItem(bruto);
  const preco = await precoDeVenda(itemId, token);
  if (preco != null) item.preco = preco;
  return item;
}

// Página de catálogo: usamos quem está ganhando a "compra rápida".
export async function buscarVencedorCatalogo(produtoId: string, token: string) {
  const p = await mlGet<{ buy_box_winner?: { item_id: string } }>(`/products/${produtoId}`, token);
  if (!p.buy_box_winner?.item_id) throw new Error("Esse produto de catálogo não tem um vendedor ativo agora.");
  return buscarItem(p.buy_box_winner.item_id, token);
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
  const busca = await mlGet<{ results: string[] }>(`/users/${mlUserId}/items/search?status=active&limit=100`, token);
  const ids = busca.results ?? [];
  const itens: ItemML[] = [];
  for (let i = 0; i < ids.length; i += 20) {
    const lote = ids.slice(i, i + 20).join(",");
    const r = await mlGet<{ code: number; body: ItemBruto }[]>(
      `/items?ids=${lote}&attributes=id,title,price,thumbnail,permalink,available_quantity`,
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
        atualizado_em: new Date().toISOString(),
      })),
    );
  }

  const desde = new Date(Date.now() - 90 * 86400000);
  const pedidos = await pedidosDesde(acesso.mlUserId, acesso.token, desde);
  if (pedidos.length) {
    await sb.from("vendas").upsert(pedidos.map((p) => mapearPedido(p, userId)));
  }
  return { anuncios: itens.length, pedidos: pedidos.length };
}
